// The Cockroach's music room, in Web Audio: a stone hall every note there
// plays into, the organ's, the harp's and the drum's, with its echo after
// it.

// How long its echo rings, s, and how much of it you hear.
const HALL = { seconds: 2.6, wet: 0.45 };

// Made once per audio context.
let made = null;

/** The hall's input in audio context `ctx`: connect a note to it. */
export function stoneHall(ctx) {
    if (made?.ctx === ctx) return made.input;

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

    made = { ctx, input };
    return input;
}
