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

function mountCard(props = { game }) {
    return mount(GameConfirmCard, {
        props,
        attachTo: document.body,
        global: {
            provide: { route: global.route },
            // The shared Inertia Link stub renders a bare <a>; give it a real
            // href so focus behaves the way it does in the browser.
            stubs: {
                Link: {
                    name: "Link",
                    props: ["href"],
                    template: '<a :href="href"><slot /></a>',
                },
            },
        },
    });
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("GameConfirmCard", () => {
    it("draws a landmark that is a cast member as that character", () => {
        const wrapper = mountCard({
            game: { ...game, landmark: undefined, cast: "toilet" },
        });

        expect(wrapper.get(".cast-toilet").text()).toBe("🚽");
    });

    it("renders the game name, description and emoji", () => {
        const wrapper = mountCard();
        expect(wrapper.text()).toContain(game.name);
        expect(wrapper.text()).toContain(game.description);
        expect(wrapper.text()).toContain(game.emoji);
    });

    it("links Play to the game route", () => {
        const wrapper = mountCard();
        const link = wrapper.findComponent({ name: "Link" });
        expect(link.props("href")).toBe("/games/sprout-pox");
    });

    it("plays a hosted game here instead of linking to its page", async () => {
        const start = vi.fn();
        const wrapper = mountCard({ game, start });

        expect(wrapper.findComponent({ name: "Link" }).exists()).toBe(false);
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
            wrapper.findComponent({ name: "Link" }).element
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
