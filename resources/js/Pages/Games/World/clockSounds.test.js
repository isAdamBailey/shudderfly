import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    chimesBetween,
    dongLevel,
    playBell,
    playChime,
    playTick,
    TUNE,
    tickLevel,
} from "./clockSounds.js";

const oscillators = [];

function node() {
    return {
        connect: vi.fn(function connect(to) {
            return to;
        }),
    };
}

vi.mock("@/composables/useAudioContext", () => ({
    getAudioContext: () => ({
        currentTime: 0,
        destination: {},
        createOscillator: () => {
            const osc = {
                ...node(),
                type: "",
                frequency: {
                    value: 0,
                    setValueAtTime: vi.fn(),
                    exponentialRampToValueAtTime: vi.fn(),
                },
                start: vi.fn(),
                stop: vi.fn(),
            };
            oscillators.push(osc);
            return osc;
        },
        createGain: () => ({
            ...node(),
            gain: {
                value: 0,
                setValueAtTime: vi.fn(),
                exponentialRampToValueAtTime: vi.fn(),
            },
        }),
        createBiquadFilter: () => ({
            ...node(),
            type: "",
            frequency: { value: 0 },
        }),
    }),
}));

describe("clock sounds", () => {
    beforeEach(() => {
        oscillators.length = 0;
    });

    it("ticks with one short click", () => {
        playTick();

        expect(oscillators).toHaveLength(1);
        expect(oscillators[0].start).toHaveBeenCalled();
        expect(oscillators[0].stop).toHaveBeenCalled();
    });

    it("makes no tick too quiet to hear", () => {
        playTick(0);

        expect(oscillators).toHaveLength(0);
    });

    it("chimes a bell from several partials", () => {
        playBell();

        expect(oscillators.length).toBeGreaterThan(1);
        for (const osc of oscillators) {
            expect(osc.start).toHaveBeenCalled();
        }
    });

    it("dongs a low gong from several partials", () => {
        const [dong] = chimesBetween(9, 10, { chime: 10, tune: 4 });
        playChime(dong);

        expect(oscillators.length).toBeGreaterThan(1);
        expect(oscillators[0].frequency.value).toBeLessThan(200);
        for (const osc of oscillators) {
            expect(osc.start).toHaveBeenCalled();
        }
    });

    it("makes no dong too quiet to hear", () => {
        const [dong] = chimesBetween(9, 10, { chime: 10, tune: 4 });
        playChime(dong, 0);

        expect(oscillators).toHaveLength(0);
    });
});

describe("a grandfather clock's chimes", () => {
    const CLOCK = { chime: 10, tune: 4 };
    const DONG = chimesBetween(9, 10, CLOCK)[0];

    it("dongs once on each chime's turn, and nothing between", () => {
        expect(chimesBetween(9.9, 10.1, CLOCK)).toEqual([DONG]);
        expect(chimesBetween(10.1, 19.9, CLOCK)).toEqual([]);
        expect(chimesBetween(19.9, 20, CLOCK)).toEqual([DONG]);
    });

    it("plays its tune on every fourth, a note at a time, then the dong", () => {
        const sung = chimesBetween(39.9, 47, CLOCK);

        expect(sung).toHaveLength(TUNE.length + 1);
        expect(sung.at(-1)).toEqual(DONG);
        expect(sung[0].note).toBeGreaterThan(DONG.note);
        expect(sung[0].loud).toBeLessThan(DONG.loud);
        // Only the notes due yet: the first, at the turn.
        expect(chimesBetween(39.9, 40.1, CLOCK)).toEqual([sung[0]]);
        // Split across frames, every note is struck once.
        const frames = [];
        for (let t = 39.9; t < 47; t += 0.016) {
            frames.push(...chimesBetween(t, t + 0.016, CLOCK));
        }
        expect(frames).toEqual(sung);
    });

    it("only dongs, with no tune of its own", () => {
        expect(chimesBetween(39.9, 47, { chime: 10 })).toEqual([DONG]);
    });
});

describe("a clock ticking in a room", () => {
    it("is loudest beside it and fades to nothing across the room", () => {
        expect(tickLevel(0)).toBeGreaterThan(tickLevel(300));
        expect(tickLevel(300)).toBeGreaterThan(tickLevel(600));
        expect(tickLevel(5000)).toBe(0);
    });

    it("dongs louder than it ticks, and further across the room", () => {
        expect(dongLevel(0)).toBeGreaterThan(tickLevel(0));
        expect(dongLevel(1200)).toBeGreaterThan(0);
        expect(dongLevel(5000)).toBe(0);
    });
});
