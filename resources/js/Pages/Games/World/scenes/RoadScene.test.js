import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCastKit } from "@/Components/Games/Cast/three/castMesh.js";
import { worldTheme } from "../three/themes.js";
import { createRoadScene } from "./RoadScene.js";
import { buildingBox, roadCamera, roadLayout } from "./roadLayout.js";

const createCanvas = () => ({ width: 1, height: 1, getContext: () => null });

const landmarks = [
    { slug: "sprout-pox", x: 600, side: "far", landmark: "🏥" },
    { slug: "boom", x: 1500, side: "far", cast: "toilet" },
];
const idlers = [
    { slug: "sprout-pox", cast: "blueberries", x: 340, row: 0, phase: 0 },
    { slug: "boom", cast: "grapes", x: 1240, row: 1, phase: 0.37 },
];

function view(L, overrides = {}) {
    return {
        camera: roadCamera(L, 0),
        peach: { x: 260, facing: 1, lane: 0 },
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
    it("lights the street with one shadow-casting light", () => {
        const { road } = build();
        const lights = [];
        road.scene.traverse((o) => {
            if (o.isLight && o.castShadow) lights.push(o);
        });

        expect(lights).toHaveLength(1);
        expect(road.landmarkPuppet("boom")).toBeDefined();
        expect(
            road.butt.group.getObjectByProperty("castShadow", true)
        ).toBeDefined();
    });

    it("stays inside the draw-call budget", () => {
        // The full road: six landmarks over 5800 road px.
        const kit = createCastKit(THREE, { createCanvas });
        const six = Array.from({ length: 6 }, (_, i) => ({
            slug: `game-${i}`,
            x: 600 + i * 900,
            side: "far",
            landmark: "🏥",
        }));
        const road = createRoadScene(THREE, kit, {
            theme: worldTheme("fireworks"),
            landmarks: six,
            idlers: six.map((lm, i) => ({
                slug: lm.slug,
                cast: "apple",
                x: lm.x - 260,
                row: i % 3,
                phase: 0,
            })),
        });
        road.layout(roadLayout({ w: 1000, h: 700, vmin: 700 }), 5800);
        let meshes = 0;
        road.scene.traverse((o) => {
            if (o.isMesh && o.visible) meshes += 1;
        });

        // Issue #130: ≤ ~100 draw calls a scene. Each mesh is at most one.
        expect(meshes).toBeLessThanOrEqual(100);
    });

    it("stands landmarks and idlers at their road x and row depth", () => {
        const { road, L } = build();
        road.sync(view(L), 0);

        // A cast landmark stands at its building's door.
        const toilet = road.landmarkPuppet("boom").group.position;
        const front = buildingBox(L, { x: 1500 }).z;
        expect(toilet.x).toBe(1500);
        expect(toilet.z).toBeGreaterThan(front);
        expect(toilet.z).toBeLessThan(L.z.idlers[0]);
        // Any other landmark is its building's sign, up on its front.
        const sign = road.landmarkPuppet("sprout-pox").group.position;
        expect(sign.y).toBeGreaterThan(0);
        expect(sign.z).toBeCloseTo(buildingBox(L, { x: 600 }).z + 2);
        expect(road.butt.group.position.toArray()).toEqual([260, 0, 0]);
    });

    it("walks the Butt across the street by its lane", () => {
        const { road, L } = build();
        road.sync(view(L, { peach: { x: 260, facing: 1, lane: 1 } }), 0);

        expect(road.butt.group.position.z).toBeCloseTo(L.z.near);
        expect(L.z.near).toBeGreaterThan(L.z.roadNear);
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

        const walked = { ...still, peach: { x: 280, facing: 1, lane: 0 } };
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

    it("fades a near-side building while the Butt is behind it", () => {
        const kit = createCastKit(THREE, { createCanvas });
        const road = createRoadScene(THREE, kit, {
            theme: worldTheme(""),
            landmarks: [{ slug: "shop", x: 600, landmark: "🏪", side: "near" }],
            idlers: [],
        });
        const L = roadLayout({ w: 1000, h: 700, vmin: 700 });
        road.layout(L, 2200);
        const sign = road.landmarkPuppet("shop");
        // Opaque on the shared material; a see-through copy while faded.
        const material = () =>
            road.scene.getObjectByName("near-side").children[0].material;
        const at = (x, lane) =>
            view(L, {
                peach: { x, facing: 1, lane },
                idlers: [],
                reduced: true,
            });

        road.sync(at(600, 0), 0);
        const opaque = material();
        expect(opaque.transparent).toBe(false);

        road.sync(at(600, 1), 0);
        expect(material().transparent).toBe(true);
        expect(material().opacity).toBeLessThan(0.5);
        expect(sign.group.visible).toBe(false);

        // However far it goes at once (a focus jump, the road wrapping).
        road.sync(at(5000, 1), 0);
        expect(material()).toBe(opaque);
        expect(sign.group.visible).toBe(true);
    });

    it("ducks the manhole's cockroach while the Butt is near", () => {
        const { road, L } = build();
        const roach = road.scene.getObjectByName("manhole-cockroach");
        const manholeX = roach.position.x;
        // The puppet's lift group, under its contact shadow.
        const lift = () => roach.children[1].position.y;

        road.sync(view(L, { reduced: true }), 0);
        expect(lift()).toBe(0);
        road.sync(
            view(L, {
                reduced: true,
                peach: { x: manholeX, facing: 1, lane: 0 },
            }),
            0
        );
        expect(lift()).toBeLessThan(0);
    });

    it("lets off no fireworks under reduced motion", () => {
        const { road, L } = build("fireworks");
        const flash = road.scene.children.filter((o) => o.isHemisphereLight)[1];

        road.sync(view(L), 5);
        expect(flash.intensity).toBeGreaterThan(0);
        road.sync(view(L, { reduced: true }), 0.016);
        expect(flash.intensity).toBe(0);
    });
});
