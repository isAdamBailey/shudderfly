import { ref } from "vue";

export function useSound(fartSoundUrl = "/fart.m4a") {
    const audioReady = ref(false);

    const fartSound = new Audio(fartSoundUrl);
    fartSound.preload = "auto";
    fartSound.volume = 0.9;
    fartSound.addEventListener("canplaythrough", () => { audioReady.value = true; });
    fartSound.addEventListener("error", () => { audioReady.value = false; });

    function initAudio() {
        // Unlock the WebAudio context during the Play gesture so later
        // synth sounds (chomp, etc.) aren't silenced by autoplay policy.
        getChompCtx();
        return fartSound.play().then(() => {
            fartSound.pause();
            fartSound.currentTime = 0;
            audioReady.value = true;
        }).catch(() => {});
    }

    function playFart() {
        if (!audioReady.value) {
            playSynthFart();
            return;
        }
        const sound = fartSound.cloneNode();
        sound.volume = fartSound.volume;
        sound.play().catch(() => playSynthFart());
    }

    function playSynthFart() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const oscFilter = ctx.createBiquadFilter();
            const oscGain = ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(45, now + 0.25);
            oscFilter.type = "lowpass";
            oscFilter.frequency.setValueAtTime(900, now);
            oscFilter.frequency.exponentialRampToValueAtTime(180, now + 0.25);
            oscGain.gain.setValueAtTime(0.22, now);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

            const sr = ctx.sampleRate;
            const len = Math.floor(sr * 0.3);
            const buf = ctx.createBuffer(1, len, sr);
            const data = buf.getChannelData(0);
            for (let i = 0; i < len; i++) {
                const t = i / len;
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2);
            }
            const noise = ctx.createBufferSource();
            const noiseFilter = ctx.createBiquadFilter();
            const noiseGain = ctx.createGain();
            noise.buffer = buf;
            noiseFilter.type = "bandpass";
            noiseFilter.frequency.setValueAtTime(420, now);
            noiseFilter.Q.value = 0.7;
            noiseGain.gain.setValueAtTime(0.14, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

            osc.connect(oscFilter);
            oscFilter.connect(oscGain);
            oscGain.connect(ctx.destination);
            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.28);
            noise.start(now);
            noise.stop(now + 0.22);

            setTimeout(() => ctx.close(), 1000);
        } catch {
            /* ignore */
        }
    }

    let chompCtx = null;

    function getChompCtx() {
        if (!chompCtx) {
            chompCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (chompCtx.state === "suspended") {
            chompCtx.resume().catch(() => {});
        }
        return chompCtx;
    }

    // A short burst of shaped noise — the wet "crunch" of a bite.
    function crunch(ctx, start, { dur, freq, q, gain }) {
        const sr = ctx.sampleRate;
        const len = Math.max(1, Math.floor(sr * dur));
        const buf = ctx.createBuffer(1, len, sr);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) {
            const t = i / len;
            // fast attack, quick decay so it reads as a crisp bite, not a hiss
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 1.7);
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(freq, start);
        filter.frequency.exponentialRampToValueAtTime(freq * 0.55, start + dur);
        filter.Q.value = q;
        const g = ctx.createGain();
        g.gain.setValueAtTime(gain, start);
        g.gain.exponentialRampToValueAtTime(0.0008, start + dur);
        src.connect(filter);
        filter.connect(g);
        g.connect(ctx.destination);
        src.start(start);
        src.stop(start + dur + 0.02);
    }

    // A soft pitched body — the squish/gulp underneath the crunch.
    function squish(ctx, start, { f0, f1, dur, gain, type = "triangle" }) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(f0, start);
        osc.frequency.exponentialRampToValueAtTime(f1, start + dur);
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(gain, start + dur * 0.18);
        g.gain.exponentialRampToValueAtTime(0.0008, start + dur);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + dur + 0.02);
    }

    function playChomp() {
        try {
            const ctx = getChompCtx();
            const now = ctx.currentTime;
            // vary every bite so three feeds in a row don't sound identical
            const r = 0.9 + Math.random() * 0.22;

            // first "nom" — crunch + warm body thump
            crunch(ctx, now, { dur: 0.07, freq: 1900 * r, q: 0.9, gain: 0.2 });
            squish(ctx, now, { f0: 250 * r, f1: 95, dur: 0.1, gain: 0.16 });

            // second "nom" — slightly higher, tighter
            const t2 = now + 0.085;
            crunch(ctx, t2, { dur: 0.06, freq: 1500 * r, q: 1.1, gain: 0.15 });
            squish(ctx, t2, { f0: 300 * r, f1: 120, dur: 0.08, gain: 0.12 });

            // swallow — a soft low "blup" to sell the gulp
            squish(ctx, now + 0.18, {
                f0: 210 * r,
                f1: 70,
                dur: 0.11,
                gain: 0.13,
                type: "sine",
            });
        } catch {
            /* ignore */
        }
    }

    function playVictory() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const notes = [523.25, 659.25, 783.99, 1046.5];

            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "sine";
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.15);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + i * 0.15);
                osc.stop(ctx.currentTime + i * 0.15 + 0.4);
            });

            setTimeout(() => {
                ctx.close().catch(() => {});
            }, 2000);
        } catch {
            /* ignore */
        }
    }

    function playMissSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(280, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.35);
            gain.gain.setValueAtTime(0.35, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.35);
            setTimeout(() => ctx.close(), 1000);
        } catch {
            /* ignore */
        }
    }

    return {
        initAudio,
        playFart,
        playChomp,
        playVictory,
        playMissSound,
        audioReady,
    };
}
