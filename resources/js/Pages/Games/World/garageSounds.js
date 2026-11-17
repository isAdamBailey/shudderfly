import { getAudioContext } from "@/composables/useAudioContext";

// The Garage's sounds (issue #227): a button's click and a keypad's beep
// on a press, the opener's motor humming while the door moves, and a
// clunk as it stops at the top or bottom. Like the world's other sounds,
// they always play (sounds_enabled is only the Guster exhibit's).

/** A clicker's button: a short plastic click. */
export function playGarageClick() {
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    const click = ctx.createOscillator();
    click.type = "square";
    click.frequency.setValueAtTime(1500, t);
    click.frequency.exponentialRampToValueAtTime(120, t + 0.02);

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1200;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

    click.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    click.start(t);
    click.stop(t + 0.06);
}

// A keypad's key beeps at `key` Hz; its Enter, when it opens, at `enter`.
const BEEP = { key: 1850, enter: 2350, length: 0.08 };

/** A keypad key's beep, higher for an Enter that opens (`enter`). */
export function playGarageBeep(enter = false) {
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    const beep = ctx.createOscillator();
    beep.type = "square";
    beep.frequency.value = enter ? BEEP.enter : BEEP.key;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.07, t + 0.004);
    gain.gain.setValueAtTime(0.07, t + BEEP.length - 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + BEEP.length);

    beep.connect(gain);
    gain.connect(ctx.destination);
    beep.start(t);
    beep.stop(t + BEEP.length + 0.02);
}

// The motor: a low buzz and its chain rattle, how loud, and how long it
// takes to spin up and down.
const HUM = { pitch: 62, rattle: 9, level: 0.06, ramp: 0.15 };

/** Starts the opener's motor humming: a function that stops it, once.
 * Silent, and still stoppable, without audio. */
export function startGarageHum() {
    const ctx = getAudioContext();
    if (!ctx) return () => {};
    const t = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, t);
    master.gain.exponentialRampToValueAtTime(HUM.level, t + HUM.ramp);
    master.connect(ctx.destination);

    // The chain's wobble, under the spin-up and spin-down.
    const wobble = ctx.createGain();
    wobble.gain.value = 1;
    wobble.connect(master);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 600;
    filter.connect(wobble);

    // The buzz and its octave, wobbled by the chain running over its
    // sprocket.
    const motors = [1, 2].map((ratio) => {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.value = HUM.pitch * ratio;
        osc.connect(filter);
        return osc;
    });
    const rattle = ctx.createOscillator();
    rattle.type = "square";
    rattle.frequency.value = HUM.rattle;
    const depth = ctx.createGain();
    depth.gain.value = 0.35;
    rattle.connect(depth);
    depth.connect(wobble.gain);

    const oscillators = [...motors, rattle];
    for (const osc of oscillators) osc.start(t);

    return () => {
        const now = ctx.currentTime;
        // From where it is, even part way through spinning up.
        const at = Math.max(master.gain.value, 0.0001);
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(at, now);
        master.gain.exponentialRampToValueAtTime(0.0001, now + HUM.ramp);
        for (const osc of oscillators) osc.stop(now + HUM.ramp + 0.05);
    };
}

/** The door stopping at the top or bottom: a heavy thud and its rattle. */
export function playGarageClunk() {
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    const thud = ctx.createOscillator();
    thud.type = "sine";
    thud.frequency.setValueAtTime(140, t);
    thud.frequency.exponentialRampToValueAtTime(45, t + 0.18);
    const thudGain = ctx.createGain();
    thudGain.gain.setValueAtTime(0.0001, t);
    thudGain.gain.exponentialRampToValueAtTime(0.45, t + 0.005);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    thud.connect(thudGain);
    thudGain.connect(ctx.destination);
    thud.start(t);
    thud.stop(t + 0.32);

    // The panels' metal, a moment after.
    const rattle = ctx.createOscillator();
    rattle.type = "square";
    rattle.frequency.setValueAtTime(320, t + 0.01);
    rattle.frequency.exponentialRampToValueAtTime(180, t + 0.15);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 900;
    const rattleGain = ctx.createGain();
    rattleGain.gain.setValueAtTime(0.0001, t);
    rattleGain.gain.exponentialRampToValueAtTime(0.06, t + 0.02);
    rattleGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    rattle.connect(filter);
    filter.connect(rattleGain);
    rattleGain.connect(ctx.destination);
    rattle.start(t + 0.01);
    rattle.stop(t + 0.22);
}
