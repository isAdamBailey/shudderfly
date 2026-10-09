import { flushPromises, mount } from "@vue/test-utils";
import axios from "axios";
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

const hostedStandIn = vi.hoisted(() => ({
    component: {
        name: "CockroachApp",
        props: ["kit"],
        template: '<div class="hosted-cockroach" />',
    },
}));

vi.mock("./hostedGames.js", async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        hostedGame(slug) {
            if (slug !== "cockroach") return actual.hostedGame(slug);
            return () => Promise.resolve(hostedStandIn.component);
        },
    };
});

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

/** The same road with `slug`'s landmark across the street, at `x`. */
function withNearSide(slug, x) {
    return {
        road: {
            ...scenes.road,
            interactables: scenes.road.interactables.map((item) =>
                item.id === slug ? { ...item, side: "near", x } : item
            ),
        },
    };
}

// The House across the street, and the hall inside it.
const HOUSE = {
    id: "house",
    type: "door",
    x: 1050,
    side: "near",
    emoji: "🏠",
    label: "The House",
    to: "house.hall",
    toSpot: "front-door",
};
const withHouse = {
    road: {
        ...scenes.road,
        label: "The street",
        interactables: [...scenes.road.interactables, HOUSE],
    },
    "house.hall": {
        kind: "room",
        label: "The Hall",
        size: { w: 900, d: 500 },
        spawn: { x: 450, z: 330 },
        walls: { back: "wallpaper-stripes", floor: "wood" },
        ambient: 0.35,
        lights: [
            {
                id: "lamp",
                x: 760,
                z: 140,
                y: 200,
                color: "#fbbf24",
                intensity: 1.4,
            },
        ],
        interactables: [
            {
                id: "front-door",
                type: "door",
                x: 450,
                z: 0,
                emoji: "🚪",
                label: "Go outside",
                to: "road",
                toSpot: "house",
                exit: true,
            },
            {
                id: "strawberry",
                type: "toy",
                x: 180,
                z: 260,
                cast: "strawberry",
                label: "Strawberry",
                move: "hop",
                toot: "strawberry",
            },
            {
                id: "lamp-switch",
                type: "toy",
                x: 760,
                z: 140,
                emoji: "💡",
                label: "Lamp",
                light: "lamp",
            },
            {
                id: "sprout-pox",
                type: "game",
                x: 600,
                z: 40,
                size: 120,
                game: "sprout-pox",
                cast: "face",
                label: "Sprout Pox",
                card: {
                    slug: "sprout-pox",
                    name: "Sprout Pox",
                    emoji: "🥬",
                    description: "Feed the face",
                    cast: "face",
                },
            },
        ],
    },
};

const ROAD = ".road-scene, .road-3d";

