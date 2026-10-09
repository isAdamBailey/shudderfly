import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

// Built from `games` the way GamesWorld::scenes() builds it on the server.
const scenes = {
    road: {
        kind: "road",
        // A landmark that is a cast member (Boom's toilet) goes by its id.
        interactables: games.map((game) => {
            const where =
                game.slug === "boom"
                    ? { cast: "toilet" }
                    : { emoji: game.landmark };
            return {
                id: game.slug,
                type: "game",
                x: game.distance,
                game: game.slug,
                ...where,
                label: game.name,
                card: {
                    slug: game.slug,
                    name: game.name,
                    emoji: game.emoji,
                    description: game.description,
                    ...(where.cast ? where : { landmark: game.landmark }),
                },
            };
        }),
    },
};

function mountIndex(props = { scenes }) {
    return mount(Index, {
        props,
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

// jsdom has no media playback; the toot's audio unlock would throw without it.
beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});

describe("Games Index", () => {
    it("renders one landmark button per game, in road order", () => {
        const wrapper = mountIndex();
        const buttons = wrapper.findAll("button.landmark");
        expect(buttons).toHaveLength(games.length);
        // The toilet is drawn as the cast member, like everywhere else.
        expect(buttons[4].find(".cast-toilet").exists()).toBe(true);
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
            expect(idler.find(".cast-member").exists()).toBe(true);
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

        // Sideways moves the idler; height lifts the character off its
        // shadow.
        const lift = () => idler.get(".cast-lift").attributes("style");
        expect(idler.attributes("style")).toContain("translate(30px, 0px)");
        expect(lift()).toContain("translateY(-60px)");

        window.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
        await nextTick();

        // Released with upward velocity: still offset from its resting spot,
        // and no longer following the (now-gone) pointer.
        expect(idler.attributes("style")).toContain("translate(30px, 0px)");
        expect(lift()).toContain("translateY(-60px)");
    });

    it("makes the Butt toot when a food is dropped on it", async () => {
        const wrapper = mountIndex();
        // The first idler rests 80px right of where the Butt starts.
        const idler = wrapper.findAll(".idler")[0];

        await idler.trigger("pointerdown", { clientX: 100, clientY: 100 });
        window.dispatchEvent(
            new MouseEvent("pointermove", { clientX: 20, clientY: 100 })
        );
        // Held still before letting go, so it drops rather than flies.
        window.dispatchEvent(
            new MouseEvent("pointermove", { clientX: 20, clientY: 100 })
        );
        window.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 100));
        await nextTick();

        expect(wrapper.find(".toot-puff").exists()).toBe(true);
        expect(wrapper.get(".butt .cast-member").classes()).toContain(
            "cast-move-toot"
        );
    });

    it("pans the road when its bare background is dragged", async () => {
        const wrapper = mountIndex();
        const cameraX = () =>
            -Number(
                wrapper
                    .get(".world")
                    .attributes("style")
                    .match(/translate3d\((-?[\d.]+)px/)[1]
            );
        // The stage measures itself just after mount, which places the camera.
        await flushPromises();
        const before = cameraX();

        await wrapper
            .get(".road-scene")
            .trigger("pointerdown", { clientX: 300, button: 0 });
        window.dispatchEvent(
            new MouseEvent("pointermove", { clientX: 100, bubbles: true })
        );
        window.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
        await nextTick();

        // Dragging the background left looks further down the road.
        expect(cameraX()).toBe(before + 200);
    });

    it("hands the arrow keys to the road", () => {
        const wrapper = mountIndex();
        const stage = wrapper.get(".stage").element;

        const left = new KeyboardEvent("keydown", {
            key: "ArrowLeft",
            cancelable: true,
        });
        stage.dispatchEvent(left);
        stage.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowLeft" }));
        const other = new KeyboardEvent("keydown", {
            key: "a",
            cancelable: true,
        });
        stage.dispatchEvent(other);

        // Only keys the road walks with are claimed from the page.
        expect(left.defaultPrevented).toBe(true);
        expect(other.defaultPrevented).toBe(false);
    });

    it("flushes the toilet when the Butt walks up to it", async () => {
        // Just out of reach of where the Butt starts (260), so it has to walk.
        const boom = scenes.road.interactables.find((i) => i.id === "boom");
        const wrapper = mountIndex({
            scenes: {
                road: { kind: "road", interactables: [{ ...boom, x: 400 }] },
            },
        });
        const toilet = wrapper.get(".landmark .cast-toilet");
        expect(toilet.classes()).not.toContain("cast-move-flush");

        await wrapper.get("button.landmark").trigger("focus");
        await new Promise((resolve) => setTimeout(resolve, 300));

        expect(wrapper.get(".landmark .cast-toilet").classes()).toContain(
            "cast-move-flush"
        );
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

        await wrapper.get(".world-card-cancel").trigger("click");
        await nextTick();

        expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
        expect(document.activeElement).toBe(button.element);
    });
});
