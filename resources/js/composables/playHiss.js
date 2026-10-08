import { getAudioContext } from "@/composables/useAudioContext";

const HISS_SECONDS = 0.9;

// The hiss's noise, made once per sample rate: it's ~40k random samples, too
// much to remake for every hiss.
let noise = null;

function hissNoise(ctx) {
    if (noise?.sampleRate === ctx.sampleRate) return noise;
    const bufferSize = ctx.sampleRate * HISS_SECONDS;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    const attackEnd = 0.05 * bufferSize;
    const sustainEnd = 0.6 * bufferSize;

    for (let i = 0; i < bufferSize; i++) {
        let envelope;
        if (i < attackEnd) {
            envelope = i / attackEnd;
        } else if (i < sustainEnd) {
            envelope = 1.0;
        } else {
            envelope = Math.pow(
                1 - (i - sustainEnd) / (bufferSize - sustainEnd),
                1.5
            );
        }
        data[i] = (Math.random() * 2 - 1) * envelope;
    }
    noise = buffer;
    return buffer;
}

/**
 * The cockroach's hiss: a burst of filtered noise, made on the shared
 * AudioContext (so it is silent until a gesture has unlocked it, see
 * useAudioContext's unlockAudio). Shared by the cockroach games and the
 * Games World's manhole cockroaches.
 */
export function playHiss() {
    const ctx = getAudioContext();
    if (!ctx) return;
    const duration = HISS_SECONDS;
    const buffer = hissNoise(ctx);

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 3500;
    bandpass.Q.value = 0.4;

    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
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
