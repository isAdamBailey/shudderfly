import { getAudioContext, unlockAudio } from "@/composables/useAudioContext";

let fartBuffer = null;

function getContext() {
    return getAudioContext();
}

export function useSound(fartSoundUrl = "/fart.m4a") {
    async function initAudio() {
        const ctx = await unlockAudio();
        if (!ctx) return;
        if (!fartSoundUrl || fartBuffer) return;
        try {
            const res = await fetch(fartSoundUrl);
            if (!res.ok) return;
            const buf = await res.arrayBuffer();
            fartBuffer = await ctx.decodeAudioData(buf);
        } catch {
            /* ignore — playLevelUp falls back to silence when no buffer */
        }
    }

    function playLaunch() {
        const ctx = getContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(720, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.14);
    }

    function playHit() {
        const ctx = getContext();
        if (!ctx) return;
        const duration = 0.22;
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            const envelope = Math.pow(1 - i / bufferSize, 2.5);
            data[i] = (Math.random() * 2 - 1) * envelope;
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const bandpass = ctx.createBiquadFilter();
        bandpass.type = "bandpass";
        bandpass.frequency.value = 1800;
        bandpass.Q.value = 0.7;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, ctx.currentTime);

        source.connect(bandpass);
        bandpass.connect(gain);
        gain.connect(ctx.destination);
        source.start(ctx.currentTime);

        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(990, ctx.currentTime + 0.09);
        oscGain.gain.setValueAtTime(0.15, ctx.currentTime);
        oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
    }

    function playMiss() {
        const ctx = getContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
    }

    function playLevelUp() {
        const ctx = getContext();
        if (!ctx) return;
        const notes = [392, 523.25, 659.25, 880];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "square";
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.14, ctx.currentTime + i * 0.09);
            gain.gain.exponentialRampToValueAtTime(
                0.001,
                ctx.currentTime + i * 0.09 + 0.25
            );
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + i * 0.09);
            osc.stop(ctx.currentTime + i * 0.09 + 0.25);
        });

        if (fartBuffer) {
            const now = ctx.currentTime + notes.length * 0.09;
            const source = ctx.createBufferSource();
            source.buffer = fartBuffer;
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(1.3, now);
            source.connect(gain);
            gain.connect(ctx.destination);
            source.start(now);
        }
    }

    return { initAudio, playLaunch, playHit, playMiss, playLevelUp };
}
