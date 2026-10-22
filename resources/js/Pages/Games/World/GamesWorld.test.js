import { router as inertia, usePage } from "@inertiajs/vue3";
import { flushPromises, mount } from "@vue/test-utils";
import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { tickLevel } from "./clockSounds.js";
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

// The radio's wiring (issue #174): the options the World hands presence,
// the presence it gets back, and a stand-in radio a test can put in place.
const wiring = vi.hoisted(() => ({
    options: null,
    presence: null,
    radio: null,
}));

vi.mock("./composables/useWorldPresence.js", async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useWorldPresence(options) {
            wiring.options = options;
            wiring.presence = actual.useWorldPresence(options);
            return wiring.presence;
        },
    };
});

vi.mock("./composables/useRadio.js", async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useRadio: (...args) => wiring.radio ?? actual.useRadio(...args),
    };
});

// The drum's sound and a clock's tick, so a test can hear them, and
// whether audio has started (a room's clocks only tick once it has).
const sounds = vi.hoisted(() => ({ drum: null, tick: null, running: false }));

vi.mock("./drumSounds.js", async (importOriginal) => ({
    ...(await importOriginal()),
    playDrum: (...args) => sounds.drum?.(...args),
}));

vi.mock("./clockSounds.js", async (importOriginal) => ({
    ...(await importOriginal()),
    playTick: (...args) => sounds.tick?.(...args),
}));

