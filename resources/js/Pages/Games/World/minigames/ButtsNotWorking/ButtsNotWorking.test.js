import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import CastPuppet from "../../components/CastPuppet.vue";
import {
    frame,
    installFrames,
    makeKit,
    restoreFrames,
    run,
} from "../../testing/minigameHarness.js";
import ButtsNotWorking from "./ButtsNotWorking.vue";
import {
    FIXES_PER_POOP,
    FREED_SECONDS,
    ROUND_SECONDS,
    TOOLS,
    WORK_SECONDS,
} from "./useButtsNotWorking.js";

let wrapper;

function mountGame(kit = makeKit()) {
    wrapper = mount(ButtsNotWorking, {
        props: { kit },
        attachTo: document.body,
    });
    return { kit, wrapper };
}

// The button for the tool the Butt is asking for, read from the bubble.
const tool = (name) =>
    wrapper.get(
        `.fix-tool[aria-label="games.world.minigames.butts_not_working_${name}"]`
    );
const asked = () => wrapper.vm.$.setupState.state.need;

beforeEach(() => {
    installFrames();
    vi.spyOn(Math, "random").mockReturnValue(0);
});

afterEach(() => {
    wrapper?.unmount();
    restoreFrames();
});

describe("ButtsNotWorking", () => {
    it("lays out the toolbox, focuses its first tool and says what's needed", async () => {
        const { kit } = mountGame();
        expect(wrapper.findAll(".fix-tool")).toHaveLength(TOOLS.length);
        expect(document.activeElement).toBe(tool(TOOLS[0]).element);
        expect(wrapper.findComponent(CastPuppet).exists()).toBe(true);

        frame();
        expect(kit.speak).toHaveBeenCalledWith(
            `games.world.minigames.butts_not_working_${asked()}!`
        );
    });

    it("sounds a wrong tool and says again what's needed", async () => {
        const { kit } = mountGame();
        frame();
        const wrong = TOOLS.find((name) => name !== asked());
        await tool(wrong).trigger("click");

        expect(kit.playSound).toHaveBeenCalledWith("thud");
        expect(kit.speak).toHaveBeenLastCalledWith(
            "games.world.minigames.butts_not_working_wrong"
        );
    });

    it("toots the poop out after enough fixes, and finishes with the score", async () => {
        const { kit } = mountGame();
        frame();
        for (let fix = 0; fix < FIXES_PER_POOP; fix++) {
            await tool(asked()).trigger("click");
            run(fix < FIXES_PER_POOP - 1 ? WORK_SECONDS + 0.05 : 0.05);
        }
        expect(kit.toot).toHaveBeenCalledWith("butt", { x: 0.5, y: 0.45 });
        await nextTick();
        // Out it comes, big, with a fanfare.
        expect(wrapper.find(".fix-freed").exists()).toBe(true);
        expect(wrapper.find(".fix-poop").exists()).toBe(false);
        expect(kit.playSound).toHaveBeenCalledWith("fanfare");
        expect(kit.speak).toHaveBeenCalledWith(
            "games.world.minigames.butts_not_working_freed"
        );
        expect(
            wrapper.get('[role="progressbar"]').attributes("aria-valuenow")
        ).toBe(String(FIXES_PER_POOP));

        run(FREED_SECONDS + 0.1);
        run(ROUND_SECONDS + 1);
        expect(kit.finish).toHaveBeenCalledWith({ score: 1 });
    });
});
