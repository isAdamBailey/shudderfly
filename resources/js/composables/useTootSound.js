import { ref } from "vue";
import { getAudioContext, unlockAudio } from "@/composables/useAudioContext";

const VOLUME = 0.9;

// The clips, by URL, for the whole page: one element each, played itself
// rather than a clone, made and primed once however many useTootSounds
// share it. iOS lets an element play without a gesture only once it has
// played in one, which priming does; once primed it stays playable in every
// scene.
const clipPool = new Map();

function clipFor(url) {
    let entry = clipPool.get(url);
    if (!entry) {
        const el = new Audio(url);
        el.preload = "auto";
        el.volume = VOLUME;
        entry = { el, primed: false, priming: false };
        clipPool.set(url, entry);
    }
    return entry;
}

// Plays a clip muted and stops it, unless a toot has unmuted it meanwhile.
// Tried again on the next unlock until it has worked, or a toot has played
// it (which primes it too); never over a prime or a toot under way.
function primeClip(entry) {
    const clip = entry.el;
    if (entry.primed || entry.priming || !clip.paused) return;
    entry.priming = true;
    clip.muted = true;
    clip.play()
        .then(() => {
            entry.primed = true;
            if (!clip.muted) return;
            clip.pause();
            clip.currentTime = 0;
        })
        .catch(() => {})
        .finally(() => {
            entry.priming = false;
            clip.muted = false;
        });
}

/**
 * Toot audio, behind the shared useToot. Reuses the shared
 * /fart.m4a sample but plays it back at a per-character playbackRate so each
 * toots at a distinct pitch. Falls back to a synthesized fart (also
 * pitch-aware) when the sample can't load or autoplay is still locked.
 *
 * `clipUrls` are recorded toots a character has of its own (Guster's
 * sounds), played as they are instead of the sample.
 */
export function useTootSound(fartSoundUrl = "/fart.m4a", clipUrls = []) {
    const audioReady = ref(false);

    const fartSound = new Audio(fartSoundUrl);
    fartSound.preload = "auto";
    fartSound.volume = VOLUME;
    fartSound.addEventListener("canplaythrough", () => {
        audioReady.value = true;
    });
    fartSound.addEventListener("error", () => {
        audioReady.value = false;
    });

    const clips = new Map(clipUrls.map((url) => [url, clipFor(url)]));

    function getCtx() {
        return getAudioContext();
    }

    // Unlock both the HTMLAudio element and the WebAudio context during the
    // Play tap, so later toots aren't silenced by autoplay policy. Muted, so
    // unlocking doesn't itself make a sound. Resolves to whether it worked.
    function initAudio() {
        unlockAudio();
        clips.forEach(primeClip);
        fartSound.muted = true;
        return fartSound
            .play()
            .then(() => {
                fartSound.pause();
                fartSound.currentTime = 0;
                audioReady.value = true;
                return true;
            })
            .catch(() => false)
            .finally(() => {
                fartSound.muted = false;
            });
    }

    /**
     * Play a toot: recording `clip` (one of clipUrls) if given, else the
     * sample, or the sample after all if the clip won't play.
     * @param {number} pitch playbackRate multiplier (1 = native, >1 higher/squeakier)
     * @param {string|null} clip
     */
    function playToot(pitch = 1, clip = null) {
        const recording = clip && clips.get(clip);
        if (recording) {
            const el = recording.el;
            el.muted = false;
            el.currentTime = 0;
            el.play()
                .then(() => {
                    recording.primed = true;
                })
                .catch(() => playToot(pitch));
            return;
        }
        if (audioReady.value) {
            const sound = fartSound.cloneNode();
            sound.volume = fartSound.volume;
            sound.playbackRate = pitch;
            sound.play().catch(() => playSynthToot(pitch));
            return;
        }
        playSynthToot(pitch);
    }

    function playSynthToot(pitch = 1) {
        try {
            const c = getCtx();
            const now = c.currentTime;
            const base = 200 * pitch;

            const osc = c.createOscillator();
            const oscFilter = c.createBiquadFilter();
            const oscGain = c.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(base, now);
            osc.frequency.exponentialRampToValueAtTime(base * 0.22, now + 0.25);
            oscFilter.type = "lowpass";
            oscFilter.frequency.setValueAtTime(900, now);
            oscFilter.frequency.exponentialRampToValueAtTime(180, now + 0.25);
            oscGain.gain.setValueAtTime(0.22, now);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

            const sr = c.sampleRate;
            const len = Math.floor(sr * 0.3);
            const buf = c.createBuffer(1, len, sr);
            const data = buf.getChannelData(0);
            for (let i = 0; i < len; i++) {
                const t = i / len;
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2);
            }
            const noise = c.createBufferSource();
            const noiseFilter = c.createBiquadFilter();
            const noiseGain = c.createGain();
            noise.buffer = buf;
            noiseFilter.type = "bandpass";
            noiseFilter.frequency.setValueAtTime(420 * pitch, now);
            noiseFilter.Q.value = 0.7;
            noiseGain.gain.setValueAtTime(0.14, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

            osc.connect(oscFilter);
            oscFilter.connect(oscGain);
            oscGain.connect(c.destination);
            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(c.destination);

            osc.start(now);
            osc.stop(now + 0.28);
            noise.start(now);
            noise.stop(now + 0.22);
        } catch {
            /* ignore */
        }
    }

    return { initAudio, playToot, audioReady };
}
