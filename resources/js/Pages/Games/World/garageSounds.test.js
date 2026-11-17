import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    playGarageBeep,
    playGarageClick,
    playGarageClunk,
    startGarageHum,
} from "./garageSounds.js";

const oscillators = [];

function node() {
    return {
        connect: vi.fn(function connect(to) {
            return to;
        }),
    };
}

const param = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
});

vi.mock("@/composables/useAudioContext", () => ({
    getAudioContext: () => ({
        currentTime: 0,
        destination: {},
        createOscillator: () => {
            const osc = {
                ...node(),
                type: "",
                frequency: param(),
                start: vi.fn(),
                stop: vi.fn(),
            };
            oscillators.push(osc);
            return osc;
        },
        createGain: () => ({ ...node(), gain: param() }),
        createBiquadFilter: () => ({
            ...node(),
            type: "",
            frequency: { value: 0 },
        }),
    }),
}));

describe("garage sounds", () => {
    beforeEach(() => {
        oscillators.length = 0;
    });

    it("clicks, beeps and clunks, each sound ending by itself", () => {
        playGarageClick();
        playGarageBeep();
        playGarageClunk();

        expect(oscillators.length).toBeGreaterThan(0);
        for (const osc of oscillators) {
            expect(osc.start).toHaveBeenCalled();
            expect(osc.stop).toHaveBeenCalled();
        }
    });

    it("beeps higher for an Enter that opens", () => {
        playGarageBeep();
        playGarageBeep(true);

        expect(oscillators[1].frequency.value).toBeGreaterThan(
            oscillators[0].frequency.value
        );
    });

    it("hums until it's stopped", () => {
        const stop = startGarageHum();

        expect(oscillators.every((osc) => !osc.stop.mock.calls.length)).toBe(
            true
        );
        stop();
        for (const osc of oscillators) {
            expect(osc.stop).toHaveBeenCalledTimes(1);
        }
    });
});