async function mountWorld(worldScenes = scenes, { link = null } = {}) {
    const wrapper = mount(GamesWorld, {
        props: { scenes: worldScenes, link },
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
    // Until three has loaded (or failed to) and a scene is up.
    await showing(wrapper, `${ROAD}, .room-3d`);
    return wrapper;
}

/** Waits until `selector` is on the stage, e.g. after a door. */
async function showing(wrapper, selector) {
    await vi.waitFor(
        () => {
            if (!wrapper.find(selector).exists()) {
                throw new Error(`no ${selector} yet`);
            }
        },
        { timeout: 3000 }
    );
    await flushPromises();
}

/** The road's button for the House: Tab order is along the road, and it
 * stands between the first two games. */
const houseButton = (wrapper) => wrapper.findAll("button.interactable")[1];

/** Goes into the House's hall from the road. */
async function enterHouse(wrapper) {
    await houseButton(wrapper).trigger("click");
    await showing(wrapper, ".room-3d");
    // The fade back in, and its announcement.
    await vi.waitFor(() => {
        if (wrapper.find(".veil.blocking").exists()) throw new Error("fading");
    });
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

/** The y px of an overlay element's top, from its transform. */
function screenTop(el) {
    const style = el.attributes("style");
    return parseFloat(style.match(/translate3d\([-\d.]+px, ([-\d.]+)px/)[1]);
}

/** The y px of an overlay element's feet, from its transform. */
function screenFeet(el) {
    const style = el.attributes("style");
    return screenTop(el) + parseFloat(style.match(/height: ([\d.]+)px/)[1]);
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
    // The world remembers where the Butt was; every test starts fresh.
    sessionStorage.clear();
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
        expect(wrapper.get(".butt").attributes("role")).toBe("img");
    });

    it("carries on in the DOM if the WebGL context is lost", async () => {
        wrapper = await mountWorld();
        const gl = fake.renderers[0];

        await wrapper.get("canvas").trigger("webglcontextlost");

        expect(wrapper.find(".road-scene").exists()).toBe(true);
        expect(wrapper.find("canvas").exists()).toBe(false);
        expect(gl.dispose).toHaveBeenCalled();
    });

    it("walks the Butt to a landmark focused from the keyboard, and opens its card", async () => {
        wrapper = await mountWorld();
        const butt = wrapper.get(".butt");
        const before = screenX(butt);

        const button = wrapper.findAll("button.interactable")[1];
        await button.trigger("focus");
        await nextTick();
        // The camera follows, so the Butt sits in the deadzone, not at 1500.
        expect(screenX(wrapper.get(".butt"))).not.toBe(before);

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

        await wrapper.get(".world-card-cancel").trigger("click");
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
        const start = screenX(wrapper.get(".butt"));

        await wrapper.get(".butt").trigger("pointerdown", { clientX: start });
        window.dispatchEvent(
            new MouseEvent("pointermove", { clientX: start + 100 })
        );
        window.dispatchEvent(new MouseEvent("pointerup"));
        await frames(600);

        expect(screenX(wrapper.get(".butt"))).toBeCloseTo(start + 100, 0);
    });

    it("walks with the arrow keys", async () => {
        wrapper = await mountWorld();
        const start = screenX(wrapper.get(".butt"));

        await wrapper.get(".stage").trigger("keydown", { key: "ArrowRight" });
        await frames(200);
        await wrapper.get(".stage").trigger("keyup", { key: "ArrowRight" });

        expect(screenX(wrapper.get(".butt"))).toBeGreaterThan(start + 10);
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

    it("crosses the street with the up and down arrows", async () => {
        wrapper = await mountWorld();
        const far = screenFeet(wrapper.get(".butt"));
        const x = screenX(wrapper.get(".butt"));

        await wrapper.get(".stage").trigger("keydown", { key: "ArrowDown" });
        await frames(600);
        const near = screenFeet(wrapper.get(".butt"));
        expect(near).toBeGreaterThan(far + 50);
        // The camera keeps it where it was along the road.
        expect(screenX(wrapper.get(".butt"))).toBeCloseTo(x, 0);

        await wrapper.get(".stage").trigger("keydown", { key: "ArrowUp" });
        await frames(600);
        // Back on the far side (give or take where its walking bob stopped).
        expect(Math.abs(screenFeet(wrapper.get(".butt")) - far)).toBeLessThan(
            15
        );
    });

    it("tabs along the road, the far side before the near side", async () => {
        wrapper = await mountWorld(withNearSide("boom", 600));

        const names = wrapper
            .findAll("button.interactable")
            .map((b) => GAMES.find((g) => b.text().includes(g.name)).name);
        expect(names).toEqual(["Sprout Pox", "Poop Boom", "Toot Foods"]);
    });

    it("crosses over to a near-side landmark focused from the keyboard", async () => {
        wrapper = await mountWorld(withNearSide("boom", 600));
        const far = screenFeet(wrapper.get(".butt"));

        await wrapper.findAll("button.interactable")[1].trigger("focus");
        await frames(600);
        expect(screenFeet(wrapper.get(".butt"))).toBeGreaterThan(far + 50);

        await wrapper.get(".stage").trigger("keydown", { key: "Enter" });
        expect(wrapper.get('[role="dialog"]').text()).toContain("Poop Boom");
    });

    it("walks the Butt to a spot tapped on the street, on that side", async () => {
        wrapper = await mountWorld();
        const butt = wrapper.get(".butt");
        const start = screenX(butt);
        const far = screenFeet(butt);
        const background = wrapper.get(".road-3d");

        // A tap on the near pavement, to the Butt's right.
        await background.trigger("pointerdown", {
            clientX: start + 200,
            clientY: 768 * 0.86,
        });
        window.dispatchEvent(new MouseEvent("pointerup"));
        await frames(1200);

        expect(screenX(wrapper.get(".butt"))).toBeGreaterThan(start + 100);
        expect(screenFeet(wrapper.get(".butt"))).toBeGreaterThan(far + 50);
    });

    it("pans, rather than walks, when the street is dragged", async () => {
        wrapper = await mountWorld();
        const start = screenX(wrapper.get(".butt"));
        const background = wrapper.get(".road-3d");

        await background.trigger("pointerdown", {
            clientX: 500,
            clientY: 768 * 0.86,
        });
        window.dispatchEvent(
            new MouseEvent("pointermove", { clientX: 400, clientY: 660 })
        );
        window.dispatchEvent(new MouseEvent("pointerup"));
        await frames(300);

        expect(screenFeet(wrapper.get(".butt"))).toBeLessThan(768 * 0.7);
        expect(screenX(wrapper.get(".butt"))).not.toBeGreaterThan(start);
    });

    it("ignores a tap on the sky", async () => {
        wrapper = await mountWorld();
        const start = screenX(wrapper.get(".butt"));

        await wrapper.get(".road-3d").trigger("pointerdown", {
            clientX: start + 300,
            clientY: 768 * 0.15,
        });
        window.dispatchEvent(new MouseEvent("pointerup"));
        await frames(300);

        expect(screenX(wrapper.get(".butt"))).toBe(start);
    });

    it("tells screen readers about crossing only where there are two sides", async () => {
        wrapper = await mountWorld();
        expect(wrapper.get(".stage").attributes("aria-label")).toBe(
            "games.world.stage_lanes_aria"
        );
        wrapper.unmount();

        fake.webgl = false;
        wrapper = await mountWorld();
        expect(wrapper.get(".stage").attributes("aria-label")).toBe(
            "games.world.stage_aria"
        );
    });
});

describe("GamesWorld doors", () => {
    it("goes through the House's door into the hall, and says so", async () => {
        wrapper = await mountWorld(withHouse);

        await enterHouse(wrapper);

        expect(wrapper.find(".road-3d").exists()).toBe(false);
        expect(wrapper.get("[aria-live]").text()).toBe("The Hall");
        expect(wrapper.get(".stage").attributes("aria-label")).toBe(
            "games.world.room_aria"
        );
        expect(wrapper.get("button.room-item").attributes("aria-label")).toBe(
            "Go outside"
        );
        // Focus lands on the door you came in by.
        expect(document.activeElement).toBe(
            wrapper.get("button.room-item").element
        );
    });

    it("leaves on Escape, with focus back on the House", async () => {
        wrapper = await mountWorld(withHouse);
        await enterHouse(wrapper);

        await wrapper.get(".stage").trigger("keydown", { key: "Escape" });
        await showing(wrapper, ".road-3d");

        await vi.waitFor(() => {
            expect(document.activeElement).toBe(houseButton(wrapper).element);
        });
        expect(wrapper.get("[aria-live]").text()).toBe("The street");
        expect(wrapper.find(".world-back").exists()).toBe(false);
    });

    it("leaves by the corner back button", async () => {
        wrapper = await mountWorld(withHouse);
        await enterHouse(wrapper);

        const back = wrapper.get(".world-back");
        expect(back.attributes("aria-label")).toBe("games.world.back");
        await back.trigger("click");

        await showing(wrapper, ".road-3d");
    });

    it("ignores Escape on the road", async () => {
        wrapper = await mountWorld(withHouse);

        await wrapper.get(".stage").trigger("keydown", { key: "Escape" });
        await frames(50);

        expect(wrapper.find(".road-3d").exists()).toBe(true);
        expect(wrapper.find(".veil.blocking").exists()).toBe(false);
    });

    it("says it can't go in without WebGL, and stays on the road", async () => {
        fake.webgl = false;
        wrapper = await mountWorld(withHouse);

        // The DOM road lists the landmarks in the registry's order.
        await wrapper.findAll("button.landmark")[3].trigger("click");
        await nextTick();

        expect(wrapper.get("[aria-live]").text()).toBe(
            "games.world.needs_webgl"
        );
        expect(wrapper.find(".road-scene").exists()).toBe(true);
        expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    });

    it("comes back to where the Butt was, after a game", async () => {
        wrapper = await mountWorld(withHouse);
        await wrapper.findAll("button.interactable")[2].trigger("focus");
        // Off to play Toot Foods.
        wrapper.unmount();

        wrapper = await mountWorld(withHouse);
        await wrapper.get(".stage").trigger("keydown", { key: "Enter" });

        expect(wrapper.get('[role="dialog"]').text()).toContain("Toot Foods");
    });

    it("opens in the room a shared link names", async () => {
        wrapper = await mountWorld(withHouse, {
            link: { scene: "house.hall", visit: "a" },
        });

        expect(wrapper.find(".room-3d").exists()).toBe(true);
    });

    it("sends a link to a room out to the road without WebGL", async () => {
        fake.webgl = false;
        wrapper = await mountWorld(withHouse, {
            link: { scene: "house.hall", visit: "a" },
        });

        expect(wrapper.find(".road-scene").exists()).toBe(true);
    });

    it("opens, and goes through doors, when storage throws", async () => {
        const broken = () => {
            throw new Error("SecurityError");
        };
        spy(Storage.prototype, "getItem").mockImplementation(broken);
        spy(Storage.prototype, "setItem").mockImplementation(broken);
        wrapper = await mountWorld(withHouse);

        await enterHouse(wrapper);

        expect(wrapper.find(".room-3d").exists()).toBe(true);
    });
});

describe("GamesWorld rooms", () => {
    /** The room's button for `label`. */
    const roomButton = (wrapper, label) =>
        wrapper
            .findAll("button.room-item")
            .find((b) => b.attributes("aria-label") === label);

    it("hangs a picture on the wall", async () => {
        const hall = withHouse["house.hall"];
        wrapper = await mountWorld({
            ...withHouse,
            "house.hall": {
                ...hall,
                interactables: [
                    ...hall.interactables,
                    {
                        id: "portrait",
                        type: "toy",
                        x: 300,
                        z: 0,
                        y: 150,
                        image: { src: "/img/cockroach.png", w: 372, h: 200 },
                        label: "Picture of the cockroach",
                        line: "Hiss!",
                        sound: "hiss",
                    },
                ],
            },
        });
        await enterHouse(wrapper);

        const picture = roomButton(wrapper, "Picture of the cockroach");
        expect(picture.get("img.room-picture").attributes("src")).toBe(
            "/img/cockroach.png"
        );
    });

    it("walks the Butt about the room with the arrow keys", async () => {
        wrapper = await mountWorld(withHouse);
        await enterHouse(wrapper);
        const before = screenX(wrapper.get(".room-3d .butt"));

        const stage = wrapper.get(".stage");
        await stage.trigger("keydown", { key: "ArrowLeft" });
        await frames(300);
        await stage.trigger("keyup", { key: "ArrowLeft" });

        expect(screenX(wrapper.get(".room-3d .butt"))).toBeLessThan(before);
    });

    it("leaves the door's button when the arrow keys walk off", async () => {
        wrapper = await mountWorld(withHouse);
        await enterHouse(wrapper);
        const door = roomButton(wrapper, "Go outside");
        expect(document.activeElement).toBe(door.element);

        await door.trigger("keydown", { key: "ArrowLeft" });
        await frames(100);
        await wrapper.get(".stage").trigger("keyup", { key: "ArrowLeft" });

        // Enter now uses what the Butt is at, not the door it left.
        expect(document.activeElement).toBe(wrapper.get(".stage").element);
        await wrapper.get(".stage").trigger("keydown", { key: "Enter" });
        await frames(50);
        expect(wrapper.find(".room-3d").exists()).toBe(true);
    });

    it("walks the Butt to a spot tapped on the floor", async () => {
        wrapper = await mountWorld(withHouse);
        await enterHouse(wrapper);
        const before = screenX(wrapper.get(".room-3d .butt"));

        // Low on the stage, left of the Butt: the floor.
        await wrapper
            .get(".room-3d")
            .trigger("pointerdown", { clientX: 250, clientY: 620 });
        window.dispatchEvent(new Event("pointerup"));
        await frames(600);

        expect(screenX(wrapper.get(".room-3d .butt"))).toBeLessThan(
            before - 100
        );
    });

    it("stands the Butt at a toy tabbed to, and Enter plays with it", async () => {
        wrapper = await mountWorld(withHouse);
        await enterHouse(wrapper);
        const berry = roomButton(wrapper, "Strawberry");

        await berry.trigger("focus");
        await nextTick();
        // In front of the strawberry (nearer the camera, so a little
        // further out from the middle on screen).
        expect(
            Math.abs(screenX(wrapper.get(".room-3d .butt")) - screenX(berry))
        ).toBeLessThan(40);

        await berry.trigger("click");
        await nextTick();

        // It toots where it is, and nothing leaves the room or opens.
        expect(wrapper.find(".toot-puff").exists()).toBe(true);
        expect(wrapper.find(".room-3d").exists()).toBe(true);
        expect(wrapper.find('[role="dialog"]').exists()).toBe(false);

        // And the room isn't left frozen.
        const stage = wrapper.get(".stage");
        const at = screenX(wrapper.get(".room-3d .butt"));
        await stage.trigger("keydown", { key: "ArrowRight" });
        await frames(200);
        await stage.trigger("keyup", { key: "ArrowRight" });
        expect(screenX(wrapper.get(".room-3d .butt"))).toBeGreaterThan(at);
    });

    it("drags the Butt off a toy it stands at, and a tap on it plays", async () => {
        wrapper = await mountWorld(withHouse);
        await enterHouse(wrapper);
        const berry = roomButton(wrapper, "Strawberry");
        await berry.trigger("focus");
        await nextTick();
        const butt = () => wrapper.get(".room-3d .butt");
        // Drawn over the toy's button, so it takes the press.
        expect(
            berry.element.compareDocumentPosition(butt().element) &
                Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy();

        const tap = async (clientX, clientY) => {
            await butt().trigger("pointerdown", { clientX, clientY });
            window.dispatchEvent(new Event("pointerup"));
            await nextTick();
        };
        // On the Butt, but clear of the toy's button: only a grab.
        const feet = screenFeet(butt()) - 2;
        expect(feet).toBeGreaterThan(screenFeet(berry));
        await tap(screenX(butt()), feet);
        expect(wrapper.find(".toot-puff").exists()).toBe(false);

        // Over the toy's button: it plays.
        await tap(screenX(berry), screenFeet(berry) - 5);
        expect(wrapper.find(".toot-puff").exists()).toBe(true);

        const x = screenX(butt());
        const y = screenFeet(butt());

        await butt().trigger("pointerdown", { clientX: x, clientY: y });
        window.dispatchEvent(
            new MouseEvent("pointermove", { clientX: x + 150, clientY: y })
        );
        window.dispatchEvent(new MouseEvent("pointerup"));
        await frames(600);
        expect(screenX(butt())).toBeGreaterThan(x + 50);
    });

    it("walks over to a toy that is clicked, then plays with it", async () => {
        wrapper = await mountWorld(withHouse);
        await enterHouse(wrapper);
        const berry = roomButton(wrapper, "Strawberry");

        await berry.trigger("pointerdown");
        await berry.trigger("focus");
        await berry.trigger("click");
        await nextTick();
        expect(wrapper.find(".toot-puff").exists()).toBe(false);

        await vi.waitFor(
            () => expect(wrapper.find(".toot-puff").exists()).toBe(true),
            { timeout: 3000 }
        );
    });

    it("launches a game from its spot in a room, and lets go on cancel", async () => {
        wrapper = await mountWorld(withHouse);
        await enterHouse(wrapper);
        const game = roomButton(wrapper, "Sprout Pox");
        // The Face has no emoji: it's drawn in the DOM, on its button.
        expect(game.find(".room-overlay.cast-face").exists()).toBe(true);

        await game.trigger("focus");
        await game.trigger("click");
        await nextTick();
        expect(wrapper.get('[role="dialog"]').text()).toContain("Sprout Pox");
        expect(wrapper.find(".confirm-speak").exists()).toBe(false);

        await wrapper.get(".world-card-cancel").trigger("click");
        await nextTick();
        expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
        expect(wrapper.find(".room-3d").exists()).toBe(true);

        const stage = wrapper.get(".stage");
        const at = screenX(wrapper.get(".room-3d .butt"));
        await stage.trigger("keydown", { key: "ArrowLeft" });
        await frames(200);
        await stage.trigger("keyup", { key: "ArrowLeft" });
        expect(screenX(wrapper.get(".room-3d .butt"))).toBeLessThan(at);
    });

    it("plays a minigame over the room, its keys its own, and goes back to the room", async () => {
        const hall = withHouse["house.hall"];
        wrapper = await mountWorld({
            ...withHouse,
            "house.hall": {
                ...hall,
                interactables: [
                    ...hall.interactables,
                    {
                        id: "toot-catch",
                        type: "minigame",
                        minigame: "toot-catch",
                        x: 320,
                        z: 160,
                        size: 90,
                        emoji: "🧺",
                        titled: true,
                        label: "Toot Catch",
                        line: "Catch them!",
                    },
                ],
            },
        });
        await enterHouse(wrapper);
        const catcher = roomButton(wrapper, "Toot Catch");
        expect(catcher.find(".landmark-title, svg").exists()).toBe(true);

        await catcher.trigger("focus");
        await catcher.trigger("click");
        await nextTick();
        expect(wrapper.get('[role="dialog"] h2').text()).toBe("Toot Catch");

        await wrapper.get(".minigame-play").trigger("click");
        await showing(wrapper, ".catch-field");
        const field = wrapper.get(".catch-field");
        expect(document.activeElement).toBe(field.element);

        // The arrows move the minigame's Butt, not the room's.
        const at = screenX(wrapper.get(".room-3d .butt"));
        await field.trigger("keydown", { key: "ArrowLeft" });
        await frames(200);
        await field.trigger("keyup", { key: "ArrowLeft" });
        expect(screenX(wrapper.get(".room-3d .butt"))).toBe(at);
        expect(document.activeElement).toBe(field.element);

        await field.trigger("keydown", { key: "Escape" });
        await nextTick();
        expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
        expect(wrapper.find(".room-3d").exists()).toBe(true);
    });

    it("comes back to where the Butt was in a room", async () => {
        wrapper = await mountWorld(withHouse);
        await enterHouse(wrapper);
        await roomButton(wrapper, "Lamp").trigger("focus");
        await nextTick();
        const at = screenX(wrapper.get(".room-3d .butt"));
        wrapper.unmount();

        wrapper = await mountWorld(withHouse);

        expect(wrapper.find(".room-3d").exists()).toBe(true);
        expect(screenX(wrapper.get(".room-3d .butt"))).toBeCloseTo(at, 0);
    });
});

describe("GamesWorld hosted game", () => {
    const cockroach = {
        id: "cockroach",
        type: "game",
        x: 4200,
        side: "far",
        game: "cockroach",
        emoji: "🏚️",
        label: "Cockroach Fart",
        card: {
            slug: "cockroach",
            name: "Cockroach Fart",
            emoji: "🪳",
            description: "Hiss it to the toilet",
            landmark: "🏚️",
        },
    };

    const withCockroach = {
        road: {
            ...scenes.road,
            interactables: [...scenes.road.interactables, cockroach],
        },
    };

    const landmark = (label) =>
        wrapper
            .findAll("button.landmark")
            .find((button) => button.text().includes(label));

    it("plays one game over the road and still links the others to their pages", async () => {
        wrapper = await mountWorld(withCockroach);
        await landmark("Cockroach Fart").trigger("click");
        await nextTick();

        expect(wrapper.get('[role="dialog"]').text()).toContain(
            "Cockroach Fart"
        );
        expect(wrapper.findComponent({ name: "Link" }).exists()).toBe(false);

        await wrapper.get(".world-card-cancel").trigger("click");
        await nextTick();
        expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
        expect(wrapper.find(ROAD).exists()).toBe(true);

        await landmark("Cockroach Fart").trigger("click");
        await nextTick();
        await wrapper.get(".world-card-action").trigger("click");
        await flushPromises();

        expect(wrapper.find(".hosted-cockroach").exists()).toBe(true);
        expect(wrapper.find(ROAD).exists()).toBe(true);

        await wrapper.get(".game-host").trigger("keydown", { key: "Escape" });
        await nextTick();
        expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
        expect(wrapper.find(ROAD).exists()).toBe(true);

        await landmark("Toot Foods").trigger("click");
        await nextTick();
        expect(wrapper.findComponent({ name: "Link" }).props("href")).toBe(
            "/games/toot-foods"
        );
    });
});

describe("GamesWorld Library shelves", () => {
    // A long category room: 30 books, ten to a page.
    const shelfRoom = {
        road: withHouse.road,
        "library.category-1": {
            kind: "room",
            label: "The People Room",
            size: { w: 1500, d: 450 },
            frame: 900,
            spawn: { x: 300, z: 300 },
            walls: { back: "wallpaper-dots", floor: "wood" },
            ambient: 0.6,
            shelves: [
                {
                    id: "books",
                    category: "people",
                    count: 30,
                    x: 240,
                    rows: 3,
                    span: 110,
                    perPage: 10,
                },
            ],
            interactables: [
                {
                    id: "landing-door",
                    type: "door",
                    x: 110,
                    z: 0,
                    emoji: "🚪",
                    label: "Floor 2",
                    to: "road",
                    toSpot: "house",
                    exit: true,
                },
            ],
        },
    };

    const book = (id) => ({
        id,
        slug: `book-${id}`,
        title: `Book ${id}`,
        excerpt: "Toot toot.",
        cover_image: id === 1 ? { id: 9, media_path: "/cover-1.jpg" } : null,
    });

    it("fetches the books in view and writes their titles on the shelf", async () => {
        const get = spy(axios, "get").mockImplementation((url) => {
            const page = Number(
                new URL(url, "http://x").searchParams.get("page")
            );
            const ids = Array.from(
                { length: 10 },
                (_, k) => (page - 1) * 10 + k
            );
            return Promise.resolve({
                data: { books: { data: ids.map(book) } },
            });
        });
        wrapper = await mountWorld(shelfRoom, {
            link: { scene: "library.category-1", visit: "a" },
        });
        await showing(wrapper, "button.shelf-book");

        // Only the pages near the view: not the whole shelf.
        const pages = get.mock.calls.map(([url]) => url);
        expect(pages.length).toBeGreaterThan(0);
        expect(pages.every((url) => url.includes("people"))).toBe(true);
        const first = wrapper.get("button.shelf-book");
        expect(first.attributes("aria-label")).toBe("Book 0");
        expect(first.get(".shelf-book-title").text()).toBe("Book 0");
        // No cover: the coloured book shows through.
        expect(first.find(".shelf-book-cover").exists()).toBe(false);
        const second = wrapper.findAll("button.shelf-book")[1];
        expect(second.get(".shelf-book-cover").attributes("src")).toBe(
            "/cover-1.jpg"
        );
    });

    it("opens a book's card, and the card leads to the book", async () => {
        spy(axios, "get").mockResolvedValue({
            data: { books: { data: [0, 1, 2, 3].map(book) } },
        });
        wrapper = await mountWorld(shelfRoom, {
            link: { scene: "library.category-1", visit: "a" },
        });
        await showing(wrapper, "button.shelf-book");

        const button = wrapper.get("button.shelf-book");
        await button.trigger("focus");
        await button.trigger("click");
        await showing(wrapper, "[role='dialog']");

        expect(wrapper.get("[role='dialog'] h2").text()).toBe("Book 0");
        expect(wrapper.get("[role='dialog'] a").attributes("href")).toContain(
            "book-0"
        );

        await wrapper.get(".world-card-cancel").trigger("click");
        await nextTick();
        expect(wrapper.find("[role='dialog']").exists()).toBe(false);
    });
});
