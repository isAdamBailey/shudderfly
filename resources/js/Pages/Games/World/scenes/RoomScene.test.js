import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCastKit } from "@/Components/Games/Cast/three/castMesh.js";
import { frameBorder } from "../three/pictureFrame.js";
import { createRoomScene } from "./RoomScene.js";
import { roomCamera, roomLayout } from "./roomLayout.js";

const createCanvas = () => ({ width: 1, height: 1, getContext: () => null });

const hall = {
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
        { id: "front-door", type: "door", x: 450, z: 0, emoji: "🚪" },
        {
            id: "doorbell",
            type: "toy",
            x: 560,
            z: 0,
            y: 120,
            size: 50,
            emoji: "🔔",
        },
        { id: "strawberry", type: "toy", x: 180, z: 260, cast: "strawberry" },
    ],
};

let spy;
beforeEach(() => {
    spy = vi
        .spyOn(HTMLCanvasElement.prototype, "getContext")
        .mockReturnValue(null);
});
afterEach(() => spy.mockRestore());

function build(room = hall, theme = "", night = false) {
    const kit = createCastKit(THREE, { createCanvas });
    const graph = createRoomScene(THREE, kit, {
        room,
        butt: { x: 450, z: 330 },
        theme,
        night,
    });
    graph.layout(roomLayout(room, { w: 1000, h: 700 }));
    return graph;
}

/** The daylight's sky fill in `graph`. */
const fill = (graph) =>
    graph.scene.getObjectsByProperty("isHemisphereLight", true)[0].intensity;

/** How many meshes `graph` draws. */
function meshes(graph) {
    let n = 0;
    graph.scene.traverse((o) => o.isMesh && o.visible && n++);
    return n;
}

const view = (overrides = {}) => ({
    butt: { x: 450, z: 330, facing: 1, walking: false },
    buttLift: 0,
    reduced: true,
    ...overrides,
});

