import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, reactive, ref } from "vue";
import App from "./App.vue";

// The intestine run, held still so a test can finish it.
const intestine = vi.hoisted(() => ({ state: null }));

vi.mock("./composables/useGameState.js", () => ({
    useGameState: () => {
        intestine.state = reactive({ phase: "start", score: 0, collisions: 0 });
        return {
            state: intestine.state,
            segments: ref([]),
            totalHeight: ref(0),
            elapsedSeconds: ref(0),
            progress: ref(0),
            startGame: () => {
                intestine.state.phase = "playing";
            },
            movePoop: vi.fn(),
            getPassageAt: vi.fn(),
            POOP_RADIUS: 10,
        };
    },
}));

let wrapper;
let kit;

async function play() {
    kit = { toot: vi.fn(), playSound: vi.fn(), finish: vi.fn() };
    wrapper = mount(App, {
        props: { kit },
        attachTo: document.body,
        global: { stubs: { PersonFace: true, GameBoard: true } },
    });
    await vi.advanceTimersByTimeAsync(0);
}

async function feedEverything() {
    for (const slice of wrapper.findAll("button.slice")) {
        await slice.trigger("keydown", { key: "Enter" });
    }
}

describe("Costco Food Poop", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        wrapper?.unmount();
        vi.useRealTimers();
    });

    it("starts at once and chomps through the world", async () => {
        await play();

        await wrapper.find("button.slice").trigger("keydown", { key: "Enter" });

        expect(kit.playSound).toHaveBeenCalledWith("chomp");
    });

    it("keeps keyboard focus in the game as the food goes", async () => {
        await play();

        await wrapper.find("button.slice").trigger("keydown", { key: "Enter" });
        expect(document.activeElement).toBe(
            wrapper.get(".game-container").element
        );

        await feedEverything();
        await nextTick();
        expect(document.activeElement).toBe(
            wrapper.get(".intestine-wrap").element
        );
    });

    it("bonks through the world when the poop hits a wall", async () => {
        await play();
        await feedEverything();
        await vi.advanceTimersByTimeAsync(5000);

        intestine.state.collisions = 1;
        await nextTick();

        expect(kit.playSound).toHaveBeenCalledWith("bonk");
    });

    it("toots the poop out and hands the score to the world", async () => {
        await play();
        await feedEverything();

        intestine.state.score = 640;
        intestine.state.phase = "win";
        await nextTick();

        expect(kit.toot).toHaveBeenCalledWith("poop");
        expect(kit.finish).toHaveBeenCalledWith({ score: 640 });
    });
});
