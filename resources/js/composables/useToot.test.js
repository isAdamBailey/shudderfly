import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useToot, tootPitch, PUFF_MS } from "./useToot.js";

// The sample is cloned per toot and played at the toot's pitch.
let played;
// Whether the browser lets the sample play (autoplay rules).
let allowed;

beforeEach(() => {
    played = [];
    allowed = true;
    vi.useFakeTimers();
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(
        function () {
            if (!allowed) return Promise.reject(new Error("NotAllowedError"));
            played.push(this.playbackRate);
            return Promise.resolve();
        }
    );
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

/** useToot inside a component, as it would be used. */
function mountToot() {
    let toot;
    mount({
        setup() {
            toot = useToot("/fart.m4a");
            return () => null;
        },
    });
    return toot;
}

describe("tootPitch", () => {
    it("is the character's own pitch", () => {
        expect(tootPitch("blueberries")).toBe(1.4);
        expect(tootPitch("sprout")).toBe(0.78);
        expect(tootPitch("cockroach")).toBe(1.5);
    });

    it("is the sample's own pitch for a character that doesn't toot", () => {
        expect(tootPitch("toilet")).toBe(1);
        expect(tootPitch("nobody")).toBe(1);
    });
});

describe("useToot", () => {
    it("plays the sample at the character's pitch once unlocked", async () => {
        const { toot, unlock } = mountToot();
        unlock();
        await vi.runAllTimersAsync();
        played = [];

        toot("grapes");

        expect(played).toEqual([1.22]);
    });

    it("only unlocks once it has worked", async () => {
        const { unlock } = mountToot();
        unlock();
        unlock();
        await vi.runAllTimersAsync();
        unlock();
        await vi.runAllTimersAsync();

        expect(played).toHaveLength(1);
    });

    it("tries again on the next gesture if the browser said no", async () => {
        const { unlock } = mountToot();
        allowed = false;
        unlock();
        await vi.runAllTimersAsync();

        allowed = true;
        unlock();
        await vi.runAllTimersAsync();

        expect(played).toHaveLength(1);
    });

    it("doesn't load the sample until it's needed", () => {
        const load = vi.spyOn(window, "Audio");

        const { toot } = mountToot();
        expect(load).not.toHaveBeenCalled();

        toot("butt");
        expect(load).toHaveBeenCalledOnce();
    });

    it("shows a puff where it happened, then clears it", () => {
        const { toot, puffs } = mountToot();

        toot("butt", { x: 300, y: 40 });

        expect(puffs.value).toEqual([{ id: 1, x: 300, y: 40 }]);
        vi.advanceTimersByTime(PUFF_MS);
        expect(puffs.value).toEqual([]);
    });

    it("shows no puff when told no place", () => {
        const { toot, puffs } = mountToot();

        toot("butt");

        expect(puffs.value).toEqual([]);
    });
});
