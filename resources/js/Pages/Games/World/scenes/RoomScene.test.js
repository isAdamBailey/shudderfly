import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCastKit } from "@/Components/Games/Cast/three/castMesh.js";
import { createRoomScene } from "./RoomScene.js";
import { roomLayout } from "./roomLayout.js";

const createCanvas = () => ({ width: 1, height: 1, getContext: () => null });

const hall = {
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

function build(room = hall, theme = "") {
    const kit = createCastKit(THREE, { createCanvas });
    const graph = createRoomScene(THREE, kit, {
        room,
        butt: { x: 450, z: 330 },
        theme,
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
    it("is lit as dimly as its data says, with one light casting shadows", () => {
        const dim = build();
        const bright = build({ ...hall, ambient: 1, lights: [] });
        const casters = [];
        dim.scene.traverse((o) => o.isLight && o.castShadow && casters.push(o));

        expect(fill(dim)).toBeLessThan(fill(bright));
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
        const door = graph.scene.children.find((child) => child.position.z === 200);

        expect(door.position.x).toBe(3);
        expect(door.rotation.y).toBeCloseTo(Math.PI / 2);
        graph.dispose();
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
});
