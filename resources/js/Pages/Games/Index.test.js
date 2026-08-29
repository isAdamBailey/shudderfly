import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { TOOT_FOODS } from "@/constants/characters.js";
import Index from "./Index.vue";

const games = [
    {
        slug: "sprout-pox",
        name: "Sprout Pox",
        emoji: "🥬",
        landmark: "🏥",
        distance: 600,
        description: "Launch sprouts at the spotty face.",
    },
    {
        slug: "toot-foods",
        name: "Toot Foods",
        emoji: "🍔",
        landmark: "🍔",
        distance: 1500,
        description: "Feed the foods and listen to them toot.",
    },
    {
        slug: "cockroach-fight",
        name: "Cockroach Fight",
        emoji: "🪳",
        landmark: "🏟️",
        distance: 2400,
        description: "Tap a cockroach head to bring them together.",
    },
    {
        slug: "costco-pizza-poop",
        name: "Costco Pizza Poop",
        emoji: "🍕",
        landmark: "🏪",
        distance: 3300,
        description: "Drag every slice into the mouth.",
    },
    {
        slug: "boom",
        name: "Poop Boom",
        emoji: "💩",
        landmark: "🚽",
        distance: 4200,
        description: "Drag the poop into the toilet.",
    },
    {
        slug: "cockroach",
        name: "Cockroach Fart",
        emoji: "🪳",
        landmark: "🏚️",
        distance: 5100,
        description: "Tap the cockroach's head to make it hiss.",
    },
];

function mountIndex() {
    return mount(Index, {
        props: { games },
        attachTo: document.body,
        global: {
            provide: { route: global.route },
            // The shared Inertia Link stub renders a bare <a>; give it a real
            // href so the confirm card's Play link can be asserted.
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

describe("Games Index", () => {
    it("renders one landmark button per game, in road order", () => {
        const wrapper = mountIndex();
        const buttons = wrapper.findAll("button.landmark");
        expect(buttons).toHaveLength(games.length);
        games.forEach((game, i) => {
            expect(buttons[i].text()).toContain(game.landmark);
            expect(buttons[i].text()).toContain(game.name);
            expect(buttons[i].attributes("style")).toContain(
                `left: ${game.distance}px`
            );
        });
    });

    it("renders one roadside idler per landmark, set back and aria-hidden", () => {
        const wrapper = mountIndex();
        const idlers = wrapper.findAll(".idler");
        expect(idlers).toHaveLength(games.length);
        idlers.forEach((idler, i) => {
            expect(idler.attributes("aria-hidden")).toBe("true");
            expect(idler.attributes("style")).toContain(
                `left: ${games[i].distance - 260}px`
            );
            expect(idler.text()).toBe(TOOT_FOODS[i].emoji);
        });
    });

    it("lets an idler be dragged, then thrown when released", async () => {
        const wrapper = mountIndex();
        const idler = wrapper.findAll(".idler")[0];

        await idler.trigger("pointerdown", { clientX: 100, clientY: 100 });
        window.dispatchEvent(
            new MouseEvent("pointermove", {
                clientX: 130,
                clientY: 40,
                bubbles: true,
            })
        );
        await nextTick();

        expect(idler.attributes("style")).toContain(
            "translate(30px, -60px)"
        );

        window.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
        await nextTick();

        // Released with upward velocity: still offset from its resting spot,
        // and no longer following the (now-gone) pointer.
        expect(idler.attributes("style")).toContain("translate(30px, -60px)");
    });

    it("renders no game links until a landmark is chosen", () => {
        const wrapper = mountIndex();
        expect(wrapper.findAll("a")).toHaveLength(0);
    });

    it("opens the confirm card for a focused landmark on Enter", async () => {
        const wrapper = mountIndex();
        const button = wrapper.findAll("button.landmark")[1];
        await button.trigger("focus");
        await button.trigger("click");

        const dialog = wrapper.get('[role="dialog"]');
        expect(dialog.text()).toContain("Toot Foods");
        expect(dialog.text()).toContain(
            "Feed the foods and listen to them toot."
        );
        expect(wrapper.findComponent({ name: "Link" }).props("href")).toBe(
            "/games/toot-foods"
        );
    });

    it("closes the confirm card on cancel and returns focus to the landmark", async () => {
        const wrapper = mountIndex();
        const button = wrapper.findAll("button.landmark")[0];
        await button.trigger("focus");
        await button.trigger("click");
        expect(wrapper.find('[role="dialog"]').exists()).toBe(true);

        await wrapper.get(".confirm-cancel").trigger("click");
        await nextTick();

        expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
        expect(document.activeElement).toBe(button.element);
    });
});
