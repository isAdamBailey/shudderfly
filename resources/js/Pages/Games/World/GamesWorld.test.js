import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import GamesWorld from "./GamesWorld.vue";

// The stage with WebGL stubbed both ways (issue #130): a fake renderer in
// place of Three's WebGLRenderer, so the real scene graph and overlay run
// without a GPU.
const fake = vi.hoisted(() => ({ webgl: true, fail: false, renderers: [] }));

vi.mock("three", async (importOriginal) => {
    const THREE = await importOriginal();
    class WebGLRenderer {
        constructor() {
            if (fake.fail) throw new Error("Error creating WebGL context.");
            this.shadowMap = {};
            this.render = vi.fn();
            this.setSize = vi.fn();
            this.setPixelRatio = vi.fn();
            this.dispose = vi.fn();
            this.forceContextLoss = vi.fn();
            fake.renderers.push(this);
        }
    }
    return { ...THREE, WebGLRenderer };
});

vi.mock("./three/useWorldRenderer.js", async (importOriginal) => ({
    ...(await importOriginal()),
    supportsWebGL: () => fake.webgl,
}));

const GAMES = [
    {
        slug: "sprout-pox",
        name: "Sprout Pox",
        emoji: "🥬",
        landmark: "🏥",
        x: 600,
    },
    {
        slug: "toot-foods",
        name: "Toot Foods",
        emoji: "🍔",
        landmark: "🍔",
        x: 1500,
    },
    { slug: "boom", name: "Poop Boom", emoji: "💩", cast: "toilet", x: 2400 },
];

const scenes = {
    road: {
        kind: "road",
        interactables: GAMES.map((game) => {
            const where = game.cast
                ? { cast: game.cast }
                : { emoji: game.landmark };
            return {
                id: game.slug,
                type: "game",
                x: game.x,
                game: game.slug,
                ...where,
                label: game.name,
                card: {
                    slug: game.slug,
                    name: game.name,
                    emoji: game.emoji,
                    description: `Play ${game.name}`,
                    ...(game.cast ? where : { landmark: game.landmark }),
                },
            };
        }),
    },
};

const STAGE = {
    left: 0,
    top: 0,
    width: 1000,
    height: 700,
    right: 1000,
    bottom: 700,
};

async function mountWorld() {
    const wrapper = mount(GamesWorld, {
        props: { scenes },
        attachTo: document.body,
        global: {
            provide: { route: global.route },
            stubs: {
                Link: {
                    name: "Link",
                    props: ["href"],
                    template: '<a :href="href"><slot /></a>',
                },
            },
        },
    });
    // Until three has loaded (or failed to) and a road is up.
    await vi.waitFor(() => {
        if (!wrapper.find(".road-scene, .road-3d").exists()) {
            throw new Error("still loading");
        }
    });
    await flushPromises();
    return wrapper;
}

