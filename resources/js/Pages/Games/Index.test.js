import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import Index from "./Index.vue";

const games = [
    { slug: "costco-pizza-poop", name: "Costco Pizza Poop", emoji: "🍕", description: "Drag every slice into the mouth, then celebrate the inevitable." },
    { slug: "boom", name: "Poop Boom", emoji: "💩", description: "Drag the poop into the toilet. 5 misses and it's game over!" },
    { slug: "cockroach", name: "Cockroach Fart", emoji: "🪳", description: "Tap the cockroach's head to make it hiss its way to the toilet." },
    { slug: "big-poop", name: "Big Poop", emoji: "💩", description: "Guide the poop through the intestine and out the other end!" },
];

function mountIndex(props = {}) {
    return mount(Index, {
        props: { games, ...props },
        global: {
            provide: { route: global.route },
        },
    });
}

describe("Games Index", () => {
    it("renders all game cards", () => {
        const wrapper = mountIndex();
        const links = wrapper.findAll("a");
        expect(links).toHaveLength(4);
    });

    it("displays each game name", () => {
        const wrapper = mountIndex();
        for (const game of games) {
            expect(wrapper.text()).toContain(game.name);
        }
    });

    it("displays each game emoji", () => {
        const wrapper = mountIndex();
        for (const game of games) {
            expect(wrapper.text()).toContain(game.emoji);
        }
    });

    it("displays each game description", () => {
        const wrapper = mountIndex();
        for (const game of games) {
            expect(wrapper.text()).toContain(game.description);
        }
    });

    it("links to the correct game routes", () => {
        const wrapper = mountIndex();
        const links = wrapper.findAllComponents({ name: "Link" });
        expect(links[0].props("href")).toBe("/games/costco-pizza-poop");
        expect(links[1].props("href")).toBe("/games/boom");
        expect(links[2].props("href")).toBe("/games/cockroach");
        expect(links[3].props("href")).toBe("/games/big-poop");
    });
});
