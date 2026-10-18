import { getAudioContext } from "@/composables/useAudioContext";
import { stoneHall } from "./stoneHall.js";

// The Cockroach's bass drum, made in Web Audio: a deep note that drops in
// pitch as the head settles and booms on a long while, the slap of the
// mallet on the skin, into the music room's stone hall (stoneHall.js). Hit
// at the rim, it's higher, shorter and drier: more slap than boom.

// The boom: where its pitch starts and settles, Hz, how fast it drops, s,
// and how long it rings, s; each at the middle of the head, and how much
// a hit at the rim takes the ringing down.
const BOOM = { from: 95, to: 46, drop: 0.12, ring: 2.6, rim: 0.7 };
// How much higher a rim hit's note is, Hz.
const RIM_RISE = 30;
// The slap: noise through a low filter, Hz, lasting this long, s.
const SLAP = { cutoff: 700, life: 0.08 };
// The hit's loudness, under the hall's limiter.
const LEVEL = 0.55;

// The noise the slap is cut from, made once per audio context.
let made = null;

function noiseFor(ctx) {
    if (made?.ctx === ctx) return made.noise;
    const rate = ctx.sampleRate;
    const noise = ctx.createBuffer(1, Math.floor(rate * SLAP.life), rate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    made = { ctx, noise };
    return noise;
}

/** How the drum sounds hit `edge` (0 the middle, 1 the rim) out: its
 * boom's pitch, Hz, from and to, and how long it rings, s. */
export function drumBoom(edge) {
    return {
        from: BOOM.from + RIM_RISE * edge,
        to: BOOM.to + RIM_RISE * edge,
        ring: BOOM.ring * (1 - BOOM.rim * edge),
    };
}

/** Hits the bass drum `edge` (0 to 1) out from the middle of its head. */
export function playDrum(edge = 0) {
    const ctx = getAudioContext();
    if (!ctx) return;
    const input = stoneHall(ctx);
    const t = ctx.currentTime;
    const { from, to, ring } = drumBoom(edge);

    const boom = ctx.createOscillator();
    boom.frequency.setValueAtTime(from, t);
    boom.frequency.exponentialRampToValueAtTime(to, t + BOOM.drop);
    const body = ctx.createGain();
    body.gain.setValueAtTime(0.0001, t);
    body.gain.exponentialRampToValueAtTime(LEVEL, t + 0.008);
    body.gain.exponentialRampToValueAtTime(0.0001, t + ring);
    boom.connect(body);
    body.connect(input);
    boom.start(t);
    boom.stop(t + ring + 0.05);
    // Off the hall once silent, as the organ's pipes are.
    boom.onended = () => body.disconnect();

    const slap = ctx.createBufferSource();
    slap.buffer = noiseFor(ctx);
    const felt = ctx.createBiquadFilter();
    felt.type = "lowpass";
    felt.frequency.value = SLAP.cutoff * (1 + edge);
    const hit = ctx.createGain();
    hit.gain.setValueAtTime(LEVEL * (0.4 + 0.4 * edge), t);
    hit.gain.exponentialRampToValueAtTime(0.0001, t + SLAP.life);
    slap.connect(felt);
    felt.connect(hit);
    hit.connect(input);
    slap.start(t);
    slap.onended = () => hit.disconnect();
}
