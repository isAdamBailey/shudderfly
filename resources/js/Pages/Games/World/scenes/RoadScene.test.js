import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCastKit } from "@/Components/Games/Cast/three/castMesh.js";
import { worldTheme } from "../three/themes.js";
import { createRoadScene } from "./RoadScene.js";
import { roadCamera, roadLayout } from "./roadLayout.js";

const createCanvas = () => ({ width: 1, height: 1, getContext: () => null });

const landmarks = [
    { slug: "sprout-pox", x: 600, landmark: "🏥" },
    { slug: "boom", x: 1500, cast: "toilet" },
];
const idlers = [
    { slug: "sprout-pox", cast: "blueberries", x: 340, row: 0, phase: 0 },
    { slug: "boom", cast: "grapes", x: 1240, row: 1, phase: 0.37 },
];

function view(L, overrides = {}) {
    return {
        camera: roadCamera(L, 0),
        peach: { x: 260, facing: 1 },
        peachLift: 0,
        idlers: idlers.map((i) => ({ ...i, dx: 0, lift: 0, tilt: 0 })),
        near: null,
        hovered: null,
        reduced: false,
        ...overrides,
    };
}

let spy;
beforeEach(() => {
    // jsdom has no 2D canvas for the sky, ridge and road textures.
    spy = vi
        .spyOn(HTMLCanvasElement.prototype, "getContext")
        .mockReturnValue(null);
});
afterEach(() => spy.mockRestore());

function build(theme = "") {
    const kit = createCastKit(THREE, { createCanvas });
    const road = createRoadScene(THREE, kit, {
        theme: worldTheme(theme),
        landmarks,
        idlers,
    });
    const L = roadLayout({ w: 1000, h: 700, vmin: 700 });
    road.layout(L, 2200);
    return { road, L, kit };
}

describe("the road's scene graph", () => {
    it("draws every landmark, idler and the Butt, lit by one shadow-casting light", () => {
        const { road } = build();
        const casters = [];
        const lights = [];
        road.scene.traverse((o) => {
            if (o.isMesh && o.castShadow) casters.push(o);
            if (o.isLight && o.castShadow) lights.push(o);
        });

        // 2 landmarks + 2 idlers + the Butt; the drifters cast none.
        expect(casters).toHaveLength(5);
        expect(lights).toHaveLength(1);
        expect(road.landmarkPuppet("boom")).toBeDefined();
    });

    it("stands landmarks and idlers at their road x and row depth", () => {
        const { road, L } = build();
        road.sync(view(L), 0);

        const toilet = road.landmarkPuppet("boom").group.position;
        expect(toilet.x).toBe(1500);
        expect(toilet.z).toBeCloseTo(L.z.landmark);
        expect(road.butt.group.position.toArray()).toEqual([260, 0, 0]);
    });

    it("carries an idler as far as the finger did on screen", () => {
        const { road, L } = build();
        road.sync(
            view(L, {
                idlers: idlers.map((i) => ({
                    ...i,
                    dx: 50,
                    lift: 30,
                    tilt: 10,
                })),
            }),
            0
        );

        let blueberries;
        road.scene.traverse((o) => {
            if (
                !blueberries &&
                o.isGroup &&
                o.position.x > 340 &&
                o.position.x < 500
            ) {
                blueberries = o;
            }
        });
        const scale = L.scaleAt(L.z.idlers[0]);
        expect(blueberries.position.x).toBeCloseTo(340 + 50 / scale);
    });

    it("follows the camera, and redraws only when something changed", () => {
        const { road, L } = build();
        const reduced = view(L, { reduced: true });

        expect(road.sync(reduced, 0)).toBe(true);
        expect(road.sync(reduced, 0.016)).toBe(false);

        const moved = { ...reduced, camera: roadCamera(L, 100) };
        expect(road.sync(moved, 0.016)).toBe(true);
        expect(road.camera.position.x).toBe(100 + 500);
    });

    it("redraws a walk under reduced motion, when only positions change", () => {
        const { road, L } = build();
        const still = view(L, { reduced: true });
        road.sync(still, 0);
        expect(road.sync(still, 0.016)).toBe(false);

        const walked = { ...still, peach: { x: 280, facing: 1 } };
        expect(road.sync(walked, 0.016)).toBe(true);
        expect(road.butt.group.position.x).toBe(280);
    });

    it("grows the landmark the Butt is at", () => {
        const { road, L } = build();
        road.sync(view(L, { near: "boom" }), 1);

        expect(road.landmarkPuppet("boom").group.scale.x).toBeCloseTo(1.12);
        expect(road.landmarkPuppet("sprout-pox").group.scale.x).toBe(1);
    });

    it("takes its drifters from the seasonal theme", () => {
        const { road, kit } = build("christmas");
        const glyphs = (root) => {
            const found = new Set();
            root.traverse((o) => {
                if (o.isMesh && o.material.alphaTest) found.add(o.material);
            });
            return found;
        };
        // One material per glyph, so the drifters share the snowflake's.
        const [snow] = glyphs(kit.emojiMesh("❄️").group);
        const [cloud] = glyphs(kit.emojiMesh("☁️").group);

        expect(glyphs(road.camera).has(snow)).toBe(true);
        expect(glyphs(road.camera).has(cloud)).toBe(false);
    });

    it("frees what it made, and leaves the kit's shared materials", () => {
        const { road, kit } = build();
        const shared = road.butt.group.getObjectByProperty(
            "castShadow",
            true
        ).material;
        const sharedDispose = vi.spyOn(shared, "dispose");
        let ground;
        road.scene.traverse((o) => {
            if (!ground && o.isMesh && o.receiveShadow) ground = o;
        });
        const groundDispose = vi.spyOn(ground.material, "dispose");

        road.dispose();

        expect(groundDispose).toHaveBeenCalled();
        expect(sharedDispose).not.toHaveBeenCalled();
        kit.dispose();
        expect(sharedDispose).toHaveBeenCalled();
    });
});
