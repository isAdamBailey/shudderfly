import { beforeEach, describe, expect, it, vi } from "vitest";
import { playBell, playTick, tickLevel } from "./clockSounds.js";

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
});

describe("a clock ticking in a room", () => {
    it("is loudest beside it and fades to nothing across the room", () => {
        expect(tickLevel(0)).toBeGreaterThan(tickLevel(300));
        expect(tickLevel(300)).toBeGreaterThan(tickLevel(600));
        expect(tickLevel(5000)).toBe(0);
    });
});
