import { getAudioContext } from "@/composables/useAudioContext";

// The Cockroach's pipe organ, made in Web Audio: each note is a few ranks
// of pipes sounding together (the note, its octave, the twelfth and the
// fifteenth), a breathy chiff of air as the pipe speaks, and a big stone
// hall's echo after it.

// The keyboard runs A to G an octave a zone, so every note is in A minor:
// the white keys from A, in semitones.
const MINOR = [0, 2, 3, 5, 7, 8, 10];
// Zone 0's A: A1, MIDI note 33.
const LOWEST_A = 33;

// The ranks: [times the note, how loud].
const RANKS = [
    [1, 0.5],
    [2, 0.26],
    [3, 0.1],
    [4, 0.09],
];
// The principal's tone: the loudness of its harmonics, for a reedy pipe
// rather than a whistle.
const HARMONICS = [0, 1, 0.55, 0.3, 0.22, 0.12, 0.08, 0.05, 0.03];

// How long a note holds, and how it starts and dies away, s.
const NOTE = { hold: 0.9, attack: 0.05, release: 0.45 };
// One note's loudness, under the hall's limiter.
const LEVEL = 0.16;
// The hall: how long its echo rings, s, and how much of it you hear.
const HALL = { seconds: 2.6, wet: 0.45 };

/** Zone `zone`'s white key `key` (0 is its A), as a MIDI note. */
export function organNote(zone, key) {
    return LOWEST_A + zone * 12 + MINOR[key];
}

/** MIDI note `midi` in Hz. */
export function frequencyOf(midi) {
    return 440 * 2 ** ((midi - 69) / 12);
}

// Made once per audio context: the hall every note plays into, the
// pipe's tone, and the noise its chiff is cut from.
let made = null;

function hallFor(ctx) {
    if (made?.ctx === ctx) return made;

    // A stone hall: noise dying away, a little different in each ear.
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * HALL.seconds);
    const echo = ctx.createBuffer(2, length, rate);
    for (let channel = 0; channel < 2; channel += 1) {
        const data = echo.getChannelData(channel);
        for (let i = 0; i < length; i += 1) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
        }
    }
    const reverb = ctx.createConvolver();
    reverb.buffer = echo;
    const wet = ctx.createGain();
    wet.gain.value = HALL.wet;

    // A chord of deep notes adds up: a limiter keeps it from clipping.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.ratio.value = 8;

    const input = ctx.createGain();
    input.connect(limiter);
    input.connect(reverb);
    reverb.connect(wet);
    wet.connect(limiter);
    limiter.connect(ctx.destination);

    const real = new Float32Array(HARMONICS.length);
    const tone = ctx.createPeriodicWave(real, Float32Array.from(HARMONICS));

    const noise = ctx.createBuffer(1, Math.floor(rate * 0.1), rate);
    const hiss = noise.getChannelData(0);
    for (let i = 0; i < hiss.length; i += 1) hiss[i] = Math.random() * 2 - 1;

    made = { ctx, input, tone, noise };
    return made;
}

/** Plays zone `zone`'s white key `key` on the organ. */
export function playOrgan(zone, key) {
    const ctx = getAudioContext();
    if (!ctx) return;
    const { input, tone, noise } = hallFor(ctx);
    const t = ctx.currentTime;
    const hz = frequencyOf(organNote(zone, key));
    const end = t + NOTE.hold + NOTE.release;

    const note = ctx.createGain();
    note.gain.setValueAtTime(0.0001, t);
    note.gain.exponentialRampToValueAtTime(LEVEL, t + NOTE.attack);
    note.gain.setValueAtTime(LEVEL, t + NOTE.hold);
    note.gain.exponentialRampToValueAtTime(0.0001, end);
    // The highest ranks of a high note would only shriek.
    const soften = ctx.createBiquadFilter();
    soften.type = "lowpass";
    soften.frequency.value = Math.min(9000, hz * 10);
    note.connect(soften);
    soften.connect(input);

    for (const [ratio, level] of RANKS) {
        const pipe = ctx.createOscillator();
        pipe.setPeriodicWave(tone);
        pipe.frequency.value = hz * ratio;
        // Never two pipes quite in tune: a slow beat between ranks.
        pipe.detune.value = (Math.random() - 0.5) * 6;
        const gain = ctx.createGain();
        gain.gain.value = level;
        pipe.connect(gain);
        gain.connect(note);
        pipe.start(t);
        pipe.stop(end + 0.05);
    }

    // The chiff: a breath of air through the pipe's mouth as it speaks.
    const breath = ctx.createBufferSource();
    breath.buffer = noise;
    const mouth = ctx.createBiquadFilter();
    mouth.type = "bandpass";
    mouth.frequency.value = Math.min(6000, hz * 3);
    mouth.Q.value = 2;
    const puff = ctx.createGain();
    puff.gain.setValueAtTime(0.0001, t);
    puff.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
    puff.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    breath.connect(mouth);
    mouth.connect(puff);
    puff.connect(input);
    breath.start(t);
    breath.stop(t + 0.1);
}
