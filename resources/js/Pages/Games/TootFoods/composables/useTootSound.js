import { ref } from "vue";

/**
 * Audio for Toot Foods. Reuses the shared /fart.m4a sample but plays it back
 * at a per-food playbackRate so each snack toots at a distinct pitch. Falls
 * back to a synthesized fart (also pitch-aware) when the sample can't load or
 * autoplay is still locked.
 */
export function useTootSound(fartSoundUrl = "/fart.m4a") {
    const audioReady = ref(false);

    const fartSound = new Audio(fartSoundUrl);
    fartSound.preload = "auto";
    fartSound.volume = 0.9;
    fartSound.addEventListener("canplaythrough", () => {
        audioReady.value = true;
    });
    fartSound.addEventListener("error", () => {
        audioReady.value = false;
    });

    let ctx = null;
    function getCtx() {
        if (!ctx) {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (ctx.state === "suspended") {
            ctx.resume().catch(() => {});
        }
        return ctx;
    }

    // Unlock both the HTMLAudio element and the WebAudio context during the
    // Play tap, so later toots aren't silenced by autoplay policy.
    function initAudio() {
        getCtx();
        return fartSound
            .play()
            .then(() => {
                fartSound.pause();
                fartSound.currentTime = 0;
                audioReady.value = true;
            })
            .catch(() => {});
    }

    /**
     * Play a toot.
     * @param {number} pitch playbackRate multiplier (1 = native, >1 higher/squeakier)
     */
    function playToot(pitch = 1) {
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

    function playVictory() {
        try {
            const c = getCtx();
            const notes = [523.25, 659.25, 783.99, 1046.5];
            notes.forEach((freq, i) => {
                const osc = c.createOscillator();
                const gain = c.createGain();
                osc.type = "sine";
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.2, c.currentTime + i * 0.15);
                gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.15 + 0.4);
                osc.connect(gain);
                gain.connect(c.destination);
                osc.start(c.currentTime + i * 0.15);
                osc.stop(c.currentTime + i * 0.15 + 0.4);
            });
        } catch {
            /* ignore */
        }
    }

    return { initAudio, playToot, playVictory, audioReady };
}
