import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import {
    installFrames,
    makeKit,
    restoreFrames,
    run,
} from "../../testing/minigameHarness.js";
import TootSlots from "./TootSlots.vue";
import { LINGER_WON, REEL_STOPS, SPINS } from "./useTootSlots.js";

let wrapper;

function mountGame(kit = makeKit()) {
    wrapper = mount(TootSlots, { props: { kit }, attachTo: document.body });
    return { kit, wrapper };
}

beforeEach(() => {
    installFrames();
    // Every pull is a jackpot.
    vi.spyOn(Math, "random").mockReturnValue(0);
});

afterEach(() => {
    wrapper?.unmount();
    restoreFrames();
});

describe("TootSlots", () => {
    it("puts focus on the lever, and shows three reels of the cast", () => {
        mountGame();
        const lever = wrapper.get(".slots-lever");

        expect(document.activeElement).toBe(lever.element);
        expect(lever.attributes("aria-label")).toBe(
            "games.world.minigames.toot_slots_lever"
        );
        expect(wrapper.findAll(".slots-reel .cast-guster")).toHaveLength(3);
    });

    it("spins on a pull of the lever, and toots for three Gusters", async () => {
        const { kit } = mountGame();

        await wrapper.get(".slots-lever").trigger("click");
        expect(kit.playSound).toHaveBeenCalledWith("whoosh");
        await nextTick();
        expect(wrapper.findAll(".slots-reel-spinning")).toHaveLength(3);

        run(REEL_STOPS[2] + 0.1);
        await nextTick();

        expect(wrapper.findAll(".slots-reel-spinning")).toHaveLength(0);
        expect(kit.playSound).toHaveBeenCalledWith("tick");
        expect(kit.playSound).toHaveBeenCalledWith("fanfare");
        expect(kit.toot).toHaveBeenCalledWith("guster", expect.any(Object));
        expect(kit.speak).toHaveBeenCalledWith(
            "games.world.minigames.toot_slots_win"
        );
        expect(wrapper.get(".slots-machine").classes()).toContain("slots-won");
    });

    it("pulls on a tap of the machine too", async () => {
        const { kit } = mountGame();

        await wrapper.get(".slots-machine").trigger("click");

        expect(kit.playSound).toHaveBeenCalledWith("whoosh");
    });

    it("finishes with the wins once every spin is used, and stops", async () => {
        const { kit } = mountGame();

        for (let i = 0; i < SPINS; i++) {
            await wrapper.get(".slots-lever").trigger("click");
            run(REEL_STOPS[2] + 0.1);
        }
        run(LINGER_WON + 0.1);

        expect(kit.finish).toHaveBeenCalledTimes(1);
        expect(kit.finish).toHaveBeenCalledWith({ score: SPINS });
        expect(frames).toHaveLength(0);
    });
});
