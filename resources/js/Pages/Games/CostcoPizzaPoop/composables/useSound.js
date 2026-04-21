import { ref } from "vue";

export function useSound(fartSoundUrl = "/fart.m4a") {
    const audioReady = ref(false);

    const fartSound = new Audio(fartSoundUrl);
    fartSound.preload = "auto";
    fartSound.volume = 0.9;
    fartSound.addEventListener("canplaythrough", () => { audioReady.value = true; });
    fartSound.addEventListener("error", () => { audioReady.value = false; });

    function initAudio() {
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
        } catch (_) {}
    }

    function playChomp() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(420, now);
            osc.frequency.exponentialRampToValueAtTime(110, now + 0.09);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.12);

            const sr = ctx.sampleRate;
            const len = Math.floor(sr * 0.05);
            const buf = ctx.createBuffer(1, len, sr);
            const data = buf.getChannelData(0);
            for (let i = 0; i < len; i++) {
                data[i] = (Math.random() * 2 - 1) * (1 - i / len);
            }
            const noise = ctx.createBufferSource();
            const nGain = ctx.createGain();
            noise.buffer = buf;
            nGain.gain.setValueAtTime(0.06, now);
            nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            noise.connect(nGain);
            nGain.connect(ctx.destination);
            noise.start(now);
            noise.stop(now + 0.05);

            setTimeout(() => ctx.close(), 600);
        } catch (_) {}
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
        } catch (_) {}
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
        } catch (_) {}
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
