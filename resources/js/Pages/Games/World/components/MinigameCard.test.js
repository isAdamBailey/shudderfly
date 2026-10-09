import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import {
    speakGameIntro,
    stopGameIntroSpeech,
} from "@/composables/useGameIntroSpeech";
import MinigameCard from "./MinigameCard.vue";
import TootCatch from "../minigames/TootCatch/TootCatch.vue";

vi.mock("@/Components/ShareToChatButton.vue", () => ({
    default: {
        name: "ShareToChatButton",
        template: '<div class="share-stub" />',
        props: ["gameSlug", "score"],
    },
}));

vi.mock("@/composables/useGameIntroSpeech", () => ({
    speakGameIntro: vi.fn(),
    stopGameIntroSpeech: vi.fn(),
}));

const toot = vi.hoisted(() => ({ fn: null, unlock: null }));
vi.mock("@/composables/useToot", async (importOriginal) => {
    const real = await importOriginal();
    return {
        ...real,
        useToot: (url) => {
            const kit = real.useToot(url);
            toot.fn = vi.spyOn(kit, "toot");
            toot.unlock = vi.spyOn(kit, "unlock").mockImplementation(() => {});
            return kit;
        },
    };
});

const item = {
    id: "toot-catch",
    type: "minigame",
    minigame: "toot-catch",
    emoji: "🧺",
    label: "Toot Catch",
    line: "Catch them!",
};

let wrapper;

async function mountCard() {
    wrapper = mount(MinigameCard, { props: { item }, attachTo: document.body });
    await nextTick();
    return wrapper;
}

/** Plays: the async minigame loads, and its kit is returned. */
async function play() {
    await wrapper.get(".minigame-play").trigger("click");
    await flushPromises();
    return wrapper.getComponent(TootCatch).props("kit");
}

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => wrapper?.unmount());

describe("MinigameCard", () => {
    it("says what the game is as it opens, with Play focused", async () => {
        await mountCard();
        await nextTick();

        expect(wrapper.get("h2").text()).toBe("Toot Catch");
        expect(wrapper.text()).toContain("Catch them!");
        expect(speakGameIntro).toHaveBeenCalledWith("Toot Catch. Catch them!");
        expect(document.activeElement).toBe(
            wrapper.get(".minigame-play").element
        );
        const dialog = wrapper.get('[role="dialog"]');
        expect(dialog.attributes("aria-modal")).toBe("true");
        expect(dialog.attributes("aria-labelledby")).toBe(
            wrapper.get("h2").attributes("id")
        );
    });

    it("plays the minigame on Play, unlocking its toots", async () => {
        await mountCard();
        const kit = await play();

        expect(toot.unlock).toHaveBeenCalled();
        expect(stopGameIntroSpeech).toHaveBeenCalled();
        expect(wrapper.find(".minigame-box").exists()).toBe(true);
        expect(Object.keys(kit).sort()).toEqual(
            [
                "CastMember",
                "createCastKit",
                "finish",
                "playSound",
                "reducedMotion",
                "speak",
                "toot",
            ].sort()
        );
        expect(kit.reducedMotion.value).toBe(false);
    });

    it("toots through the one toot, the puff where the minigame says", async () => {
        await mountCard();
        const kit = await play();

        kit.toot("grapes", { x: 0.25, y: 0.5 });
        await nextTick();

        expect(toot.fn).toHaveBeenCalledWith("grapes", { x: 0.25, y: 0.5 });
        const puff = wrapper.get(".minigame-box .toot-puff");
        expect(puff.attributes("style")).toContain("left: 25%");
        expect(puff.attributes("style")).toContain("top: 50%");
    });

    it("gives the score when it finishes, and another go starts afresh", async () => {
        await mountCard();
        const kit = await play();
        const first = wrapper.getComponent(TootCatch).vm;

        kit.finish({ score: 7 });
        await nextTick();
        await nextTick();

        expect(wrapper.find(".minigame-box").exists()).toBe(false);
        const words = "games.world.minigames.score".replace(":score", 7);
        expect(wrapper.get(".minigame-score").text()).toBe(words);
        expect(speakGameIntro).toHaveBeenLastCalledWith(words);
        expect(wrapper.get(".minigame-play").text()).toBe(
            "games.world.minigames.play_again"
        );
        expect(document.activeElement).toBe(
            wrapper.get(".minigame-play").element
        );

        await play();
        expect(wrapper.getComponent(TootCatch).vm === first).toBe(false);
    });

    it("offers to share the score to the chat once it's over", async () => {
        await mountCard();
        expect(wrapper.findComponent({ name: "ShareToChatButton" }).exists()).toBe(
            false
        );

        const kit = await play();
        kit.finish({ score: 7 });
        await nextTick();

        const share = wrapper.getComponent({ name: "ShareToChatButton" });
        expect(share.props()).toEqual({ gameSlug: "toot-catch", score: 7 });
    });

    it("closes on Escape and on its close button, even mid-game", async () => {
        await mountCard();
        await wrapper.get('[role="dialog"]').trigger("keydown.esc");
        expect(wrapper.emitted("cancel")).toHaveLength(1);

        await play();
        await wrapper.get(".minigame-close").trigger("click");
        expect(wrapper.emitted("cancel")).toHaveLength(2);
    });

    it("closes on the backdrop, but not mid-game", async () => {
        await mountCard();
        await play();
        await wrapper.get('[role="dialog"]').trigger("click");
        expect(wrapper.emitted("cancel")).toBeUndefined();

        wrapper.getComponent(TootCatch).props("kit").finish({ score: 0 });
        await nextTick();
        await wrapper.get('[role="dialog"]').trigger("click");
        expect(wrapper.emitted("cancel")).toHaveLength(1);
    });

    it("stops talking when it closes", async () => {
        await mountCard();
        vi.clearAllMocks();
        wrapper.unmount();
        wrapper = null;

        expect(stopGameIntroSpeech).toHaveBeenCalled();
    });
});
