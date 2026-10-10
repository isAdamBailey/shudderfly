import { getAudioContext } from "@/composables/useAudioContext";

// A short burst of shaped noise — the wet "crunch" of a bite.
function crunch(ctx, start, { dur, freq, q, gain }) {
    const sr = ctx.sampleRate;
    const len = Math.max(1, Math.floor(sr * dur));
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
        const t = i / len;
        // fast attack, quick decay so it reads as a crisp bite, not a hiss
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 1.7);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(freq, start);
    filter.frequency.exponentialRampToValueAtTime(freq * 0.55, start + dur);
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(0.0008, start + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    src.start(start);
    src.stop(start + dur + 0.02);
}

// A soft pitched body — the squish/gulp underneath the crunch.
function squish(ctx, start, { f0, f1, dur, gain, type = "triangle" }) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, start);
    osc.frequency.exponentialRampToValueAtTime(f1, start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + dur * 0.18);
    g.gain.exponentialRampToValueAtTime(0.0008, start + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
}

/** A bite: two crunchy "nom"s and a gulp, a little different each time. */
export function playChomp() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        // vary every bite so three feeds in a row don't sound identical
        const r = 0.9 + Math.random() * 0.22;

        // first "nom" — crunch + warm body thump
        crunch(ctx, now, { dur: 0.07, freq: 1900 * r, q: 0.9, gain: 0.2 });
        squish(ctx, now, { f0: 250 * r, f1: 95, dur: 0.1, gain: 0.16 });

        // second "nom" — slightly higher, tighter
        const t2 = now + 0.085;
        crunch(ctx, t2, { dur: 0.06, freq: 1500 * r, q: 1.1, gain: 0.15 });
        squish(ctx, t2, { f0: 300 * r, f1: 120, dur: 0.08, gain: 0.12 });

        // swallow — a soft low "blup" to sell the gulp
        squish(ctx, now + 0.18, {
            f0: 210 * r,
            f1: 70,
            dur: 0.11,
            gain: 0.13,
            type: "sine",
        });
    } catch {
        /* ignore */
    }
}

/** Bumping a wall: a short falling buzz. */
export function playBonk() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
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
    } catch {
        /* ignore */
    }
}
