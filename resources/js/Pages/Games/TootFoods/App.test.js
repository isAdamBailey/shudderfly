import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.vue";
import { ROUND_SECONDS } from "./composables/useTootGame.js";

let wrapper;

describe("Toot Foods", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        wrapper?.unmount();
        vi.useRealTimers();
    });

    it("starts at once and hands its score to the world when time runs out", async () => {
        const kit = { toot: vi.fn(), finish: vi.fn() };
        wrapper = mount(App, {
            props: { kit },
            attachTo: document.body,
            global: { stubs: { CastMember: true } },
        });
        await vi.advanceTimersByTimeAsync(0);

        expect(wrapper.find(".toot-stage").exists()).toBe(true);

        await vi.advanceTimersByTimeAsync((ROUND_SECONDS + 1) * 1000);

        expect(kit.finish).toHaveBeenCalledWith({ score: 0 });
    });

    it("toots through the world as the fed food, and keeps focus in the game", async () => {
        const kit = { toot: vi.fn(), finish: vi.fn() };
        wrapper = mount(App, {
            props: { kit },
            attachTo: document.body,
            global: { stubs: { CastMember: true } },
        });
        await vi.advanceTimersByTimeAsync(0);

        const food = wrapper.find("button.food");
        const type = wrapper.vm.$.setupState.foods.find(
            (f) => f.emoji === food.text()
        ).type;
        await food.trigger("keydown", { key: "Enter" });

        expect(kit.toot).toHaveBeenCalledWith(type);
        expect(document.activeElement).toBe(wrapper.get(".toot-stage").element);
    });
});
