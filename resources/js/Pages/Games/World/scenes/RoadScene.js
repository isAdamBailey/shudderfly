import { TOOT_FOODS } from "@/constants/characters.js";
import { approach, jitter } from "@/utils/math";
import { worldToScreen } from "../composables/projection.js";
import {
    applyCamera,
    canvasTexture,
    disposeTree,
} from "../three/useWorldRenderer.js";
import {
    buildingBox,
    DRIFTER_DEPTH,
    DRIFTERS,
    ROWS,
    RIDGE_DEPTH,
    ROOF,
    screenSize,
} from "./roadLayout.js";
import { roadScenery } from "./roadScenery.js";
import {
    billboard,
    box,
    building,
    bush,
    fence,
    manhole,
    mergeParts,
    place,
    potty,
    tree,
} from "./streetGeometry.js";

// The `kind: "road"` scene graph (issue #130): a street seen side-on with
// depth. Sky and ridge at the back, a mid-distance row of trees and houses,
// the far side's buildings (one per landmark, its emoji as the sign), the
// road with a pavement either side for the Butt's two lanes, and the near
// side's houses and props in front, which fade when the Butt walks behind
// them. The cast (the Butt, the roadside foods, a cast landmark, the
// cockroach in the manhole, the food on the billboard) are the cast kit's
// puppets. One key light casts the shadows; the season sets the lighting,
// and dark mode turns it to night (setNight).
// It only draws: Road3D.vue owns the state (useRoad / useGamesWorld) and
// hands it over each frame through sync().

// The flat road's ridge tile: two silhouettes, px, drawn like the CSS
// backgrounds they replace (a 1500 × 190 front ridge over a 1500 × 140 back
// one shifted 420px, both on the horizon, with an 8px skirt below it).
const RIDGE = {
    tile: 1500,
    front: { height: 190, offset: 0 },
    back: { height: 140, offset: 420 },
    skirt: 8,
    viewBox: 240,
};
const RIDGE_PATHS = {
    front: "M0,240 L0,180 C160,120 300,205 460,180 C620,155 720,105 880,150 C1050,198 1280,160 1500,180 L1500,240 Z",
    back: "M0,240 L0,130 C180,50 330,180 500,150 C660,122 760,40 920,80 C1080,120 1250,180 1500,130 L1500,240 Z",
};

// Props that aren't characters.
const GLYPHS = { moon: "🌙", toot: "💨" };

const ROAD_DASH = { period: 96, dash: 46 }; // world units, as the flat road
// The kerbs along the road, in world units; the pavements are slabs just
// thick enough to sit over the road and under a puppet's contact shadow.
const KERB = { height: 4, depth: 6 };
const PAVEMENT = 0.4;
const NEAR_SCALE = 1.12; // a landmark the Butt is at (or hovered) grows
const NEAR_LIFT = 4; // px
const NEAR_EASE = 0.18; // s, as the flat road's transition
const FADE = { to: 0.28, time: 0.2 }; // near-side things the Butt is behind
const SHADOW_MAP = 1024;
const LIGHT_DIRECTION = [-0.35, 1, 0.75]; // from above, in front, a bit left
// The cockroach ducks into its manhole when the Butt comes this close, and
// pops back up (hissing) when it leaves.
// A manhole's cockroach ducks while the Butt is within `duck` px, a share of
// the stage's width (at most 170, at least 60): on a phone the camera keeps
// the Butt so close to the manhole while it's on screen that a fixed 170
// would only ever show it ducked, popping up after it scrolls away.
const MANHOLE = { duck: [60, 0.18, 170], time: 0.25 };
// The toot cloud drifting along the road, across the screen.
const ROAD_TOOT = { period: 16, height: 26 };
// Fireworks: a flash every few seconds, fading this fast.
const FLASH = { every: 1.8, spread: 2.2, intensity: 2.2, decay: 3.5 };
// How long night takes to fall or lift when dark mode flips, s.
const NIGHTFALL = 0.3;

/**
 * Builds the road. `landmarks` are useGamesWorld's ({ slug, x, side, cast,
 * landmark }), `idlers` useRoad's ({ slug, cast, row, phase }), `theme` and
 * `nightTheme` three/themes.js looks (worldTheme / worldNight), and `night`
 * whether it starts at night. Call layout() with a roadLayout() before the
 * first sync(), and again on every resize.
 */
