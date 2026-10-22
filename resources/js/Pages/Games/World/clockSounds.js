import { getAudioContext } from "@/composables/useAudioContext";

// A clock ticking in a room: how loud it is beside it, and how far off,
// in world units, it can no longer be heard.
const ROOM_TICK = { level: 0.1, reach: 900 };

/** How loud a clock ticking in a room is `distance` units away: from
 * ROOM_TICK.level beside it to 0 at its reach. */
export function tickLevel(distance) {
    return ROOM_TICK.level * Math.max(0, 1 - distance / ROOM_TICK.reach);
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
    const t = ctx.currentTime;
    const fundamental = 784;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, t);
    master.gain.exponentialRampToValueAtTime(1, t + 0.01);
    master.gain.exponentialRampToValueAtTime(0.0001, t + 1.05);
    master.connect(ctx.destination);

    for (const [ratio, level] of BELL) {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = fundamental * ratio;
        const gain = ctx.createGain();
        gain.gain.value = level;
        osc.connect(gain);
        gain.connect(master);
        osc.start(t);
        osc.stop(t + 1.1);
    }
}
