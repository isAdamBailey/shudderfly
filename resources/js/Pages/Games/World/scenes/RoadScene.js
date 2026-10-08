import { clamp } from "../composables/useGamesWorld.js";
import { applyCamera, disposeTree } from "../three/useWorldRenderer.js";
import { DRIFTER_DEPTH, DRIFTERS, ROWS, RIDGE_DEPTH } from "./roadLayout.js";

// The `kind: "road"` scene graph (issue #130): the flat road rebuilt in
// Three.js with the same layout. Sky, ridge, road and verge are planes; the
// landmarks, the roadside Toot Foods and the Butt are the cast kit's puppets;
// one key light casts the shadows. It only draws: Road3D.vue owns the state
// (useRoad / useGamesWorld) and hands it over each frame through sync().

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

const ROAD_DASH = { period: 96, dash: 46 }; // world units, as the flat road
const NEAR_SCALE = 1.12; // a landmark the Butt is at (or hovered) grows
const NEAR_LIFT = 4; // px
const NEAR_EASE = 0.18; // s, as the flat road's transition
const SHADOW_MAP = 1024;
const LIGHT_DIRECTION = [-0.35, 1, 0.75]; // from above, in front, a bit left

/** A w × h canvas drawn by `draw(ctx)` (skipped where there is no 2D
 * context, as in tests), as an sRGB texture. */