/** Lets the renderer's frame loop (jsdom's rAF) run for `ms`. */
const frames = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** The x px of an overlay element's feet, from its transform. */
function screenX(el) {
    const [, x] = el.attributes("style").match(/translate3d\(([-\d.]+)px/);
    const width = parseFloat(
        el.attributes("style").match(/width: ([\d.]+)px/)[1]
    );
    return parseFloat(x) + width / 2;
}

let wrapper;

// Restored one by one: restoreAllMocks would also wipe vitest.setup.js's
// global mocks (ResizeObserver).
const spies = [];
function spy(object, method) {
    const s = vi.spyOn(object, method);
    spies.push(s);
    return s;
}

beforeEach(() => {
    fake.webgl = true;
    fake.fail = false;
    fake.renderers = [];
    spy(HTMLMediaElement.prototype, "play").mockResolvedValue();
    spy(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    // jsdom has no 2D canvas and lays nothing out.
    spy(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    spy(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(STAGE);
});

afterEach(() => {
    wrapper?.unmount();
    spies.splice(0).forEach((s) => s.mockRestore());
});

describe("GamesWorld stage", () => {
    it("falls back to the DOM road without WebGL", async () => {
        fake.webgl = false;
        wrapper = await mountWorld();

        expect(wrapper.find("canvas").exists()).toBe(false);
        expect(wrapper.find(".road-scene").exists()).toBe(true);
        expect(wrapper.findAll("button.landmark")).toHaveLength(3);
    });

    it("falls back to the DOM road when the renderer can't be made", async () => {
        fake.fail = true;
        wrapper = await mountWorld();

        expect(wrapper.find("canvas").exists()).toBe(false);
        expect(wrapper.find(".road-scene").exists()).toBe(true);
    });

    it("draws the road on the WebGL canvas, with a button per landmark", async () => {
        wrapper = await mountWorld();
        await frames(50);

        expect(wrapper.find("canvas.world-canvas").exists()).toBe(true);
        expect(wrapper.find(".road-3d").exists()).toBe(true);
        expect(wrapper.find(".road-scene").exists()).toBe(false);
        expect(fake.renderers[0].setSize).toHaveBeenCalledWith(
            1000,
            768,
            false
        );
        expect(fake.renderers[0].render).toHaveBeenCalled();

        const buttons = wrapper.findAll("button.interactable");
        expect(buttons.map((b) => b.attributes("aria-label"))).toEqual(
            GAMES.map(() => "games.world.landmark_aria")
        );
        // Every button is a real tap target, with its gold title.
        for (const button of buttons) {
            expect(button.attributes("style")).toMatch(
                /width: (4[89]|[5-9]\d|\d{3})/
            );
            expect(button.find(".landmark-title").exists()).toBe(true);
        }
        expect(wrapper.findAll(".idler")).toHaveLength(3);
        expect(wrapper.get(".peach").attributes("role")).toBe("img");
    });

    it("walks the Butt to a landmark focused from the keyboard, and opens its card", async () => {
        wrapper = await mountWorld();
        const peach = wrapper.get(".peach");
        const before = screenX(peach);

        const button = wrapper.findAll("button.interactable")[1];
        await button.trigger("focus");
        await nextTick();
        // The camera follows, so the Butt sits in the deadzone, not at 1500.
        expect(screenX(wrapper.get(".peach"))).not.toBe(before);

        await button.trigger("click");
        const dialog = wrapper.get('[role="dialog"]');
        expect(dialog.text()).toContain("Toot Foods");
        expect(wrapper.findComponent({ name: "Link" }).props("href")).toBe(
            "/games/toot-foods"
        );
    });

    it("puts focus back on the landmark when the card is cancelled", async () => {
        wrapper = await mountWorld();
        const button = wrapper.findAll("button.interactable")[0];
        await button.trigger("focus");
        await button.trigger("click");

        await wrapper.get(".confirm-cancel").trigger("click");
        await nextTick();

        expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
        expect(document.activeElement).toBe(button.element);
    });

    it("visits the landmark the Butt stands at on Enter", async () => {
        wrapper = await mountWorld();
        await wrapper.findAll("button.interactable")[2].trigger("focus");

        await wrapper.get(".stage").trigger("keydown", { key: "Enter" });

        expect(wrapper.get('[role="dialog"]').text()).toContain("Poop Boom");
    });

    it("walks the Butt to where it is dragged, as the flat road did", async () => {
        wrapper = await mountWorld();
        const start = screenX(wrapper.get(".peach"));

        await wrapper.get(".peach").trigger("pointerdown", { clientX: start });
        window.dispatchEvent(
            new MouseEvent("pointermove", { clientX: start + 100 })
        );
        window.dispatchEvent(new MouseEvent("pointerup"));
        await frames(600);

        expect(screenX(wrapper.get(".peach"))).toBeCloseTo(start + 100, 0);
    });

    it("walks with the arrow keys", async () => {
        wrapper = await mountWorld();
        const start = screenX(wrapper.get(".peach"));

        await wrapper.get(".stage").trigger("keydown", { key: "ArrowRight" });
        await frames(200);
        await wrapper.get(".stage").trigger("keyup", { key: "ArrowRight" });

        expect(screenX(wrapper.get(".peach"))).toBeGreaterThan(start + 10);
    });

    it("stops drawing while the tab is hidden, and frees the context when it goes", async () => {
        wrapper = await mountWorld();
        const gl = fake.renderers[0];
        Object.defineProperty(document, "hidden", {
            value: true,
            configurable: true,
        });
        document.dispatchEvent(new Event("visibilitychange"));
        await frames(20);
        const calls = gl.render.mock.calls.length;
        await frames(80);
        expect(gl.render.mock.calls.length).toBe(calls);
        Object.defineProperty(document, "hidden", {
            value: false,
            configurable: true,
        });

        wrapper.unmount();
        wrapper = null;
        expect(gl.dispose).toHaveBeenCalled();
        expect(gl.forceContextLoss).toHaveBeenCalled();
    });
});
