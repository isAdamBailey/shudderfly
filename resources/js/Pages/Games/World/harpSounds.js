import { getAudioContext } from "@/composables/useAudioContext";
import { frequencyOf } from "./organSounds.js";
import { stoneHall } from "./stoneHall.js";

// The Cockroach's harp, made in Web Audio: a plucked string is its note and
// a few overtones in one tone, struck at once and dying away, a filter
// closing on it so the high overtones go soonest, into the music room's
// stone hall (stoneHall.js). One oscillator a string, so a fast strum
// stays light.

// The strings run up A minor's pentatonic scale, A C D E G, so any strum
// across them sounds sweet: the steps from A, in semitones.
const PENTATONIC = [0, 3, 5, 7, 10];
// The deepest string's A: A2, MIDI note 45.
const LOWEST_A = 45;

// The overtones' loudness, the note first.
const OVERTONES = [1, 0.45, 0.22, 0.12, 0.06];
// How long the deepest string rings, s, and how much shorter each string
// up rings; how fast it's struck.
const RING = { deepest: 3.2, less: 0.17, attack: 0.004 };
// The filter: open to this many times the note when plucked, closing to
// this over the first share of the ring.
const BRIGHT = { from: 6, to: 1.5, over: 0.4 };
// One string's loudness, under the hall's limiter.
const LEVEL = 0.18;

/** String `n` (0 the deepest), as a MIDI note. */
export function harpNote(n) {
    return LOWEST_A + 12 * Math.floor(n / 5) + PENTATONIC[n % 5];
}

// The string's tone, made once per audio context.
let made = null;

function toneFor(ctx) {
    if (made?.ctx === ctx) return made.tone;
    const imag = Float32Array.from([0, ...OVERTONES]);
    const tone = ctx.createPeriodicWave(new Float32Array(imag.length), imag);
    made = { ctx, tone };
    return tone;
}

/** Plucks string `n` of the harp, `delay` s from now. */
export function playHarp(n, delay = 0) {
    const ctx = getAudioContext();
    if (!ctx) return;
    const input = stoneHall(ctx);
    const t = ctx.currentTime + delay;
    const hz = frequencyOf(harpNote(n));
    const ring = Math.max(0.8, RING.deepest - RING.less * n);
    const end = t + ring;

    const string = ctx.createOscillator();
    string.setPeriodicWave(toneFor(ctx));
    string.frequency.value = hz;
    const damp = ctx.createBiquadFilter();
    damp.type = "lowpass";
    damp.frequency.setValueAtTime(Math.min(12000, hz * BRIGHT.from), t);
    damp.frequency.exponentialRampToValueAtTime(
        hz * BRIGHT.to,
        t + ring * BRIGHT.over
    );
    const note = ctx.createGain();
    note.gain.setValueAtTime(0.0001, t);
    note.gain.exponentialRampToValueAtTime(LEVEL, t + RING.attack);
    note.gain.exponentialRampToValueAtTime(0.0001, end);
    string.connect(damp);
    damp.connect(note);
    note.connect(input);
    string.start(t);
    string.stop(end + 0.05);
    // Off the hall once silent, as the organ's pipes are: mobile Safari is
    // slow to free nodes left connected.
    string.onended = () => note.disconnect();
}
