import { getAudioContext, unlockAudio } from "@/composables/useAudioContext";
import { playHiss } from "@/composables/playHiss";

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
            /* ignore — playFart falls back to silence when no buffer */
        }
    }

    function playFart() {
        if (!fartBuffer) return;
        const ctx = getContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const source = ctx.createBufferSource();
        source.buffer = fartBuffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(1.7, now);
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start(now);
    }

    function playVictory() {
        const ctx = getContext();
        if (!ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.5];

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(
                0.001,
                ctx.currentTime + i * 0.15 + 0.4
            );
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + i * 0.15);
            osc.stop(ctx.currentTime + i * 0.15 + 0.4);
        });
    }

    return { initAudio, playHiss, playFart, playVictory };
}
