import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.vue";
import { TOTAL_SPROUTS } from "./composables/useSproutGame.js";

let wrapper;
let kit;

async function play() {
    kit = { toot: vi.fn(), playSound: vi.fn(), finish: vi.fn() };
    wrapper = mount(App, {
        props: { kit },
        attachTo: document.body,
        global: { stubs: { PersonFace: true, AimGuide: true } },
    });
    await vi.advanceTimersByTimeAsync(0);
}

async function fling() {
    await wrapper.get("button.sprout").trigger("keydown", { key: "Enter" });
    await vi.advanceTimersByTimeAsync(6000);
}

describe("Brussels Sprout Chicken Pox", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        wrapper?.unmount();
        vi.useRealTimers();
    });

    it("flicks through the world and keeps the sprout focusable in flight", async () => {
        await play();
        const sprout = wrapper.get("button.sprout");
        sprout.element.focus();

        await sprout.trigger("keydown", { key: "Enter" });

        expect(kit.playSound).toHaveBeenCalledWith("whoosh");
        expect(sprout.attributes("disabled")).toBeUndefined();
        expect(sprout.attributes("aria-disabled")).toBe("true");
        expect(document.activeElement).toBe(sprout.element);
    });

    it("hands the score to the world when the sprouts run out", async () => {
        await play();

        for (let shot = 0; shot < TOTAL_SPROUTS; shot++) await fling();

        expect(kit.finish).toHaveBeenCalledOnce();
        expect(kit.finish).toHaveBeenCalledWith({
            score: expect.any(Number),
        });
        // Every shot either popped a pox or missed, through the world.
        const sounds = kit.playSound.mock.calls.map(([name]) => name);
        expect(
            sounds.filter((name) => name === "pop" || name === "thud")
        ).toHaveLength(TOTAL_SPROUTS);
    });
});
