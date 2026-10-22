import { getAudioContext } from "@/composables/useAudioContext";
import { frequencyOf } from "./organSounds.js";

// A clock ticking in a room: how loud it is beside it, and how far off,
// in world units, it can no longer be heard.
const ROOM_TICK = { level: 0.1, reach: 900 };
// Its dong carries further: across the whole of the Nest.
const ROOM_DONG = { level: 0.5, reach: 2400 };

/** How loud `sound` (ROOM_TICK or ROOM_DONG) is `distance` units away:
 * from its level beside it to 0 at its reach. */
function heardAt({ level, reach }, distance) {
    return level * Math.max(0, 1 - distance / reach);
}

/** How loud a clock ticking in a room is `distance` units away. */
export function tickLevel(distance) {
    return heardAt(ROOM_TICK, distance);
}

/** How loud a clock donging in a room is `distance` units away. */
export function dongLevel(distance) {
    return heardAt(ROOM_DONG, distance);
}

/** A clock's tick: a short mechanical click, `level` loud at its peak. */
export function playTick(level = 0.16) {
    const ctx = getAudioContext();
    // Its envelope ramps from 0.0001: anything quieter can't be heard.
    if (!ctx || level <= 0.0001) return;
    const t = ctx.currentTime;

    const click = ctx.createOscillator();
    click.type = "square";
    click.frequency.setValueAtTime(2200, t);
    click.frequency.exponentialRampToValueAtTime(180, t + 0.016);

    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 700;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(level, t + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);

    click.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    click.start(t);
    click.stop(t + 0.04);
}

// A small clock bell: the partials above the strike, and how loud each is.
const BELL = [
    [1, 0.22],
    [2, 0.12],
    [2.76, 0.07],
    [3.8, 0.035],
];

/** A clock's chime: one struck bell. */
export function playBell() {
    const ctx = getAudioContext();
    if (!ctx) return;
    strike(ctx, BELL, 784, 1, ctx.currentTime, 1.05);
}

// A grandfather clock's gong: a low fundamental, its slightly sharp
// inharmonic partials, and how loud each is.
const GONG = [
    [1, 0.5],
    [2.02, 0.2],
    [2.98, 0.1],
    [4.1, 0.04],
];

/** One struck note of `partials` (BELL, GONG) on `fundamental` Hz, `at`
 * s on `ctx`'s clock, `level` loud at its peak and ringing `ring` s. */
function strike(ctx, partials, fundamental, level, at, ring) {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, at);
    master.gain.exponentialRampToValueAtTime(level, at + 0.01);
    master.gain.exponentialRampToValueAtTime(0.0001, at + ring);
    master.connect(ctx.destination);

    for (const [ratio, partial] of partials) {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = fundamental * ratio;
        const gain = ctx.createGain();
        gain.gain.value = partial;
        osc.connect(gain);
        gain.connect(master);
        osc.start(at);
        osc.stop(at + ring + 0.05);
    }
}

// The dong: its MIDI note (E2, the tune's own key, as Big Ben strikes
// the hour), how long it rings, s, and how loud, of a dong.
const DONG = { note: 40, ring: 3.5, loud: 1 };

// The grandfather clock's tune, the Westminster chimes' first two
// phrases in E: each note's MIDI note and when it's struck, s from the
// start, its notes a little softer than the dong. A dong follows it, as a
// clock strikes the hour after its chimes.
const TUNE_NOTE = { ring: 1.6, loud: 0.6 };
export const TUNE = [
    [64, 0],
    [68, 0.6],
    [66, 1.2],
    [59, 1.8],
    [64, 3],
    [66, 3.6],
    [68, 4.2],
    [64, 4.8],
];
const TUNE_DONG = 6.2;

// A clock's strikes on its dong's turn, each [s after it, strike]: a
// dong alone, or the tune and then its dong.
const DONGED = [[0, DONG]];
const SUNG = [
    ...TUNE.map(([note, at]) => [at, { note, ...TUNE_NOTE }]),
    [TUNE_DONG, DONG],
];

/** What a clock that dongs every `chime` s, and plays its tune first
 * every `tune`th dong (when it has one), strikes after `from` s and up to
 * `to` s on the room's clock: [{ note, ring, loud }], in order. Struck one
 * by one as each comes round, a tune stops when the room does and each
 * note is as loud as the Butt is near it then. */
export function chimesBetween(from, to, { chime, tune }) {
    const strikes = [];
    // A tune runs TUNE_DONG s past its dong's turn: look back that far.
    const first = Math.max(0, Math.floor((from - TUNE_DONG) / chime));
    for (let count = first; count * chime <= to; count++) {
        const start = count * chime;
        const due = tune && count % tune === 0 ? SUNG : DONGED;
        for (const [at, strike] of due) {
            if (start + at > from && start + at <= to) strikes.push(strike);
        }
    }
    return strikes;
}

/** One of a grandfather clock's strikes (chimesBetween()), `level` loud
 * at the dong's peak. */
export function playChime({ note, ring, loud }, level = ROOM_DONG.level) {
    const ctx = getAudioContext();
    if (!ctx || level * loud <= 0.0001) return;
    strike(ctx, GONG, frequencyOf(note), level * loud, ctx.currentTime, ring);
}
