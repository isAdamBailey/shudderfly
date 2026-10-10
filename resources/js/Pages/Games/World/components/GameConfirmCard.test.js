import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import GameConfirmCard from "./GameConfirmCard.vue";
import {
    speakGameIntro,
    stopGameIntroSpeech,
} from "@/composables/useGameIntroSpeech";

vi.mock("@/composables/useGameIntroSpeech", () => ({
    speakGameIntro: vi.fn(),
    stopGameIntroSpeech: vi.fn(),
}));

const game = {
    slug: "sprout-pox",
    name: "Sprout Pox",
    emoji: "🥬",
    landmark: "🏥",
    description: "Cure the sprouts.",
};

function mountCard(props = { game, start: vi.fn() }) {
    return mount(GameConfirmCard, { props, attachTo: document.body });
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("GameConfirmCard", () => {
    it("draws a landmark that is a cast member as that character", () => {
        const wrapper = mountCard({
            game: { ...game, landmark: undefined, cast: "toilet" },
            start: vi.fn(),
        });

        expect(wrapper.get(".cast-toilet").text()).toBe("🚽");
    });

    it("renders the game name, description and emoji", () => {
        const wrapper = mountCard();
        expect(wrapper.text()).toContain(game.name);
        expect(wrapper.text()).toContain(game.description);
        expect(wrapper.text()).toContain(game.emoji);
    });

    it("plays the game here when Play is pressed", async () => {
        const start = vi.fn();
        const wrapper = mountCard({ game, start });

        await wrapper.get(".world-card-action").trigger("click");
        expect(start).toHaveBeenCalledOnce();
    });

    it("is a labelled modal dialog", () => {
        const wrapper = mountCard();
        const dialog = wrapper.get('[role="dialog"]');
        expect(dialog.attributes("aria-modal")).toBe("true");
        expect(dialog.attributes("aria-labelledby")).toBe(
            wrapper.get("h2").attributes("id")
        );
    });

    it("emits cancel on Escape", async () => {
        const wrapper = mountCard();
        await wrapper.get('[role="dialog"]').trigger("keydown.esc");
        expect(wrapper.emitted("cancel")).toHaveLength(1);
    });

    it("emits cancel on backdrop click", async () => {
        const wrapper = mountCard();
        await wrapper.get('[role="dialog"]').trigger("click");
        expect(wrapper.emitted("cancel")).toHaveLength(1);
    });

    it("does not emit cancel when the panel itself is clicked", async () => {
        const wrapper = mountCard();
        await wrapper.get(".world-card-panel").trigger("click");
        expect(wrapper.emitted("cancel")).toBeUndefined();
    });

    it("emits cancel from the cancel button", async () => {
        const wrapper = mountCard();
        await wrapper.get(".world-card-cancel").trigger("click");
        expect(wrapper.emitted("cancel")).toHaveLength(1);
    });
});

describe("GameConfirmCard focus", () => {
    it("moves focus to Play on open", async () => {
        const wrapper = mountCard();
        // One tick flushes the mount, the second the focus call onMounted
        // schedules on top of it.
        await nextTick();
        await nextTick();
        expect(document.activeElement).toBe(
            wrapper.get(".world-card-action").element
        );
    });
});

describe("GameConfirmCard speech", () => {
    it("speaks the name and description as it opens, with no Listen button", () => {
        const wrapper = mountCard();

        expect(wrapper.find(".confirm-speak").exists()).toBe(false);
        expect(speakGameIntro).toHaveBeenCalledWith(
            "Sprout Pox. Cure the sprouts."
        );

        wrapper.unmount();
        expect(stopGameIntroSpeech).toHaveBeenCalled();
    });
});
