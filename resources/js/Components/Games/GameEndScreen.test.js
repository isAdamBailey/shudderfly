import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import GameEndScreen from "./GameEndScreen.vue";

vi.mock("@/Components/ShareToChatButton.vue", () => ({
    default: {
        name: "ShareToChatButton",
        template: '<div class="share-stub" />',
        props: ["gameSlug", "score"],
    },
}));

function mountScreen(props = {}, slots = {}) {
    return mount(GameEndScreen, {
        props: {
            title: "Game Over!",
            score: 42,
            gameSlug: "boom",
            ...props,
        },
        slots,
        global: {
            provide: { route: global.route },
        },
    });
}

describe("GameEndScreen", () => {
    it("renders the title", () => {
        const wrapper = mountScreen({ title: "You Win!" });
        expect(wrapper.text()).toContain("You Win!");
    });

    it("renders the emoji when provided", () => {
        const wrapper = mountScreen({ emoji: "🎉" });
        expect(wrapper.text()).toContain("🎉");
    });

    it("does not render emoji div when not provided", () => {
        const wrapper = mountScreen({ emoji: "" });
        expect(wrapper.find(".game-end-emoji").exists()).toBe(false);
    });

    it("renders the score with correct pluralization", () => {
        const wrapper = mountScreen({ score: 5 });
        expect(wrapper.text()).toContain("5");
        expect(wrapper.text()).toContain("points");
    });

    it("renders singular 'point' for score of 1", () => {
        const wrapper = mountScreen({ score: 1 });
        expect(wrapper.text()).toContain("point");
        expect(wrapper.text()).not.toContain("points");
    });

    it("renders play again button with custom label", () => {
        const wrapper = mountScreen({ playAgainLabel: "Retry" });
        expect(wrapper.find(".game-end-play-again").text()).toBe("Retry");
    });

    it("emits play-again on button pointerdown", async () => {
        const wrapper = mountScreen();
        await wrapper.find(".game-end-play-again").trigger("pointerdown");
        expect(wrapper.emitted("play-again")).toHaveLength(1);
    });

    it("passes gameSlug and score to ShareToChatButton", () => {
        const wrapper = mountScreen({ gameSlug: "cockroach", score: 99 });
        const share = wrapper.findComponent({ name: "ShareToChatButton" });
        expect(share.props("gameSlug")).toBe("cockroach");
        expect(share.props("score")).toBe(99);
    });

    it("renders default slot content", () => {
        const wrapper = mountScreen({}, { default: "<p>Extra info</p>" });
        expect(wrapper.text()).toContain("Extra info");
    });

    it("renders above-score slot content", () => {
        const wrapper = mountScreen({}, { "above-score": "<div>Stars here</div>" });
        expect(wrapper.text()).toContain("Stars here");
    });
});