describe("the room's scene graph", () => {
    it("has the same daylight in every room, with one light casting shadows", () => {
        const graph = build();
        const other = build({
            ...hall,
            size: { w: 1500, d: 450 },
            walls: { back: "stone", floor: "flagstones" },
            // Rooms no longer set their own daylight: an old one is ignored.
            ambient: 0.1,
            lights: [],
        });
        const casters = [];
        graph.scene.traverse(
            (o) => o.isLight && o.castShadow && casters.push(o)
        );

        expect(fill(other)).toBe(fill(graph));
        expect(casters).toHaveLength(1);
    });

    it("switches a lamp off and on again", () => {
        const graph = build();
        const lamp = graph.scene.getObjectsByProperty("isPointLight", true)[0];
        const on = lamp.intensity;
        expect(on).toBeGreaterThan(0);

        // Off is dark, not hidden: hiding a light recompiles every shader.
        expect(graph.toggleLight("lamp")).toBe(false);
        expect(lamp.intensity).toBe(0);
        expect(lamp.visible).toBe(true);
        expect(graph.toggleLight("lamp")).toBe(true);
        expect(lamp.intensity).toBe(on);
        expect(graph.toggleLight("chandelier")).toBeNull();
    });

    it("lights the bulb itself, and the light sits on it", () => {
        const graph = build({
            ...hall,
            interactables: [
                ...hall.interactables,
                {
                    id: "lamp-switch",
                    type: "toy",
                    x: 760,
                    z: 140,
                    emoji: "💡",
                    light: "lamp",
                },
            ],
        });
        const bulb = graph.scene.getObjectByName("bulb");
        const lamp = graph.scene.getObjectsByProperty("isPointLight", true)[0];

        expect(graph.scene.getObjectByName("bulb-glow")).toBeUndefined();
        expect(bulb.material.emissiveIntensity).toBeGreaterThan(0);
        expect(bulb.material.emissive.getHexString()).toBe("fbbf24");
        // The lamp's data hangs the light at y 200, above the floor bulb.
        expect(lamp.position.y).toBe(40);

        graph.toggleLight("lamp");
        expect(bulb.material.emissiveIntensity).toBe(0);
        expect(lamp.intensity).toBe(0);
        graph.toggleLight("lamp");
        expect(bulb.material.emissiveIntensity).toBeGreaterThan(0);
        graph.dispose();
    });

    it("switches several lamps together, and the switch glows with them", () => {
        const reading = (id, x) => ({
            id,
            x,
            y: 440,
            z: 140,
            color: "#fcd34d",
            intensity: 1.3,
        });
        const graph = build({
            ...hall,
            lights: [reading("reading-1", 300), reading("reading-2", 600)],
            interactables: [
                {
                    id: "light-switch",
                    type: "toy",
                    x: 220,
                    z: 390,
                    emoji: "💡",
                    light: ["reading-1", "reading-2"],
                },
            ],
        });
        const lamps = graph.scene.getObjectsByProperty("isPointLight", true);
        const glow = graph.scene.getObjectByName("bulb").material;

        // Left where their data hangs them, not moved onto the switch.
        expect(lamps.map((l) => l.position.x)).toEqual([300, 600]);
        expect(glow.emissiveIntensity).toBeGreaterThan(0);
        expect(graph.toggleLight(["reading-1", "reading-2"])).toBe(false);
        expect(lamps.every((l) => l.intensity === 0)).toBe(true);
        expect(glow.emissiveIntensity).toBe(0);
        expect(graph.toggleLight(["reading-1", "reading-2"])).toBe(true);
        expect(lamps.every((l) => l.intensity > 0)).toBe(true);
        graph.dispose();
    });

    it("draws a lamp no toy is the bulb of as its own glowing glyph", () => {
        const graph = build({
            ...hall,
            lights: [{ ...hall.lights[0], emoji: "💡" }],
        });
        const glyph = graph.scene.getObjectByName("bulb");

        expect(glyph.material.emissiveIntensity).toBeGreaterThan(0);
        graph.toggleLight("lamp");
        expect(glyph.material.emissiveIntensity).toBe(0);
        expect(meshes(graph)).toBeGreaterThan(meshes(build()));
        graph.dispose();
    });

    it("falls to night: the daylight dims and every lamp comes on", () => {
        const day = build();
        const lamp = day.scene.getObjectsByProperty("isPointLight", true)[0];
        const daylight = fill(day);
        day.toggleLight("lamp");
        day.sync(view({ reduced: false }), 0);

        day.setNight(true);
        expect(lamp.intensity).toBeGreaterThan(0);
        // Eases over about 300 ms, rather than snapping.
        expect(day.sync(view({ reduced: false }), 0.1)).toBe(true);
        expect(fill(day)).toBeLessThan(daylight);
        expect(fill(day)).toBeGreaterThan(fill(build(hall, "", true)));
        day.sync(view({ reduced: false }), 0.5);
        expect(fill(day)).toBeCloseTo(fill(build(hall, "", true)));

        // And lifts again, leaving the lamps as they are.
        day.setNight(false);
        day.sync(view({ reduced: false }), 0.5);
        expect(fill(day)).toBeCloseTo(daylight);
        expect(lamp.intensity).toBeGreaterThan(0);
    });

    it("gives the Butt a faint glow when the lamps are off, and a little at night", () => {
        const graph = build();
        const glow = () =>
            graph.scene.getObjectByName("butt-glow").material.emissiveIntensity;

        expect(glow()).toBe(0);
        graph.toggleLight("lamp");
        expect(glow()).toBeGreaterThan(0);
        expect(glow()).toBeLessThan(0.5);
        const dark = glow();

        graph.toggleLight("lamp");
        graph.setNight(true);
        graph.sync(view(), 0.01);
        expect(glow()).toBeGreaterThan(0);
        expect(glow()).toBeLessThan(dark);
        graph.dispose();
    });

    it("switches night at once under reduced motion, season and all", () => {
        const graph = build(hall, "halloween");
        graph.sync(view(), 0);

        graph.setNight(true);
        graph.sync(view(), 0.01);
        expect(fill(graph)).toBeCloseTo(fill(build(hall, "halloween", true)));
        expect(fill(build(hall, "halloween", true))).toBeLessThan(
            fill(build(hall, "", true))
        );
    });

    it("aims the camera again only when it's handed a new one", () => {
        const long = { ...hall, size: { w: 2200, d: 500 }, frame: 900 };
        const graph = build(long);
        const L = roomLayout(long, { w: 1000, h: 700 });
        graph.layout(L);
        graph.sync(view({ camera: L.camera }), 0);

        expect(graph.sync(view({ camera: L.camera }), 0)).toBe(false);
        const along = roomCamera(L, 1600);
        expect(graph.sync(view({ camera: along }), 0)).toBe(true);
        expect(graph.camera.position.x).toBe(along.x);
        expect(graph.camera.rotation.y).toBe(0);
    });

    it("turns the camera to the wall its view faces", () => {
        const graph = build();
        const L = roomLayout(hall, { w: 1000, h: 700 }, "left");
        graph.layout(L);

        expect(graph.camera.rotation.y).toBeCloseTo(Math.PI / 2);
        // Standing in the room's frame, out past the right wall's side.
        expect(graph.camera.position.x).toBeCloseTo(L.camera.z);
        expect(graph.camera.position.z).toBeCloseTo(500 - L.camera.x);
    });

    it("walks the Butt about the floor", () => {
        const graph = build();
        graph.sync(view(), 0);

        expect(
            graph.sync(
                view({ butt: { x: 200, z: 100, facing: -1, walking: true } }),
                1 / 60
            )
        ).toBe(true);
        expect(
            graph.sync(
                view({ butt: { x: 200, z: 100, facing: -1, walking: true } }),
                0
            )
        ).toBe(false);
    });

    it("plays a toy's move, a prop's as well as a character's", () => {
        const graph = build();
        graph.sync(view({ reduced: false }), 0);

        graph.animate("doorbell", "wiggle");
        graph.animate("strawberry", "hop");

        expect(graph.sync(view({ reduced: false }), 1 / 60)).toBe(true);
        expect(() => graph.animate("nothing", "hop")).not.toThrow();
    });

    it("turns a door on a side wall to face into the room", () => {
        const graph = build({
            ...hall,
            interactables: [
                {
                    id: "kitchen-door",
                    type: "door",
                    x: 0,
                    z: 200,
                    wall: "left",
                    emoji: "🚪",
                },
            ],
        });
        const door = graph.scene.children.find(
            (child) => child.position.z === 200
        );

        expect(door.position.x).toBe(3);
        expect(door.rotation.y).toBeCloseTo(Math.PI / 2);
        graph.dispose();
    });

    it("crawls little cockroaches across a wall that asks for them", () => {
        const plain = build();
        const graph = build({ ...hall, crawlers: true });
        const roaches = graph.scene.getObjectByName("wall-crawlers").children;
        const before = roaches[0].position.x;

        expect(roaches).toHaveLength(6);
        expect(roaches[0].material.opacity).toBeGreaterThan(0);
        expect(plain.scene.getObjectByName("wall-crawlers")).toBeUndefined();
        expect(graph.sync(view({ reduced: false }), 1)).toBe(true);
        expect(roaches[0].position.x).not.toBe(before);
        graph.dispose();
        plain.dispose();
    });

    it("dresses up for the season: dimmer at Halloween, decorations on the wall", () => {
        const everyday = build();

        expect(fill(build(hall, "halloween"))).toBeLessThan(fill(everyday));
        expect(meshes(build(hall, "christmas"))).toBeGreaterThan(
            meshes(everyday)
        );
        expect(meshes(build(hall, "constructor"))).toBe(meshes(everyday));
    });

    it("stays well inside the draw-call budget, and survives a resize", () => {
        // As busy as the kitchen, in its Christmas best.
        const busy = {
            ...hall,
            interactables: [
                ...hall.interactables,
                { id: "game", type: "game", x: 360, z: 40, emoji: "🍔" },
                { id: "pizza", type: "game", x: 600, z: 180, cast: "pizza" },
                { id: "pot", type: "toy", x: 200, z: 290, emoji: "🍲" },
                { id: "grapes", type: "toy", x: 710, z: 320, cast: "grapes" },
                { id: "apple", type: "toy", x: 820, z: 300, cast: "apple" },
            ],
        };
        const graph = build(busy, "christmas");
        graph.layout(roomLayout(busy, { w: 375, h: 560 }));
        expect(meshes(graph)).toBeLessThanOrEqual(40);
        graph.dispose();
    });

    it("puts a long wall of books up in one draw call, with a bookcase each", () => {
        const shelf = (id, x, count) => ({
            id,
            category: id,
            count,
            x,
            rows: 3,
            span: 110,
            perPage: 10,
        });
        const library = {
            ...hall,
            size: { w: 3000, d: 450 },
            frame: 900,
            shelves: [shelf("popular", 240, 9), shelf("people", 700, 200)],
        };
        const graph = build(library);
        const books = graph.scene.getObjectsByProperty("isInstancedMesh", true);

        expect(books).toHaveLength(1);
        expect(books[0].count).toBe(209);
        expect(meshes(graph) - meshes(build(hall))).toBe(3);
        graph.dispose();
    });

    it("stands a modelled radio and table lamp on an entertainment center, each lighting up", () => {
        const den = {
            ...hall,
            entertainment: [{ x: 300, w: 380, h: 120, d: 36 }],
            lights: [
                ...hall.lights,
                {
                    id: "table-lamp",
                    x: 180,
                    z: 16,
                    y: 190,
                    color: "#ffd58a",
                    intensity: 1.1,
                },
            ],
            interactables: [
                ...hall.interactables,
                {
                    id: "radio",
                    type: "radio",
                    x: 300,
                    z: 16,
                    y: 120,
                    size: 100,
                    emoji: "📻",
                    model: "radio",
                },
                {
                    id: "table-lamp",
                    type: "toy",
                    x: 180,
                    z: 16,
                    y: 120,
                    size: 110,
                    model: "table-lamp",
                    light: "table-lamp",
                },
            ],
        };
        const graph = build(den);
        const meshes = graph.scene.getObjectsByProperty("isMesh", true);
        // Modelled, not a card: a lacquered cabinet the lamps fall on.
        expect(meshes.some((m) => m.material.clearcoat > 0)).toBe(true);
        const dial = meshes.find(
            (m) =>
                m.material.emissiveMap && m.geometry.type === "CircleGeometry"
        ).material;
        expect(dial.emissiveIntensity).toBe(0);
        graph.setOn("radio", true);
        expect(dial.emissiveIntensity).toBeGreaterThan(0);
        graph.setOn("radio", false);
        expect(dial.emissiveIntensity).toBe(0);

        // The table lamp's shade glows while its light is on, which hangs
        // inside it.
        const shade = meshes.find(
            (m) =>
                m.geometry.type === "CylinderGeometry" &&
                m.material.emissive &&
                m.material.side === THREE.DoubleSide
        ).material;
        const light = graph.scene
            .getObjectsByProperty("isPointLight", true)
            .find((l) => l.position.x === 180);
        expect(light.position.y).toBeGreaterThan(120 + 110 * 0.5);
        expect(shade.emissiveIntensity).toBeGreaterThan(0);
        graph.toggleLight("table-lamp");
        expect(shade.emissiveIntensity).toBe(0);
        expect(light.intensity).toBe(0);
        const center = graph.scene
            .getObjectsByProperty("isMesh", true)
            .filter((m) => m.geometry.attributes.color)
            .map((m) => {
                m.geometry.computeBoundingBox();
                return m.geometry.boundingBox;
            })
            .find((b) => b.min.x < 300 && b.max.x > 300 && b.max.y > 100);
        expect(center.max.y).toBe(120);
        graph.dispose();
    });

    it("builds a pipe organ into its wall, and plays its keys", () => {
        const organ = {
            id: "organ",
            type: "organ",
            wall: "left",
            x: 0,
            z: 250,
        };
        const graph = build({
            ...hall,
            interactables: [...hall.interactables, organ],
        });
        // Turned to face into the room off the left wall.
        const built = graph.scene
            .getObjectsByProperty("isGroup", true)
            .find((g) => g.rotation.y === Math.PI / 2 && g.position.z === 250);
        expect(built).toBeTruthy();

        // Still (the strawberry's idle aside), until a key goes down.
        graph.sync(view(), 0.016);
        expect(graph.sync(view(), 0.016)).toBe(false);
        graph.pressKey("organ", 2, 3);
        expect(graph.sync(view(), 0.05)).toBe(true);
        // Nothing for an organ that isn't there.
        expect(() => graph.pressKey("nope", 0, 0)).not.toThrow();
        graph.dispose();
    });

    it("stands a harp in the room, and rings its strings", () => {
        const harp = { id: "harp", type: "harp", x: 400, z: 30 };
        const graph = build({
            ...hall,
            interactables: [...hall.interactables, harp],
        });
        const built = graph.scene
            .getObjectsByProperty("isGroup", true)
            .find((g) => g.position.x === 400 && g.rotation.y === 0);
        expect(built).toBeTruthy();

        graph.sync(view(), 0.016);
        expect(graph.sync(view(), 0.016)).toBe(false);
        graph.pluckString("harp", 3);
        expect(graph.sync(view(), 0.05)).toBe(true);
        expect(() => graph.pluckString("nope", 0)).not.toThrow();
        graph.dispose();
    });

    it("stands a bass drum in the room, and hits it", () => {
        const drum = { id: "bass-drum", type: "drum", x: 420, z: 40 };
        const graph = build({
            ...hall,
            interactables: [...hall.interactables, drum],
        });
        graph.sync(view(), 0.016);
        expect(graph.sync(view(), 0.016)).toBe(false);
        graph.hitDrum("bass-drum", 0.2);
        expect(graph.sync(view(), 0.05)).toBe(true);
        expect(() => graph.hitDrum("nope")).not.toThrow();
        graph.dispose();
    });

    it("flickers its candles, but not under reduced motion", () => {
        const lit = {
            ...hall,
            lights: [{ ...hall.lights[0], flicker: true }],
        };
        const graph = build(lit);
        const light = graph.scene.getObjectsByProperty("isPointLight", true)[0];
        const steady = light.intensity;

        graph.sync(view({ reduced: false }), 0.1);
        expect(light.intensity).not.toBe(steady);

        graph.sync(view({ reduced: true }), 0.1);
        expect(light.intensity).toBe(steady);
        graph.dispose();
    });

    it("builds a fireplace into its back wall, its mantel where it says", () => {
        const graph = build({
            ...hall,
            fireplaces: [{ x: 450, w: 440, h: 130, d: 50 }],
        });
        const built = graph.scene
            .getObjectsByProperty("isMesh", true)
            .filter((m) => m.geometry.attributes.color)
            .map((m) => new THREE.Box3().setFromObject(m))
            .find((b) => Math.abs((b.min.x + b.max.x) / 2 - 450) < 1);
        expect(built.max.y).toBeCloseTo(130);
        expect(built.min.y).toBeCloseTo(0);
        expect(built.max.x - built.min.x).toBeCloseTo(460);
        graph.dispose();
    });

    it("backs each of the room's photos with a panel where it hangs", () => {
        const graph = build({
            ...hall,
            photos: [{ id: "hank", x: 150, y: 240, image: { w: 120, h: 160 } }],
        });
        expect(meshes(graph)).toBe(meshes(build(hall)) + 1);
        const panel = graph.scene
            .getObjectsByProperty("isMesh", true)
            .map((m) => new THREE.Box3().setFromObject(m))
            .find((b) => Math.abs(b.min.y - 240) < 1);
        expect(panel.max.x - panel.min.x).toBeCloseTo(120);
        expect(panel.max.y - panel.min.y).toBeCloseTo(160);
        graph.dispose();
    });

    it("hangs a picture or photo that names a frame in it, and a plain one on its panel", () => {
        const photo = { id: "hank", x: 150, y: 240, image: { w: 120, h: 160 } };
        // A framed picture is its panel and its frame, in a group.
        const extent = (graph) =>
            new THREE.Box3().setFromObject(
                graph.scene
                    .getObjectsByProperty("isGroup", true)
                    .find(
                        (g) => g.children[0]?.isMesh && g.children[1]?.isGroup
                    )
            );
        const framed = build({
            ...hall,
            photos: [{ ...photo, image: { ...photo.image, frame: "ornate" } }],
        });
        const box = extent(framed);
        expect(box.max.x - box.min.x).toBeCloseTo(
            120 + 2 * frameBorder("ornate")
        );
        expect(box.min.y).toBeCloseTo(240 - frameBorder("ornate"));
        // An unknown frame, or none, is the plain panel.
        expect(meshes(build({ ...hall, photos: [photo] }))).toBe(
            meshes(build(hall)) + 1
        );
        expect(
            meshes(
                build({
                    ...hall,
                    photos: [
                        { ...photo, image: { ...photo.image, frame: "nope" } },
                    ],
                })
            )
        ).toBe(meshes(build(hall)) + 1);
        framed.dispose();
    });

    it("builds an open doorway into its wall instead of a door card", () => {
        const open = {
            ...hall,
            interactables: hall.interactables.map((item) =>
                item.id === "front-door" ? { ...item, open: true } : item
            ),
        };
        const graph = build(open);
        // The door card (its glyph and shadow) goes; its doorway, one mesh,
        // takes its place.
        expect(meshes(graph)).toBe(meshes(build(hall)) - 1);
        const doorway = graph.scene
            .getObjectsByProperty("isMesh", true)
            .find((m) => m.position.x === 450 && m.geometry.attributes.color);
        expect(doorway).toBeTruthy();
        graph.dispose();
    });
});
