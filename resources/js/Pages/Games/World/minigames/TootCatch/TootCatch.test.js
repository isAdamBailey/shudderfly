import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";
import CastMember from "@/Components/Games/Cast/CastMember.vue";
import TootCatch from "./TootCatch.vue";
import { BUTT_Y, ROUND_SECONDS } from "./useTootCatch.js";

// Frames by hand: each requestAnimationFrame callback waits for frame().
let frames = [];
let now = 0;

function frame(seconds = 1 / 60) {
    now += seconds * 1000;
    const due = frames;
    frames = [];
    due.forEach((callback) => callback(now));
}

function run(seconds) {
    for (let t = 0; t < seconds; t += 1 / 60) frame();
}

function makeKit(reduced = false) {
    return {
        CastMember,
        createCastKit: vi.fn(),
        toot: vi.fn(),
        speak: vi.fn(),
        playSound: vi.fn(),
        reducedMotion: ref(reduced),
        finish: vi.fn(),
    };
}

let wrapper;

function mountGame(kit = makeKit()) {
    wrapper = mount(TootCatch, { props: { kit }, attachTo: document.body });
    return { kit, wrapper };
}

beforeEach(() => {
    frames = [];
    now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubGlobal("requestAnimationFrame", (callback) => {
        frames.push(callback);
        return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {
        frames = [];
    });
    // Every food drops in the middle, where the Butt starts.
    vi.spyOn(Math, "random").mockReturnValue(0.5);
});

afterEach(() => {
    wrapper?.unmount();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("TootCatch", () => {
    it("takes focus, and draws the Butt and the falling foods from the cast", async () => {
        mountGame();
        expect(document.activeElement).toBe(wrapper.get(".catch-field").element);
        expect(wrapper.get(".catch-field").attributes("aria-label")).toBe(
            "games.world.minigames.toot_catch_aria"
        );

        run(1);
        await nextTick();

        expect(wrapper.find(".cast-butt").exists()).toBe(true);
        expect(wrapper.findAll(".catch-spot .cast-member")).toHaveLength(2);
    });

    it("toots as each food it catches, at the Butt", () => {
        const { kit } = mountGame();
        run(5);

        expect(kit.toot).toHaveBeenCalled();
        const [castId, at] = kit.toot.mock.calls[0];
        expect(castId).toBe("taco");
        expect(at).toEqual({ x: expect.closeTo(0.5, 1), y: BUTT_Y });
    });

    it("moves the Butt on the arrow keys", async () => {
        mountGame();
        const field = wrapper.get(".catch-field");
        const butt = () => field.findAll(".catch-spot").at(-1);
        const start = butt().attributes("style");

        await field.trigger("keydown", { key: "ArrowRight" });
        run(0.3);
        await field.trigger("keyup", { key: "ArrowRight" });
        await nextTick();

        expect(butt().attributes("style")).not.toBe(start);
        expect(butt().attributes("style")).toMatch(/translate\(\d+(\.\d+)?%/);
    });

    it("finishes with the score once the round is up, and stops", () => {
        const { kit } = mountGame();
        run(ROUND_SECONDS + 0.5);

        expect(kit.finish).toHaveBeenCalledTimes(1);
        const { score } = kit.finish.mock.calls[0][0];
        expect(score).toBe(kit.toot.mock.calls.length);
        expect(score).toBeGreaterThan(0);
        expect(frames).toHaveLength(0);
    });

    it("keeps the Butt still under reduced motion", async () => {
        mountGame(makeKit(true));
        await nextTick();

        expect(wrapper.find(".cast-butt").classes()).not.toContain(
            "cast-move-idle"
        );
    });
});
