import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, reactive, ref } from "vue";
import App from "./App.vue";
import FoodIcon from "./components/FoodIcon.vue";
import { FEED_COUNT, FOODS } from "./composables/foods.js";

// The intestine run, held still so a test can finish it.
const intestine = vi.hoisted(() => ({ state: null }));

vi.mock("./composables/useGameState.js", () => ({
    useGameState: () => {
        intestine.state = reactive({ phase: "start", score: 0, collisions: 0 });
        return {
            state: intestine.state,
            elapsedSeconds: ref(0),
            progress: ref(0),
            startGame: () => {
                intestine.state.phase = "playing";
            },
            movePoop: vi.fn(),
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

const kinds = () =>
    wrapper
        .findAll("button.slice")
        .map((b) => b.findComponent(FoodIcon).props("food"));

async function pick(food = "pizza") {
    const button = wrapper
        .findAll("button.slice")
        .find((b) => b.findComponent(FoodIcon).props("food") === food);
    await button.trigger("keydown", { key: "Enter" });
}

async function feedEverything(food = "pizza") {
    await pick(food);
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

    it("offers one of each food to pick from", async () => {
        await play();

        expect(kinds()).toEqual(FOODS.map((f) => f.id));
        expect(wrapper.find(".change-food").exists()).toBe(false);
    });

    it("turns the row into three of the food picked", async () => {
        await play();

        await pick("hot_dog");

        expect(kinds()).toEqual(Array(FEED_COUNT).fill("hot_dog"));
        expect(kit.playSound).not.toHaveBeenCalled();
    });

    it("lets the pick be changed until the first bite", async () => {
        await play();
        await pick("pepperoni");

        await wrapper.get(".change-food").trigger("click");
        expect(kinds()).toEqual(FOODS.map((f) => f.id));

        await pick("pepperoni");
        await wrapper.find("button.slice").trigger("keydown", { key: "Enter" });
        expect(wrapper.find(".change-food").exists()).toBe(false);
    });

    it("hands the food eaten to the intestine", async () => {
        await play();
        await feedEverything("pepperoni");

        expect(wrapper.findComponent({ name: "GameBoard" }).props("food")).toBe(
            "pepperoni"
        );
    });

    it("starts at once and chomps through the world", async () => {
        await play();
        await pick();

        await wrapper.find("button.slice").trigger("keydown", { key: "Enter" });

        expect(kit.playSound).toHaveBeenCalledWith("chomp");
    });

    it("keeps keyboard focus in the game as the food goes", async () => {
        await play();
        await pick();

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

        expect(kit.toot).toHaveBeenCalledWith("guster");
        expect(kit.finish).toHaveBeenCalledWith({ score: 640 });
    });
});