export function createRoadScene(
    THREE,
    kit,
    {
        theme,
        nightTheme = theme,
        night: startAtNight = false,
        landmarks,
        idlers,
    }
) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 1, 1);
    scene.add(camera);

    const made = new THREE.Group(); // everything here that isn't the kit's
    scene.add(made);

    // --- Sky -----------------------------------------------------------------

    // Repainted as night falls: { top, bottom, grass } CSS colours.
    function paintSky(ctx, { top, bottom, grass }) {
        const g = ctx.createLinearGradient(0, 0, 0, 256);
        g.addColorStop(0, top);
        g.addColorStop(ROWS.horizon, bottom);
        g.addColorStop(ROWS.horizon, grass);
        g.addColorStop(1, grass);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 2, 256);
    }
    const sky = canvasTexture(THREE, 2, 256, (ctx) =>
        paintSky(ctx, {
            top: theme.skyTop,
            bottom: theme.skyBottom,
            grass: theme.grass,
        })
    );
    scene.background = sky;

    // --- Light -------------------------------------------------------------

    const ambient = new THREE.HemisphereLight(
        theme.ambient.sky,
        theme.ambient.ground,
        theme.ambient.intensity
    );
    scene.add(ambient);

    const key = new THREE.DirectionalLight(
        theme.key.color,
        theme.key.intensity
    );
    key.castShadow = true;
    key.shadow.mapSize.set(SHADOW_MAP, SHADOW_MAP);
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.5;
    scene.add(key, key.target);
    const lightDir = new THREE.Vector3(...LIGHT_DIRECTION).normalize();

    // Fireworks light the whole street up in their colour for a moment.
    const flash = theme.flashes
        ? new THREE.HemisphereLight(theme.flashes[0], "#000000", 0)
        : null;
    if (flash) scene.add(flash);
    let flashTimer = FLASH.every;
    let flashCount = 0;

    // --- Materials -----------------------------------------------------------

    // Shared by everything built from streetGeometry.js: the colour is in
    // the vertices.
    const solid = new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 0.9,
    });
    // Windows glow at night.
    const glass = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.3,
        emissive: theme.lit ?? "#000000",
        emissiveIntensity: theme.lit ? theme.litIntensity : 0,
    });

    // --- Ridge -------------------------------------------------------------

    function ridgeTexture() {
        const { tile, front, back, skirt, viewBox } = RIDGE;
        const height = front.height + skirt;
        const texture = canvasTexture(THREE, tile, height, (ctx) => {
            if (typeof Path2D === "undefined") return;
            const draw = (path, layer, color) => {
                ctx.fillStyle = color;
                for (const shift of [layer.offset - tile, layer.offset]) {
                    ctx.save();
                    ctx.translate(shift, front.height - layer.height);
                    ctx.scale(1, layer.height / viewBox);
                    ctx.fill(new Path2D(path));
                    ctx.restore();
                }
            };
            draw(RIDGE_PATHS.back, back, theme.hill ?? theme.ridgeFar);
            draw(RIDGE_PATHS.front, front, theme.hill ?? theme.ridgeNear);
            ctx.fillStyle = theme.hill ?? theme.ridgeNear;
            ctx.fillRect(0, front.height, tile, skirt);
        });
        texture.wrapS = THREE.RepeatWrapping;
        return texture;
    }
    const ridge = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
            map: ridgeTexture(),
            transparent: true,
            depthWrite: false,
        })
    );
    made.add(ridge);

    // --- Ground ------------------------------------------------------------

    const grass = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: theme.grass, roughness: 1 })
    );
    grass.receiveShadow = true;
    made.add(grass);

    function roadTexture() {
        const texture = canvasTexture(THREE, ROAD_DASH.period, 128, (ctx) => {
            ctx.fillStyle = theme.road;
            ctx.fillRect(0, 0, ROAD_DASH.period, 128);
            // Gutters along both kerbs, the centre line between.
            ctx.fillStyle = theme.roadEdge;
            ctx.fillRect(0, 0, ROAD_DASH.period, 5);
            ctx.fillRect(0, 123, ROAD_DASH.period, 5);
            ctx.fillStyle = theme.roadLine;
            ctx.fillRect(0, 62, ROAD_DASH.dash, 4);
        });
        texture.wrapS = THREE.RepeatWrapping;
        texture.anisotropy = 8;
        return texture;
    }
    const road = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
        new THREE.MeshStandardMaterial({
            map: roadTexture(),
            roughness: 0.95,
            polygonOffset: true,
            polygonOffsetFactor: -1,
        })
    );
    road.receiveShadow = true;
    made.add(road);

    // Rebuilt by layout(): the street's geometry depends on the stage.
    const street = new THREE.Group();
    made.add(street);

    // --- Night ---------------------------------------------------------------

    // 0 by day, 1 at night, between while it falls.
    let night = startAtNight ? 1 : 0;
    let nightTarget = night;
    const scratch = new THREE.Color();
    const { lerp } = THREE.MathUtils;
    /** Sets `color` to `from` moved `t` of the way to `to`. */
    const blend = (color, from, to, t) =>
        color.set(from).lerp(scratch.set(to), t);
    // A look with no lit windows (daylight) glows the other's colour at 0.
    const litFrom = theme.lit ?? nightTheme.lit ?? "#000000";
    const litTo = nightTheme.lit ?? litFrom;
    const skyTop = new THREE.Color();
    const skyBottom = new THREE.Color();
    const skyGrass = new THREE.Color();

    /** Lights and colours the street `n` of the way from day to night
     * (only what NIGHTS may change: the rest is built into the geometry). */
    function showNight(n) {
        const tint = ridge.material.color;
        blend(ambient.color, theme.ambient.sky, nightTheme.ambient.sky, n);
        blend(
            ambient.groundColor,
            theme.ambient.ground,
            nightTheme.ambient.ground,
            n
        );
        ambient.intensity = lerp(
            theme.ambient.intensity,
            nightTheme.ambient.intensity,
            n
        );
        blend(key.color, theme.key.color, nightTheme.key.color, n);
        key.intensity = lerp(theme.key.intensity, nightTheme.key.intensity, n);
        blend(glass.emissive, litFrom, litTo, n);
        glass.emissiveIntensity = lerp(
            theme.lit ? theme.litIntensity : 0,
            nightTheme.lit ? nightTheme.litIntensity : 0,
            n
        );
        blend(tint, theme.ridgeTint, nightTheme.ridgeTint, n);
        const ctx = sky.image.getContext("2d");
        if (!ctx) return;
        paintSky(ctx, {
            top: blend(skyTop, theme.skyTop, nightTheme.skyTop, n).getStyle(),
            bottom: blend(
                skyBottom,
                theme.skyBottom,
                nightTheme.skyBottom,
                n
            ).getStyle(),
            grass: skyGrass.set(theme.grass).multiply(tint).getStyle(),
        });
        sky.needsUpdate = true;
    }
    if (night) showNight(night);

    /** Eases toward the night target; whether anything changed. */
    function fallNight(dt) {
        if (night === nightTarget) return false;
        night = ease(night, nightTarget, dt, NIGHTFALL);
        showNight(night);
        return true;
    }

    // --- Cast ----------------------------------------------------------------

    const landmarkPuppets = landmarks.map((landmark) => ({
        slug: landmark.slug,
        x: landmark.x,
        side: landmark.side,
        // A cast landmark stands at its building's door; anything else is
        // the building's sign.
        sign: !landmark.cast,
        // A building you can go into has a front door.
        door: landmark.item?.type === "door",
        puppet: landmark.cast
            ? kit.castMesh(landmark.cast)
            : kit.emojiMesh(landmark.landmark, { shadows: false }),
        grow: 0, // 0..1 toward NEAR_SCALE
        base: { y: 0, z: 0 }, // where it stands, before it grows
    }));
    const idlerPuppets = idlers.map((idler) => ({
        slug: idler.slug,
        row: idler.row,
        puppet: kit.castMesh(idler.cast, { phase: idler.phase }),
    }));
    const butt = kit.castMesh("butt");

    const drifters = Array.from({ length: DRIFTERS.count }, (_, i) => {
        const puppet = kit.emojiMesh(theme.drifter, { shadows: false });
        camera.add(puppet.group);
        return { i: i + 1, puppet };
    });
    const roadToot = kit.emojiMesh(GLYPHS.toot, { shadows: false });

    for (const { puppet } of [...landmarkPuppets, ...idlerPuppets]) {
        scene.add(puppet.group);
    }
    scene.add(butt.group, roadToot.group);

    const fixedPuppets = [
        butt,
        roadToot,
        ...idlerPuppets.map((e) => e.puppet),
        ...landmarkPuppets.map((e) => e.puppet),
        ...drifters.map((d) => d.puppet),
    ];
    // Scenery puppets (the cockroaches, the billboard foods, the moons on
    // the porta-potties) are made by layout() and live as long as it does.
    let sceneryPuppets = [];
    // Every puppet, ticked each frame: rebuilt with the scenery.
    let puppets = fixedPuppets;

    // --- Layout ------------------------------------------------------------

    let L = null;
    let ridgeTile = 0;
    let tootSpan = 0; // world units the road's toot cloud drifts across
    let reduced = false; // what the puppets were last told
    let driftTime = 0;
    let lastCamera = null;
    // The near side's tall things: { meshes, faded, puppets, x, z, width,
    // height, roof, opacity }.
    let nearThings = [];
    // The manholes' cockroaches: { puppet, x, size, peek (0 hidden … 1) }.
    let cockroaches = [];
    let duckRadius = 0; // px either side of a manhole, for this stage

    function mesh(geometry, material, shadows = true) {
        const m = new THREE.Mesh(geometry, material);
        m.castShadow = shadows;
        m.receiveShadow = true;
        return m;
    }

    function addScenery(puppet) {
        scene.add(puppet.group);
        sceneryPuppets.push(puppet);
        return puppet;
    }

    /** The street's buildings and props for this layout, replacing the
     * last ones. */
    function buildStreet(worldWidth) {
        // The shared materials outlive a rebuild.
        disposeTree(street, [solid, glass]);
        street.clear();
        for (const puppet of sceneryPuppets) puppet.dispose();
        sceneryPuppets = [];
        nearThings = [];
        cockroaches = [];

        const { w, z, sizes } = L;
        const from = -w * 2;
        const to = worldWidth + w * 2;
        const scenery = roadScenery({ landmarks, from, to });
        const body = [];
        const windows = [];

        // Pavements, kerbs and the mid-distance row: one mesh.
        const length = to - from;
        const middle = from + length / 2;
        const slab = (z0, z1, color, height) =>
            box(
                THREE,
                color,
                [length, height, z1 - z0],
                [middle, height / 2, (z0 + z1) / 2]
            );
        body.push(
            slab(z.buildings - 40, z.roadFar, theme.pavement, PAVEMENT),
            slab(z.roadNear, z.nearBuildings + 40, theme.pavement, PAVEMENT),
            slab(z.roadFar, z.roadFar + KERB.depth, theme.kerb, KERB.height),
            slab(z.roadNear - KERB.depth, z.roadNear, theme.kerb, KERB.height)
        );

        for (const item of scenery.mid) {
            const size = sizes.mid * item.scale;
            const at = { x: item.x, z: z.mid };
            if (item.kind === "tree") {
                body.push(
                    ...place(
                        tree(THREE, {
                            size: size * 1.2,
                            look: theme,
                            palette: item.palette,
                        }),
                        at
                    )
                );
            } else {
                const house = building(THREE, {
                    width: size * 1.1,
                    height: size,
                    depth: size * 0.8,
                    roof: size * ROOF,
                    look: theme,
                    palette: item.palette,
                });
                body.push(...place(house.body, at));
                windows.push(...place(house.windows, at));
            }
        }

        // The landmarks' buildings. The far side's merge into the street;
        // a near-side one fades, so it gets its own mesh.
        landmarkPuppets.forEach((entry, palette) => {
            const box = buildingBox(L, entry);
            const parts = building(THREE, {
                ...box,
                look: theme,
                palette,
                door: entry.door,
            });
            const at = { x: box.x, z: box.z };
            if (entry.side === "near") {
                addNearThing(
                    box,
                    place(parts.body, at),
                    place(parts.windows, at),
                    [entry.puppet]
                );
            } else {
                body.push(...place(parts.body, at));
                windows.push(...place(parts.windows, at));
            }
            placeLandmarkPuppet(entry, box);
        });

        // The near side's own houses, porta-potties and billboards.
        for (const item of scenery.near) {
            const thing = nearProp(item);
            const at = { x: item.x, z: z.nearBuildings };
            addNearThing(
                { x: item.x, z: at.z, roof: 0, ...thing.box },
                place(thing.body, at),
                place(thing.windows ?? [], at),
                thing.puppets ?? []
            );
        }

        for (const item of scenery.hedge) {
            const at = { x: item.x, z: z.nearBuildings };
            const size = sizes.nearBuilding * 0.32 * item.scale;
            body.push(
                ...place(
                    item.kind === "bush"
                        ? bush(THREE, {
                              size: size * 1.3,
                              look: theme,
                              palette: Math.round(item.x),
                          })
                        : fence(THREE, {
                              length: 130,
                              height: size,
                              look: theme,
                          }),
                    at
                )
            );
        }

        // Manholes in the near lane of the road, a cockroach in each.
        const manholeSize = sizes.butt * 0.9;
        const roachSize = manholeSize * 0.8;
        for (const x of scenery.manholes) {
            body.push(
                ...place(manhole(THREE, { size: manholeSize }), {
                    x,
                    z: z.manhole,
                })
            );
            const puppet = addScenery(
                kit.castMesh("cockroach", { phase: jitter(x), shadows: false })
            );
            puppet.set({ size: roachSize });
            puppet.setMove("idle");
            puppet.group.name = "manhole-cockroach";
            puppet.group.position.set(x, 0, z.manhole);
            cockroaches.push({ puppet, x, size: roachSize, peek: 1 });
        }

        street.add(mesh(mergeParts(THREE, body), solid));
        const glassGeometry = mergeParts(THREE, windows);
        if (glassGeometry) street.add(mesh(glassGeometry, glass, false));
        for (const puppet of sceneryPuppets) puppet.setReducedMotion(reduced);
        puppets = [...fixedPuppets, ...sceneryPuppets];
    }

    /** One of the near side's own things, in its own space: { box: { width,
     * height }, body, windows?, puppets? }. Its puppets are already in the
     * scene, placed at its road x. */
    function nearProp(item) {
        const height = L.sizes.nearBuilding * item.scale;
        const z = L.z.nearBuildings;
        if (item.kind === "house") {
            const box = buildingBox(L, { x: item.x, side: "near" });
            return {
                box,
                ...building(THREE, {
                    ...box,
                    look: theme,
                    palette: item.palette,
                }),
            };
        }
        if (item.kind === "potty") {
            const moon = addScenery(
                kit.emojiMesh(GLYPHS.moon, { shadows: false })
            );
            moon.set({ size: height * 0.18 });
            moon.group.position.set(item.x, height * 0.62, z + 3);
            return {
                box: { width: height * 0.5, height },
                body: potty(THREE, { height }),
                puppets: [moon],
            };
        }
        const width = height * 1.3;
        const { parts, board } = billboard(THREE, { width, look: theme });
        const food = TOOT_FOODS[item.pick % TOOT_FOODS.length].type;
        const puppet = addScenery(
            kit.castMesh(food, { phase: item.pick * 0.5, shadows: false })
        );
        const size = board.height * 0.8;
        puppet.set({ size });
        puppet.setMove("idle");
        puppet.group.position.set(
            item.x,
            board.y + (board.height - size) / 2,
            z + 2
        );
        return {
            box: { width, height: board.y + board.height },
            body: parts,
            puppets: [puppet],
        };
    }

    /** A near-side thing that fades when the Butt is behind it: its own
     * meshes, and the puppets on it (hidden while faded). */
    function addNearThing(box, bodyParts, windowParts, thingPuppets) {
        const group = new THREE.Group();
        group.name = "near-side";
        const meshes = [mesh(mergeParts(THREE, bodyParts), solid)];
        const glassGeometry = mergeParts(THREE, windowParts);
        if (glassGeometry) meshes.push(mesh(glassGeometry, glass, false));
        group.add(...meshes);
        street.add(group);
        nearThings.push({
            ...box,
            meshes,
            faded: null,
            puppets: thingPuppets,
            opacity: 1,
        });
    }

    /** Gives a near-side thing see-through copies of its materials while it
     * fades (the shared ones stay opaque, out of the blended pass). */
    function fade(thing, opacity) {
        if (opacity === 1) return unfade(thing);
        if (!thing.faded) {
            thing.faded = thing.meshes.map((m) => {
                const material = m.material.clone();
                material.transparent = true;
                m.material = material;
                return material;
            });
        }
        for (const material of thing.faded) material.opacity = opacity;
    }

    function unfade(thing) {
        if (!thing.faded) return;
        thing.meshes.forEach((m, i) => {
            m.material = i === 0 ? solid : glass;
        });
        for (const material of thing.faded) material.dispose();
        thing.faded = null;
    }

    /** Scales a landmark's puppet by how far it has grown. */
    function poseGrow(entry) {
        const s = 1 + (NEAR_SCALE - 1) * entry.grow;
        entry.puppet.group.scale.setScalar(s);
        entry.puppet.group.position.set(
            entry.x,
            entry.base.y + (NEAR_LIFT * entry.grow) / L.scaleAt(entry.base.z),
            entry.base.z
        );
    }

    /** A landmark's sign on its building's front, or its cast member at the
     * door. */
    function placeLandmarkPuppet(entry, box) {
        if (entry.sign) {
            const size = Math.min(box.width, box.height) * 0.42;
            entry.puppet.set({ size });
            entry.base = { y: box.height * 0.97 - size, z: box.z + 2 };
        } else {
            const size = box.height * 0.62;
            entry.puppet.set({ size });
            entry.base = { y: 0, z: box.z + size * 0.25 };
        }
        poseGrow(entry);
    }

    /** Sizes and places everything that depends on the stage. */
    function layout(nextLayout, worldWidth) {
        L = nextLayout;
        const { w, z, sizes, focal } = L;
        // From just in front of the camera to just past the ridge.
        camera.near = focal * 0.05;
        camera.far = focal * (RIDGE_DEPTH + 1);

        // Grass and road run the length of the world and a screen past
        // either end; the grass from the horizon to under the camera.
        const left = -w * 2;
        const length = worldWidth + w * 4;
        const groundNear = focal * 0.6;
        grass.scale.set(length, 1, groundNear - z.horizon);
        grass.position.set(left + length / 2, 0, (groundNear + z.horizon) / 2);
        road.scale.set(length, 1, z.roadNear - z.roadFar);
        road.position.set(left + length / 2, 0.2, (z.roadNear + z.roadFar) / 2);
        road.material.map.repeat.set(length / ROAD_DASH.period, 1);
        road.material.map.offset.set(left / ROAD_DASH.period, 0);

        // The ridge: a plane far enough away to scroll at 1/4 speed, its
        // feet hidden behind the ground's far edge.
        const k = RIDGE_DEPTH; // world units per px at that distance
        const tile = RIDGE.tile * k;
        const tiles = Math.ceil((w * k) / tile) + 2;
        const height = (RIDGE.front.height + RIDGE.skirt) * k;
        const bottom =
            L.cameraY - (ROWS.horizon * L.h + RIDGE.skirt - L.eyeRow) * k;
        ridge.scale.set(tile * tiles, height, 1);
        ridge.position.set(0, bottom + height / 2, z.ridge);
        ridge.material.map.repeat.set(tiles, 1);
        ridgeTile = tile;

        buildStreet(worldWidth);
        duckRadius = screenSize(MANHOLE.duck, w);

        idlerPuppets.forEach(({ row, puppet }) => {
            puppet.set({ size: sizes.idlers[row] });
        });
        butt.set({ size: sizes.butt });
        roadToot.set({ size: sizes.butt * 0.7 });
        tootSpan = w / L.scaleAt(z.roadToot) + 200;

        // The key light's shadow box covers the visible street.
        const shadow = key.shadow.camera;
        const reach = (w / 2) * (1 - z.horizon / focal) + 300;
        shadow.left = -reach;
        shadow.right = reach;
        shadow.top = focal * 0.7;
        shadow.bottom = -focal * 0.7;
        shadow.near = 1;
        shadow.far = focal * 4;
        shadow.updateProjectionMatrix();

        for (const { puppet } of drifters) {
            puppet.set({ size: DRIFTERS.size * DRIFTER_DEPTH });
        }
        placeDrifters();
        lastCamera = null;
    }

    // --- Sync ----------------------------------------------------------------

    function sameCamera(a, b) {
        return (
            b &&
            a.x === b.x &&
            a.y === b.y &&
            a.lensX === b.lensX &&
            a.eyeRow === b.eyeRow &&
            a.w === b.w &&
            a.h === b.h
        );
    }

    /** Stands a puppet at (x, z); true if that moved it. Puppets only
     * report their own moves, and under reduced motion walking is the only
     * thing that changes a frame. */
    function stand(puppet, x, z) {
        const at = puppet.group.position;
        if (at.x === x && at.z === z) return false;
        at.set(x, 0, z);
        return true;
    }

    /** Eases `from` toward `to` over `time` s (or jumps, under reduced
     * motion). */
    function ease(from, to, dt, time) {
        return reduced ? to : approach(from, to, dt / time);
    }

    /**
     * Poses the scene for one frame and reports whether anything changed.
     * `view`: {
     *   camera,              // roadCamera()
     *   peach: { x, facing, lane },
     *   peachLift,           // px
     *   idlers,              // useRoad's, with screen-px dx/lift
     *   near, hovered,       // landmark slugs, or null
     *   reduced,             // prefers reduced motion
     * }
     */
    function sync(view, dt) {
        if (!L) return false;
        let changed = false;

        if (!sameCamera(view.camera, lastCamera)) {
            lastCamera = Object.assign(lastCamera ?? {}, view.camera);
            applyCamera(camera, view.camera);
            placeCameraFollowers(view.camera);
            changed = true;
        }

        if (view.reduced !== reduced) {
            reduced = view.reduced;
            for (const puppet of puppets) {
                puppet.setReducedMotion(reduced);
            }
            changed = true;
        }

        const buttZ = L.laneZ(view.peach.lane);
        changed = stand(butt, view.peach.x, buttZ) || changed;
        butt.set({
            lift: view.peachLift,
            facing: view.peach.facing < 0 ? "left" : "right",
        });
        const crossing =
            view.peach.side &&
            view.peach.lane !== (view.peach.side === "near" ? 1 : 0);
        butt.setMove(view.peach.vx || crossing ? "walk" : null);

        view.idlers.forEach((idler, i) => {
            const entry = idlerPuppets[i];
            if (!entry) return;
            // The flat road's px, at this idler's depth.
            const z = L.z.idlers[entry.row];
            const perPx = L.idlerPerPx(entry.row);
            changed =
                stand(entry.puppet, idler.x + idler.dx * perPx, z) || changed;
            entry.puppet.set({ lift: idler.lift * perPx, tilt: idler.tilt });
            entry.puppet.setMove(idler.excited ? "excited" : "idle");
        });

        for (const entry of landmarkPuppets) {
            const target =
                entry.slug === view.near || entry.slug === view.hovered ? 1 : 0;
            if (entry.grow !== target) {
                entry.grow = ease(entry.grow, target, dt, NEAR_EASE);
                poseGrow(entry);
                changed = true;
            }
        }

        changed = fadeNearThings(view, buttZ, dt) || changed;
        changed = peekCockroaches(view.peach.x, dt) || changed;
        changed = flashFireworks(dt) || changed;
        changed = fallNight(dt) || changed;

        if (!view.reduced) {
            driftTime += dt;
            placeDrifters();
            changed = true;
        }
        placeRoadToot(view.camera);

        for (const puppet of puppets) changed = puppet.tick(dt) || changed;
        return changed;
    }

    /** Fades whichever near-side things hide any of the Butt. */
    function fadeNearThings(view, buttZ, dt) {
        const feet = worldToScreen(view.camera, {
            x: view.peach.x,
            y: view.peachLift,
            z: buttZ,
        });
        const half = (L.sizes.butt * (feet?.scale ?? 1)) / 2;
        // Only things within a building's width of the Butt can hide it.
        const reach = L.sizes.building + L.sizes.butt;
        let changed = false;
        for (const thing of nearThings) {
            if (
                Math.abs(thing.x - view.peach.x) > reach &&
                thing.opacity === 1
            ) {
                continue;
            }
            // The thing's front, from its bottom-left to its top-right.
            const low = worldToScreen(view.camera, {
                x: thing.x - thing.width / 2,
                z: thing.z,
            });
            const high = worldToScreen(view.camera, {
                x: thing.x + thing.width / 2,
                y: thing.height + thing.roof,
                z: thing.z,
            });
            const hides =
                feet &&
                low &&
                high &&
                thing.z > buttZ &&
                feet.x + half > low.x &&
                feet.x - half < high.x &&
                feet.y > high.y;
            const target = hides ? FADE.to : 1;
            if (thing.opacity === target) continue;
            thing.opacity = ease(thing.opacity, target, dt, FADE.time);
            fade(thing, thing.opacity);
            for (const puppet of thing.puppets) {
                puppet.group.visible = thing.opacity > 0.6;
            }
            changed = true;
        }
        return changed;
    }

    /** The cockroaches duck into their manholes while the Butt is near, and
     * pop back up hissing when it goes. */
    function peekCockroaches(buttX, dt) {
        let changed = false;
        for (const roach of cockroaches) {
            const target = Math.abs(buttX - roach.x) < duckRadius ? 0 : 1;
            if (roach.peek === target) continue;
            roach.peek = ease(roach.peek, target, dt, MANHOLE.time);
            // Sunk below the road, which hides what's under it.
            roach.puppet.set({ lift: -roach.size * 0.55 * (1 - roach.peek) });
            if (roach.peek === 1) roach.puppet.play("hiss");
            changed = true;
        }
        return changed;
    }

    function flashFireworks(dt) {
        if (!flash) return false;
        if (reduced) {
            if (flash.intensity === 0) return false;
            flash.intensity = 0;
            return true;
        }
        flashTimer -= dt;
        if (flashTimer <= 0) {
            flashCount += 1;
            flash.color.set(theme.flashes[flashCount % theme.flashes.length]);
            flash.intensity = FLASH.intensity;
            flashTimer = FLASH.every + jitter(flashCount) * FLASH.spread;
            return true;
        }
        if (flash.intensity === 0) return false;
        flash.intensity *= Math.exp(-dt * FLASH.decay);
        if (flash.intensity < 0.02) flash.intensity = 0;
        return true;
    }

    /** The toot cloud drifts along the road across the screen, then comes
     * round again. Still (at the screen's middle) under reduced motion. */
    function placeRoadToot(cam) {
        const along = reduced ? 0.5 : 1 - ((driftTime / ROAD_TOOT.period) % 1);
        roadToot.group.position.set(
            cam.x - tootSpan / 2 + along * tootSpan,
            ROAD_TOOT.height,
            L.z.roadToot
        );
    }

    /** The ridge snaps to whole tiles under the camera so it never shows an
     * edge; the light and its shadow box follow, snapped to shadow texels so
     * shadows don't shimmer as the camera walks. */
    function placeCameraFollowers(cam) {
        ridge.position.x = Math.round(cam.x / ridgeTile) * ridgeTile;

        const shadow = key.shadow.camera;
        const texel = (shadow.right - shadow.left) / SHADOW_MAP;
        const x = Math.round(cam.x / texel) * texel;
        key.target.position.set(x, 0, (L.z.buildings + L.z.near) / 2);
        key.position
            .copy(key.target.position)
            .addScaledVector(lightDir, L.focal * 2);
    }

    /** The drifters hang in the sky where the flat road's clouds did,
     * riding with the camera (so the tilt peek carries them, as it did) and
     * drifting to and fro. */
    function placeDrifters() {
        const { w, h, focal, eyeRow } = L;
        const perPx = DRIFTER_DEPTH; // world units per px at their depth
        for (const { i, puppet } of drifters) {
            // ease-in-out, alternating, like the CSS cloud-drift.
            const t = driftTime / DRIFTERS.period + (i * 4) / DRIFTERS.period;
            const along = t % 2 < 1 ? t % 2 : 2 - (t % 2);
            const drift =
                (DRIFTERS.drift * (1 - Math.cos(along * Math.PI))) / 2;
            const left = i * 0.23 * w - 0.06 * w + drift;
            const feetRow = (0.03 + i * 0.07) * h + DRIFTERS.size;
            puppet.group.position.set(
                (left + DRIFTERS.size / 2 - w / 2) * perPx,
                (eyeRow - feetRow) * perPx,
                -DRIFTER_DEPTH * focal
            );
        }
    }

    return {
        scene,
        camera,
        butt,
        layout,
        sync,
        /** The puppet drawing a landmark, e.g. to play its greet. */
        landmarkPuppet(slug) {
            return landmarkPuppets.find((e) => e.slug === slug)?.puppet;
        },
        /** Night falls (or lifts) over the next frames: dark mode flipped. */
        setNight(on) {
            nightTarget = on ? 1 : 0;
        },
        dispose() {
            sky.dispose();
            disposeTree(made);
            solid.dispose();
            glass.dispose();
            for (const puppet of puppets) puppet.dispose();
            scene.clear();
        },
    };
}