vi.mock("@/composables/useAudioContext", async (importOriginal) => ({
    ...(await importOriginal()),
    audioRunning: () => sounds.running,
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
    {
        slug: "boom",
        name: "Poop Boom",
        figure: "guster",
        cast: "toilet",
        x: 2400,
    },
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
    wiring.radio = null;
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
        // Toot Foods plays in the world, so its card starts it here.
        expect(wrapper.findComponent({ name: "Link" }).exists()).toBe(false);
        expect(dialog.find(".world-card-action").exists()).toBe(true);
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

    it("hangs a room's photos as decor, with nothing to tap", async () => {
        const hall = withHouse["house.hall"];
        wrapper = await mountWorld({
            ...withHouse,
            "house.hall": {
                ...hall,
                photos: [
                    {
                        id: "hank-left",
                        x: 300,
                        y: 240,
                        image: { src: "/hank.jpg", w: 120, h: 160 },
                    },
                    { id: "blank", x: 600, y: 240, image: { w: 120, h: 160 } },
                ],
            },
        });
        await enterHouse(wrapper);

        // The blank one is only its panel.
        expect(wrapper.findAll("img.room-photo")).toHaveLength(1);
        const photo = wrapper.get("img.room-photo");
        expect(photo.attributes("src")).toBe("/hank.jpg");
        expect(photo.element.closest("button")).toBeNull();
        expect(photo.attributes("style")).toContain("width");
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

describe("GamesWorld clocks", () => {
    const CLOCK = {
        id: "grandfather-clock",
        type: "toy",
        x: 450,
        z: 0,
        model: "grandfather-clock",
        size: 300,
        label: "Clock",
    };
    const hall = withHouse["house.hall"];
    const withClock = {
        ...withHouse,
        "house.hall": {
            ...hall,
            interactables: [...hall.interactables, CLOCK],
        },
    };

    afterEach(() => {
        sounds.tick = null;
        sounds.running = false;
    });

    it("ticks a pendulum clock once a swing, as loud as the Butt is near it, once audio's running", async () => {
        sounds.tick = vi.fn();
        wrapper = await mountWorld(withClock);
        await enterHouse(wrapper);

        // Before any sound has played, it ticks silently.
        await frames(1100);
        expect(sounds.tick).not.toHaveBeenCalled();

        sounds.running = true;
        await frames(2100);
        const levels = sounds.tick.mock.calls.map(([level]) => level);
        expect(levels.length).toBeGreaterThanOrEqual(1);
        expect(levels.length).toBeLessThanOrEqual(3);
        // The Butt stands 330 out from it, so it isn't at its loudest.
        for (const level of levels) {
            expect(level).toBeGreaterThan(0);
            expect(level).toBeLessThan(tickLevel(0));
        }
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

    it("plays a game over the road and comes back to the same spot", async () => {
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
    });

    it("stops drawing the world while a game covers it", async () => {
        wrapper = await mountWorld(withCockroach);
        const gl = fake.renderers[0];
        await landmark("Cockroach Fart").trigger("click");
        await nextTick();
        await wrapper.get(".world-card-action").trigger("click");
        await flushPromises();

        await frames(20);
        const calls = gl.render.mock.calls.length;
        await frames(80);
        expect(gl.render.mock.calls.length).toBe(calls);

        await wrapper.get(".game-host").trigger("keydown", { key: "Escape" });
        await nextTick();
        await wrapper.get(".stage").trigger("keydown", { key: "ArrowRight" });
        await frames(80);
        expect(gl.render.mock.calls.length).toBeGreaterThan(calls);
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

describe("GamesWorld together", () => {
    let echo;
    // vitest.setup.js's page, put back after each test.
    const setupPage = usePage.getMockImplementation();

    /** The page as a visitor sees it, with the together switch on or off,
     * and messaging; `users` who could be invited. */
    function asVisitor({
        together,
        messaging = false,
        user = { id: 7, name: "Me" },
        users = [],
    }) {
        usePage.mockReturnValue({
            props: {
                auth: { user },
                users,
                settings: {
                    world_together_enabled: together ? "1" : "0",
                    messaging_enabled: messaging ? "1" : "0",
                },
            },
        });
    }

    // Echo with a channel per name that keeps its callbacks, so a test can
    // play people arriving and whispering. No Pusher connection is opened.
    let channels;

    beforeEach(() => {
        channels = {};
        echo = {
            join: vi.fn((name) => {
                const handlers = { whispers: {} };
                const channel = {
                    handlers,
                    whisper: vi.fn(),
                    listenForWhisper: (event, fn) => (
                        (handlers.whispers[event] = fn), channel
                    ),
                };
                for (const on of ["here", "joining", "leaving", "error"]) {
                    channel[on] = (fn) => ((handlers[on] = fn), channel);
                }
                channels[name] = channel;
                return channel;
            }),
            leave: vi.fn(),
        };
        window.Echo = echo;
    });

    afterEach(() => {
        delete window.Echo;
        usePage.mockImplementation(setupPage);
    });

    const roadChannel = () =>
        Object.entries(channels).find(([name]) =>
            /(^|\.)world\.road$/.test(name)
        );

    it("joins the roster and the road while the switch is on, and leaves them with the world", async () => {
        asVisitor({ together: true });
        wrapper = await mountWorld();

        const joined = echo.join.mock.calls.map(([name]) => name);
        expect(joined).toHaveLength(2);
        expect(joined[0]).toMatch(/(^|\.)world$/);
        expect(joined[1]).toMatch(/(^|\.)world\.road$/);

        wrapper.unmount();
        wrapper = null;
        expect(echo.leave.mock.calls.map(([name]) => name).sort()).toEqual(
            [...joined].sort()
        );
    });

    it("draws someone else on the street with their name", async () => {
        asVisitor({ together: true });
        wrapper = await mountWorld();
        const [, road] = roadChannel();
        road.handlers.here([
            { id: 7, name: "Me" },
            { id: 8, name: "Friend" },
        ]);

        road.handlers.whispers.place(
            { scene: "road", x: 900, z: 0, lane: 0 },
            { user_id: "8" }
        );
        await showing(wrapper, ".other-name");

        expect(wrapper.get(".other-name").text()).toBe("Friend");
        // Arriving, you said where you are.
        expect(road.whisper).toHaveBeenCalledWith(
            "place",
            expect.objectContaining({ scene: "road", z: 0, lane: 0 })
        );

        road.handlers.leaving({ id: 8, name: "Friend" });
        await nextTick();
        expect(wrapper.find(".other-name").exists()).toBe(false);
    });

    it("draws someone else on the street without WebGL too", async () => {
        fake.webgl = false;
        asVisitor({ together: true });
        wrapper = await mountWorld();
        const [, road] = roadChannel();
        road.handlers.here([
            { id: 7, name: "Me" },
            { id: 8, name: "Friend" },
        ]);

        road.handlers.whispers.move(
            { x: 900, z: 0, lane: 1, facing: -1, moving: 0 },
            { user_id: 8 }
        );
        await showing(wrapper, ".road-scene .butt.other");

        expect(wrapper.get(".butt.other .other-name").text()).toBe("Friend");
    });

    const channel = (pattern) =>
        Object.entries(channels).find(([name]) => pattern.test(name));
    const rosterChannel = () => channel(/(^|\.)world$/)[1];
    const hallChannel = () => channel(/(^|\.)world\.house\.hall$/)?.[1];

    it("moves from the road's channel to a room's and back outside", async () => {
        asVisitor({ together: true });
        wrapper = await mountWorld(withHouse);
        const [roadName] = roadChannel();

        await enterHouse(wrapper);
        expect(echo.leave).toHaveBeenCalledWith(roadName);
        expect(hallChannel()).toBeTruthy();

        await wrapper.get(".stage").trigger("keydown", { key: "Escape" });
        await showing(wrapper, ".road-3d");
        expect(
            echo.join.mock.calls.filter(([name]) => name === roadName)
        ).toHaveLength(2);
    });

    it("draws someone else in a room with their name", async () => {
        asVisitor({ together: true });
        wrapper = await mountWorld(withHouse);
        await enterHouse(wrapper);
        const hall = hallChannel();
        hall.handlers.here([
            { id: 7, name: "Me" },
            { id: 8, name: "Friend" },
        ]);

        // Arriving, you said where you are in it.
        expect(hall.whisper).toHaveBeenCalledWith(
            "place",
            expect.objectContaining({ scene: "house.hall", lane: 0 })
        );

        hall.handlers.whispers.move(
            { x: 300, z: 200, lane: 0, facing: 1, moving: 0 },
            { user_id: 8 }
        );
        await showing(wrapper, ".room-3d .visitor .other-name");
        expect(wrapper.get(".visitor .other-name").text()).toBe("Friend");
    });

    it("lists who is in the world and where, and says where you are", async () => {
        asVisitor({ together: true });
        wrapper = await mountWorld(withHouse);
        const roster = rosterChannel();
        roster.handlers.here([
            { id: 7, name: "Me" },
            { id: 8, name: "Friend" },
        ]);

        expect(roster.whisper).toHaveBeenCalledWith("place", {
            scene: "road",
        });

        roster.handlers.whispers.place(
            { scene: "house.hall", x: 300, z: 200, lane: 0 },
            { user_id: 8 }
        );
        await wrapper.get(".roster-toggle").trigger("click");

        const rows = wrapper.findAll(".roster-panel li");
        expect(rows).toHaveLength(1);
        expect(rows[0].get(".roster-name").text()).toBe("Friend");
        expect(rows[0].get(".roster-place").text()).toBe("The Hall");
    });

    it("follows someone tapped on the street, and stops when you steer", async () => {
        asVisitor({ together: true });
        wrapper = await mountWorld(withHouse);
        const people = [
            { id: 7, name: "Me" },
            { id: 8, name: "Friend" },
        ];
        rosterChannel().handlers.here(people);
        rosterChannel().handlers.whispers.place(
            { scene: "road", x: 900, z: 0, lane: 0 },
            { user_id: 8 }
        );
        const [, road] = roadChannel();
        road.handlers.here(people);
        road.handlers.whispers.place(
            { scene: "road", x: 900, z: 0, lane: 0 },
            { user_id: 8 }
        );
        await showing(wrapper, ".road-3d button.other");

        await wrapper.get("button.other").trigger("click");
        await nextTick();
        expect(wrapper.find(".roster-chip").exists()).toBe(true);

        await wrapper.get(".stage").trigger("keydown", { key: "ArrowLeft" });
        expect(wrapper.find(".roster-chip").exists()).toBe(false);
    });

    it("follows someone through a door into the room they're in", async () => {
        asVisitor({ together: true });
        wrapper = await mountWorld(withHouse);
        const roster = rosterChannel();
        roster.handlers.here([
            { id: 7, name: "Me" },
            { id: 8, name: "Friend" },
        ]);
        roster.handlers.whispers.place(
            { scene: "house.hall", x: 300, z: 200, lane: 0 },
            { user_id: 8 }
        );
        await wrapper.get(".roster-toggle").trigger("click");

        await wrapper.get(".roster-panel .roster-action").trigger("click");

        await vi.waitFor(
            () => {
                if (!wrapper.find(".room-3d").exists()) {
                    throw new Error("not in yet");
                }
            },
            { timeout: 8000 }
        );
        // Still following, in there.
        expect(wrapper.find(".roster-chip").exists()).toBe(true);
    }, 10000);

    // A link of its own each time, so a visit saved by another test
    // doesn't read as coming back to it.
    const inviteFrom = (id) => ({
        scene: "road",
        with: id,
        visit: `invite-${Math.random()}`,
    });

    it("follows whoever sent an invite's link once they're on the roster", async () => {
        asVisitor({ together: true });
        wrapper = await mountWorld(withHouse, { link: inviteFrom(8) });
        expect(wrapper.find(".roster-chip").exists()).toBe(false);

        rosterChannel().handlers.here([
            { id: 7, name: "Me" },
            { id: 8, name: "Friend" },
        ]);
        await nextTick();

        expect(wrapper.find(".roster-chip").exists()).toBe(true);
    });

    it("only opens the place when whoever sent the invite has left", async () => {
        asVisitor({ together: true });
        wrapper = await mountWorld(withHouse, { link: inviteFrom(8) });
        const roster = rosterChannel();

        roster.handlers.here([{ id: 7, name: "Me" }]);
        roster.handlers.joining({ id: 8, name: "Friend" });
        await nextTick();

        expect(wrapper.find(".roster-chip").exists()).toBe(false);
    });

    it("doesn't follow an inviter once you've steered", async () => {
        asVisitor({ together: true });
        wrapper = await mountWorld(withHouse, { link: inviteFrom(8) });

        await wrapper.get(".stage").trigger("keydown", { key: "ArrowLeft" });
        rosterChannel().handlers.here([
            { id: 7, name: "Me" },
            { id: 8, name: "Friend" },
        ]);
        await nextTick();

        expect(wrapper.find(".roster-chip").exists()).toBe(false);
    });

    it("invites people picked into the place you're in", async () => {
        inertia.post.mockClear();
        asVisitor({
            together: true,
            messaging: true,
            users: [
                { id: 7, name: "Me" },
                { id: 8, name: "Friend" },
                { id: 9, name: "Pal" },
            ],
        });
        wrapper = await mountWorld(withHouse);
        await wrapper.get(".roster-toggle").trigger("click");
        await wrapper.get(".roster-invite").trigger("click");

        // Everyone but you, whether or not they're in the world.
        const picks = wrapper.findAll(".roster-pick");
        expect(picks.map((pick) => pick.text())).toEqual(["Friend", "Pal"]);
        expect(wrapper.get("button[type=submit]").element.disabled).toBe(true);

        await picks[0].get("input").setValue(true);
        await picks[1].get("input").setValue(true);
        await wrapper.get("form.roster-panel").trigger("submit");

        expect(inertia.post).toHaveBeenCalledOnce();
        expect(inertia.post).toHaveBeenCalledWith(
            "/games/invite",
            { scene: "road", tagged_user_ids: [8, 9] },
            expect.objectContaining({ preserveState: true })
        );
        expect(wrapper.find(".roster-pick").exists()).toBe(false);
    });

    it("closes the invite picker on Escape, staying in the room", async () => {
        asVisitor({
            together: true,
            messaging: true,
            users: [{ id: 8, name: "Friend" }],
        });
        wrapper = await mountWorld(withHouse);
        await enterHouse(wrapper);
        await wrapper.get(".roster-toggle").trigger("click");
        await wrapper.get(".roster-invite").trigger("click");
        expect(document.activeElement).toBe(
            wrapper.get(".roster-pick input").element
        );

        await wrapper
            .get(".roster-pick input")
            .trigger("keydown", { key: "Escape" });

        expect(wrapper.find(".roster-pick").exists()).toBe(false);
        expect(wrapper.find(".room-3d").exists()).toBe(true);
        expect(document.activeElement).toBe(
            wrapper.get(".roster-toggle").element
        );
    });

    it("offers no invite while messaging is off", async () => {
        asVisitor({
            together: true,
            users: [{ id: 8, name: "Friend" }],
        });
        wrapper = await mountWorld(withHouse);
        await wrapper.get(".roster-toggle").trigger("click");

        expect(wrapper.find(".roster-invite").exists()).toBe(false);
    });

    it("joins nothing while the switch is off", async () => {
        asVisitor({ together: false });
        wrapper = await mountWorld();
        wrapper.unmount();
        wrapper = null;

        expect(echo.join).not.toHaveBeenCalled();
        expect(echo.leave).not.toHaveBeenCalled();
    });

    it("joins nothing for a guest", async () => {
        asVisitor({ together: true, user: null });
        wrapper = await mountWorld();

        expect(echo.join).not.toHaveBeenCalled();
    });

    describe("radio", () => {
        const SONGS = [
            { id: 1, title: "One" },
            { id: 2, title: "Two" },
        ];
        const RADIO = {
            id: "radio",
            type: "radio",
            x: 300,
            z: 100,
            emoji: "📻",
            label: "Radio",
            songs: SONGS,
        };
        const hall = withHouse["house.hall"];
        const withRadio = {
            ...withHouse,
            "house.hall": {
                ...hall,
                interactables: [...hall.interactables, RADIO],
            },
        };

        /** A radio whose `started` resolves when the test says. */
        function standInRadio() {
            let start;
            wiring.radio = {
                tune: vi.fn(() => SONGS[0]),
                started: vi.fn(
                    () => new Promise((resolve) => (start = resolve))
                ),
                start: (at) => start(at),
                nowPlaying: vi.fn(() => ({ songId: 2, startedAt: 5000 })),
                join: vi.fn(),
                stop: vi.fn(),
                isOn: () => false,
                dispose: vi.fn(),
            };
            return wiring.radio;
        }

        async function tapRadio() {
            const button = wrapper
                .findAll("button.room-item")
                .find((b) => b.attributes("aria-label") === "Radio");
            await button.trigger("focus");
            await nextTick();
            await button.trigger("click");
            await flushPromises();
        }

        async function inTheHall({ together = true } = {}) {
            asVisitor({ together });
            const radio = standInRadio();
            wrapper = await mountWorld(withRadio);
            await enterHouse(wrapper);
            const tell = vi.fn();
            wiring.presence.radio = tell;
            return { radio, tell };
        }

        it("tells the room a tuned song once it's playing", async () => {
            const { radio, tell } = await inTheHall();

            await tapRadio();
            expect(radio.tune).toHaveBeenCalledWith(SONGS);
            expect(tell).not.toHaveBeenCalled();

            radio.start(4000);
            await flushPromises();
            expect(tell).toHaveBeenCalledWith({
                id: "radio",
                songId: 1,
                startedAt: 4000,
            });
        });

        it("tells the room it's switched off", async () => {
            const { radio, tell } = await inTheHall();
            radio.tune.mockReturnValue(null);

            await tapRadio();

            expect(radio.started).not.toHaveBeenCalled();
            expect(tell).toHaveBeenCalledWith({ id: "radio", songId: null });
        });

        it("only tunes with the together switch off", async () => {
            const { radio, tell } = await inTheHall({ together: false });

            await tapRadio();

            expect(radio.tune).toHaveBeenCalled();
            expect(radio.started).not.toHaveBeenCalled();
            expect(tell).not.toHaveBeenCalled();
        });

        it("tells nobody of a song that starts after going through a door", async () => {
            const { radio, tell } = await inTheHall();
            await tapRadio();

            await wrapper.get(".stage").trigger("keydown", { key: "Escape" });
            await showing(wrapper, ".road-3d");
            radio.start(4000);
            await flushPromises();

            expect(tell).not.toHaveBeenCalled();
        });

        it("plays and stops what someone else here tunes", async () => {
            const { radio } = await inTheHall();
            const { hearRadio } = wiring.options;

            hearRadio({ id: "nowhere", songId: 1, startedAt: 4000 });
            expect(radio.join).not.toHaveBeenCalled();
            expect(radio.stop).not.toHaveBeenCalled();

            hearRadio({ id: "radio", songId: 2, startedAt: 4000 });
            expect(radio.join).toHaveBeenCalledWith(SONGS, 2, 4000);

            hearRadio({ id: "radio", songId: null });
            expect(radio.stop).toHaveBeenCalledWith(SONGS);
        });

        it("says what's on the radio asked about", async () => {
            const { radio } = await inTheHall();
            const { radioNow } = wiring.options;

            expect(radioNow("radio")).toEqual({ songId: 2, startedAt: 5000 });
            expect(radio.nowPlaying).toHaveBeenCalledWith(SONGS);
            expect(radioNow("nowhere")).toBeNull();
        });

        it("gives up waiting on the radio when the world goes", async () => {
            const { radio } = await inTheHall();

            wrapper.unmount();
            wrapper = null;

            expect(radio.dispose).toHaveBeenCalled();
        });
    });

    describe("instruments", () => {
        const DRUM = {
            id: "bass-drum",
            type: "drum",
            x: 500,
            z: 100,
            stand: 170,
            label: "Bass drum",
        };
        const hall = withHouse["house.hall"];
        const withDrum = {
            ...withHouse,
            "house.hall": {
                ...hall,
                interactables: [...hall.interactables, DRUM],
            },
        };

        async function inTheHall() {
            asVisitor({ together: true });
            sounds.drum = vi.fn();
            wrapper = await mountWorld(withDrum);
            await enterHouse(wrapper);
            const tell = vi.fn();
            wiring.presence.note = tell;
            return { tell };
        }

        afterEach(() => {
            sounds.drum = null;
        });

        it("tells the room what was played, once it has played here", async () => {
            const { tell } = await inTheHall();

            // Enter on the head: a hit in the middle.
            await wrapper.get("button.drum-head").trigger("click");

            expect(sounds.drum).toHaveBeenCalledExactlyOnceWith(0);
            expect(tell).toHaveBeenCalledExactlyOnceWith({
                id: "bass-drum",
                which: [0],
            });
        });

        it("plays what someone else here played, and nothing else", async () => {
            await inTheHall();
            const { hearNote } = wiring.options;

            hearNote({ id: "nowhere", which: [50] });
            hearNote({ id: "bass-drum", which: [500] });
            expect(sounds.drum).not.toHaveBeenCalled();

            hearNote({ id: "bass-drum", which: [50] });
            expect(sounds.drum).toHaveBeenCalledExactlyOnceWith(0.5);
        });
    });
});