function canvasTexture(THREE, w, h, draw) {
    const el = document.createElement("canvas");
    el.width = w;
    el.height = h;
    const ctx = el.getContext("2d");
    if (ctx) draw(ctx);
    const texture = new THREE.CanvasTexture(el);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

/**
 * Builds the road. `landmarks` are useGamesWorld's ({ slug, x, cast,
 * landmark }), `idlers` useRoad's ({ slug, cast, row, phase }), `theme` a
 * three/themes.js look. Call layout() with a roadLayout() before the first
 * sync(), and again on every resize.
 */
export function createRoadScene(THREE, kit, { theme, landmarks, idlers }) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 1, 1);
    scene.add(camera);

    const made = new THREE.Group(); // everything here that isn't the kit's
    scene.add(made);

    // --- Sky -----------------------------------------------------------------

    const sky = canvasTexture(THREE, 2, 256, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 256);
        g.addColorStop(0, theme.skyTop);
        g.addColorStop(ROWS.horizon, theme.skyBottom);
        g.addColorStop(ROWS.horizon, theme.grass);
        g.addColorStop(1, theme.grass);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 2, 256);
    });
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

    /** Where the flat road drew its dashes, 45% down the road's strip of
     * screen, as a share of the road's depth from its far edge. Depths scale
     * with the stage, so the share doesn't change with its size. */
    function dashShare() {
        const zAt = (row) => 1 - ROWS.butt / row; // in focal lengths
        const far = zAt(ROWS.horizon);
        const near = zAt(ROWS.roadNear);
        const dash = zAt(ROWS.horizon + (ROWS.roadNear - ROWS.horizon) * 0.45);
        return (dash - far) / (near - far);
    }

    function roadTexture(dashRow) {
        const texture = canvasTexture(THREE, ROAD_DASH.period, 128, (ctx) => {
            ctx.fillStyle = theme.road;
            ctx.fillRect(0, 0, ROAD_DASH.period, 128);
            // The far edge is the top of the texture.
            ctx.fillStyle = theme.roadEdge;
            ctx.fillRect(0, 0, ROAD_DASH.period, 6);
            ctx.fillStyle = theme.roadLine;
            ctx.fillRect(0, dashRow * 128 - 2, ROAD_DASH.dash, 4);
        });
        texture.wrapS = THREE.RepeatWrapping;
        texture.anisotropy = 8;
        return texture;
    }
    const road = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
        new THREE.MeshStandardMaterial({
            map: roadTexture(dashShare()),
            roughness: 0.95,
            polygonOffset: true,
            polygonOffsetFactor: -1,
        })
    );
    road.receiveShadow = true;
    made.add(road);

    // --- Cast ----------------------------------------------------------------

    const landmarkPuppets = landmarks.map((landmark) => ({
        slug: landmark.slug,
        x: landmark.x,
        puppet: landmark.cast
            ? kit.castMesh(landmark.cast)
            : kit.emojiMesh(landmark.landmark),
        grow: 0, // 0..1 toward NEAR_SCALE
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

    for (const { puppet } of [...landmarkPuppets, ...idlerPuppets]) {
        scene.add(puppet.group);
    }
    scene.add(butt.group);

    const puppets = [
        butt,
        ...idlerPuppets.map((e) => e.puppet),
        ...landmarkPuppets.map((e) => e.puppet),
        ...drifters.map((d) => d.puppet),
    ];

    // --- Layout ------------------------------------------------------------

    let L = null;
    let ridgeTile = 0;
    let reduced = false; // what the puppets were last told
    let driftTime = 0;
    let lastCamera = null;

    /** Sizes and places everything that depends on the stage. */
    function layout(nextLayout, worldWidth) {
        L = nextLayout;
        const { w, z, sizes, focal } = L;
        // From just in front of the camera to just past the ridge.
        camera.near = focal * 0.05;
        camera.far = focal * (RIDGE_DEPTH + 1);

        // Grass and road run the length of the world and a screen past
        // either end, from the horizon to under the camera.
        const left = -w * 2;
        const length = worldWidth + w * 4;
        const groundNear = focal * 0.6;
        grass.scale.set(length, 1, groundNear - z.horizon);
        grass.position.set(left + length / 2, 0, (groundNear + z.horizon) / 2);
        road.scale.set(length, 1, z.roadNear - z.horizon);
        road.position.set(left + length / 2, 0.2, (z.roadNear + z.horizon) / 2);
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

        landmarkPuppets.forEach(({ x, puppet }) => {
            puppet.set({ size: sizes.landmark });
            puppet.group.position.set(x, 0, z.landmark);
        });
        idlerPuppets.forEach(({ row, puppet }) => {
            puppet.set({ size: sizes.idlers[row] });
        });
        butt.set({ size: sizes.butt });

        // The key light's shadow box covers the visible ground.
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

    /**
     * Poses the scene for one frame and reports whether anything changed.
     * `view`: {
     *   camera,              // roadCamera()
     *   peach: { x, facing },
     *   peachLift,           // px
     *   idlers,              // useRoad's, with screen-px dx/lift
     *   near, hovered,       // landmark slugs, or null
     *   reduced,             // prefers reduced motion
     * }
     */
    /** Stands a puppet at (x, z); true if that moved it. Puppets only
     * report their own moves, and under reduced motion walking is the only
     * thing that changes a frame. */
    function place(puppet, x, z) {
        const at = puppet.group.position;
        if (at.x === x && at.z === z) return false;
        at.set(x, 0, z);
        return true;
    }

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
            for (const puppet of puppets) puppet.setReducedMotion(reduced);
        }

        changed = place(butt, view.peach.x, 0) || changed;
        butt.set({
            lift: view.peachLift,
            facing: view.peach.facing < 0 ? "left" : "right",
        });

        view.idlers.forEach((idler, i) => {
            const entry = idlerPuppets[i];
            if (!entry) return;
            // The flat road's px, at this idler's depth.
            const z = L.z.idlers[entry.row];
            const perPx = L.idlerPerPx(entry.row);
            changed =
                place(entry.puppet, idler.x + idler.dx * perPx, z) || changed;
            entry.puppet.set({ lift: idler.lift * perPx, tilt: idler.tilt });
            entry.puppet.setMove(idler.excited ? "excited" : "idle");
        });

        for (const entry of landmarkPuppets) {
            const target =
                entry.slug === view.near || entry.slug === view.hovered ? 1 : 0;
            if (entry.grow !== target) {
                const step = view.reduced ? 1 : dt / NEAR_EASE;
                entry.grow += clamp(target - entry.grow, -step, step);
                const s = 1 + (NEAR_SCALE - 1) * entry.grow;
                entry.puppet.group.scale.setScalar(s);
                entry.puppet.set({
                    lift: (NEAR_LIFT * entry.grow) / L.scaleAt(L.z.landmark),
                });
                changed = true;
            }
        }

        if (!view.reduced) {
            driftTime += dt;
            placeDrifters();
            changed = true;
        }

        for (const puppet of puppets) changed = puppet.tick(dt) || changed;
        return changed;
    }

    /** The ridge snaps to whole tiles under the camera so it never shows an
     * edge; the light and its shadow box follow, snapped to shadow texels so
     * shadows don't shimmer as the camera walks. */
    function placeCameraFollowers(cam) {
        ridge.position.x = Math.round(cam.x / ridgeTile) * ridgeTile;

        const shadow = key.shadow.camera;
        const texel = (shadow.right - shadow.left) / SHADOW_MAP;
        const x = Math.round(cam.x / texel) * texel;
        key.target.position.set(x, 0, L.z.idlers[1]);
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
        dispose() {
            sky.dispose();
            disposeTree(made);
            for (const puppet of puppets) puppet.dispose();
            scene.clear();
        },
    };
}
