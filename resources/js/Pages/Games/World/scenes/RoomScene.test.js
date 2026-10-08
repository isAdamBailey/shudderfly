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

function build(room = hall) {
    const kit = createCastKit(THREE, { createCanvas });
    const graph = createRoomScene(THREE, kit, {
        room,
        butt: { x: 450, z: 330 },
    });
    graph.layout(roomLayout(room, { w: 1000, h: 700 }));
    return graph;
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
        const fill = (g) =>
            g.scene.getObjectsByProperty("isHemisphereLight", true)[0]
                .intensity;
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

    it("stays well inside the draw-call budget, and survives a resize", () => {
        const graph = build();
        graph.layout(roomLayout(hall, { w: 375, h: 560 }));
        let meshes = 0;
        graph.scene.traverse((o) => {
            if (o.isMesh && o.visible) meshes += 1;
        });

        expect(meshes).toBeLessThanOrEqual(40);
        graph.dispose();
    });
});
