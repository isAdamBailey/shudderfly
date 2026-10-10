import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { speakGameIntro } from "@/composables/useGameIntroSpeech";
import GameHost from "./GameHost.vue";

vi.mock("@/Components/ShareToChatButton.vue", () => ({
    default: {
        name: "ShareToChatButton",
        template: '<div class="share-stub" />',
        props: ["gameSlug", "score", "inWorld"],
    },
}));

vi.mock("@/composables/useGameIntroSpeech", () => ({
    speakGameIntro: vi.fn(),
    stopGameIntroSpeech: vi.fn(),
}));

const mounts = vi.hoisted(() => ({ n: 0 }));

vi.mock("../hostedGames.js", () => ({
    HOSTED_GAMES: ["cockroach"],
    hostedGame: () => () =>
        Promise.resolve({
            name: "CockroachApp",
            props: ["kit"],
            template: '<div class="hosted-cockroach" />',
            mounted() {
                mounts.n += 1;
            },
        }),
}));

vi.mock("@/composables/useToot", async (importOriginal) => {
    const real = await importOriginal();
    return {
        ...real,
        useToot: (url) => {
            const kit = real.useToot(url);
            vi.spyOn(kit, "unlock").mockImplementation(() => {});
            return kit;
        },
    };
});

const game = {
    slug: "cockroach",
    name: "Cockroach Fart",
    emoji: "🪳",
    landmark: "🏚️",
    description: "Hiss it to the toilet",
};

let wrapper;

async function mountHost() {
    wrapper = mount(GameHost, {
        props: { game },
        attachTo: document.body,
    });
    await flushPromises();
    await nextTick();
    return wrapper;
}

beforeEach(() => {
    vi.clearAllMocks();
    mounts.n = 0;
});

afterEach(() => wrapper?.unmount());

describe("GameHost", () => {
    it("mounts the game over the world and closes back from there", async () => {
        await mountHost();

        expect(wrapper.get(".hosted-cockroach").exists()).toBe(true);
        expect(wrapper.get(".game-host-panel").classes()).toContain("max-w-lg");
        expect(
            wrapper.get(".game-host-play").find(".game-host-close").exists()
        ).toBe(false);
        expect(wrapper.find(".game-host-score").exists()).toBe(false);
        expect(document.activeElement).toBe(
            wrapper.get(".game-host-close").element
        );

        await wrapper.get(".game-host-close").trigger("click");
        expect(wrapper.emitted("cancel")).toHaveLength(1);
    });

    it("does not close on a tap while the game is playing", async () => {
        await mountHost();
        await wrapper.get(".game-host").trigger("click");
        expect(wrapper.emitted("cancel")).toBeUndefined();
    });

    it("shows the score, speaks it, and shares it as a minigame", async () => {
        await mountHost();
        wrapper.getComponent({ name: "CockroachApp" }).props("kit").finish({
            score: 40,
        });
        await nextTick();

        const words = "games.world.score".replace(":score", 40);
        expect(wrapper.get(".game-host-points").text()).toBe(words);
        expect(speakGameIntro).toHaveBeenCalledWith(words);
        const share = wrapper.getComponent({ name: "ShareToChatButton" });
        expect(share.props()).toEqual({
            gameSlug: "cockroach",
            score: 40,
            inWorld: true,
        });
    });

    it("plays again by mounting the game afresh", async () => {
        await mountHost();
        const kit = wrapper.getComponent({ name: "CockroachApp" }).props("kit");
        kit.finish({ score: 40 });
        await nextTick();

        await wrapper.get(".game-host-again").trigger("click");
        await flushPromises();

        expect(wrapper.find(".hosted-cockroach").exists()).toBe(true);
        expect(mounts.n).toBe(2);
    });

    it("closes the score on Escape, the backdrop, and All done", async () => {
        await mountHost();
        wrapper.getComponent({ name: "CockroachApp" }).props("kit").finish({
            score: 0,
        });
        await nextTick();

        await wrapper.get(".game-host").trigger("keydown.esc");
        expect(wrapper.emitted("cancel")).toHaveLength(1);

        await wrapper.get(".game-host").trigger("click");
        expect(wrapper.emitted("cancel")).toHaveLength(2);

        await wrapper.get(".game-host-done").trigger("click");
        expect(wrapper.emitted("cancel")).toHaveLength(3);
    });
});
