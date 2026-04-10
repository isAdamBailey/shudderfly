const isAudioSupported =
    typeof window !== "undefined" &&
    !!(window.AudioContext || window.webkitAudioContext);

let audioCtx = null;
let fartBuffer = null;

function getContext() {
    if (!isAudioSupported) return null;
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
    }
    return audioCtx;
}

export function useSound(fartSoundUrl = "/fart.mp3") {
    async function initAudio() {
        if (fartBuffer) return;
        const ctx = getContext();
        if (!ctx) return;
        try {
            const res = await fetch(fartSoundUrl);
            if (!res.ok) return;
            const buf = await res.arrayBuffer();
            fartBuffer = await ctx.decodeAudioData(buf);
        } catch {}
    }

    function playHiss() {
        const ctx = getContext();
        if (!ctx) return;
        const duration = 0.9;
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        const attackEnd  = 0.05 * bufferSize;
        const sustainEnd = 0.6  * bufferSize;

        for (let i = 0; i < bufferSize; i++) {
            let envelope;
            if (i < attackEnd) {
                envelope = i / attackEnd;
            } else if (i < sustainEnd) {
                envelope = 1.0;
            } else {
                envelope = Math.pow(1 - (i - sustainEnd) / (bufferSize - sustainEnd), 1.5);
            }
            data[i] = (Math.random() * 2 - 1) * envelope;
        }

        const source   = ctx.createBufferSource();
        source.buffer  = buffer;

        const bandpass = ctx.createBiquadFilter();
        bandpass.type  = "bandpass";
        bandpass.frequency.value = 3500;
        bandpass.Q.value = 0.4;

        const highpass = ctx.createBiquadFilter();
        highpass.type  = "highpass";
        highpass.frequency.value = 1500;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.setValueAtTime(0.35, ctx.currentTime + duration * 0.6);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        source.connect(bandpass);
        bandpass.connect(highpass);
        highpass.connect(gain);
        gain.connect(ctx.destination);

        source.start(ctx.currentTime);
    }

    function playFart() {
        if (!fartBuffer) return;
        const ctx = getContext();
        if (!ctx) return;
        const now    = ctx.currentTime;
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
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type   = "sine";
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + i * 0.15);
            osc.stop(ctx.currentTime + i * 0.15 + 0.4);
        });
    }

    return { initAudio, playHiss, playFart, playVictory };
}
