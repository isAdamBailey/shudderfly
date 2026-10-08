import { own } from "@/utils/object";
import { canvasTexture } from "./useWorldRenderer.js";

/**
 * What a room's walls and floor look like, by the names its scene data uses
 * (issue #130): `walls: { back, sides?, floor }`. The server lists the same
 * names (GamesWorld::WALLS / FLOORS) and a test keeps the two in step. Each
 * look is a base colour and a pattern drawn once into a small tiling
 * texture, so a room is a handful of materials. Seasonal room looks
 * (Phase 6) restyle rooms here.
 *
 * `tile` is how many world units one repeat of the pattern covers.
 */
export const WALLS = {
    "wallpaper-stripes": {
        base: "#fde68a",
        ink: "#f59e0b",
        pattern: "stripes",
        tile: 80,
    },
    "wallpaper-dots": {
        base: "#fbcfe8",
        ink: "#ec4899",
        pattern: "dots",
        tile: 60,
    },
    tiles: { base: "#e0f2fe", ink: "#7dd3fc", pattern: "grid", tile: 50 },
    brick: { base: "#b45309", ink: "#78350f", pattern: "bricks", tile: 90 },
    plaster: { base: "#e7e5e4", ink: "#d6d3d1", pattern: "plain", tile: 200 },
};

export const FLOORS = {
    wood: { base: "#a16207", ink: "#713f12", pattern: "planks", tile: 120 },
    lino: { base: "#f5f5f4", ink: "#a8a29e", pattern: "checks", tile: 100 },
    tiles: { base: "#f1f5f9", ink: "#94a3b8", pattern: "grid", tile: 70 },
    carpet: { base: "#7c3aed", ink: "#6d28d9", pattern: "plain", tile: 200 },
    concrete: { base: "#78716c", ink: "#57534e", pattern: "plain", tile: 200 },
};

// Skirting and the ceiling edge.
export const TRIM = "#78350f";

// The daylight in through a room's open front: a sky and ground fill and a
// key light, by seasonal theme (HandleInertiaRequests::THEMES), "" for the
// rest of the year. A seasonal room light is an entry here.
const DAYLIGHT = {
    "": { sky: "#fff7ed", ground: "#78350f", key: "#fde68a" },
};

/** The daylight colours for `theme`, or the everyday ones. */
export function roomDaylight(theme) {
    return own(DAYLIGHT, theme) ?? DAYLIGHT[""];
}

const PX = 64; // a pattern's texture, px square

const PATTERNS = {
    plain() {},
    stripes(ctx, ink) {
        ctx.fillStyle = ink;
        ctx.fillRect(0, 0, PX / 4, PX);
    },
    dots(ctx, ink) {
        ctx.fillStyle = ink;
        ctx.beginPath();
        ctx.arc(PX / 2, PX / 2, PX / 8, 0, Math.PI * 2);
        ctx.fill();
    },
    grid(ctx, ink) {
        ctx.fillStyle = ink;
        ctx.fillRect(0, 0, PX, 3);
        ctx.fillRect(0, 0, 3, PX);
    },
    bricks(ctx, ink) {
        ctx.fillStyle = ink;
        ctx.fillRect(0, 0, PX, 3);
        ctx.fillRect(0, PX / 2, PX, 3);
        ctx.fillRect(0, 0, 3, PX / 2);
        ctx.fillRect(PX / 2, PX / 2, 3, PX / 2);
    },
    planks(ctx, ink) {
        ctx.fillStyle = ink;
        ctx.fillRect(0, 0, PX, 2);
        ctx.fillRect(0, PX / 2, PX, 2);
        ctx.fillRect(PX * 0.3, 0, 2, PX / 2);
        ctx.fillRect(PX * 0.8, PX / 2, 2, PX / 2);
    },
    checks(ctx, ink) {
        ctx.fillStyle = ink;
        ctx.fillRect(0, 0, PX / 2, PX / 2);
        ctx.fillRect(PX / 2, PX / 2, PX / 2, PX / 2);
    },
};

/** The looks named by a room's `walls`, falling back to plain plaster and
 * wood for a name this client doesn't know. */
export function roomLook(walls = {}) {
    const back = own(WALLS, walls.back) ?? WALLS.plaster;
    return {
        back,
        sides: own(WALLS, walls.sides) ?? back,
        floor: own(FLOORS, walls.floor) ?? FLOORS.wood,
    };
}

/** A lit material for `look` covering a `width` × `height` surface, its
 * pattern repeated to scale. */
export function lookMaterial(THREE, look, width, height) {
    let drawn = false;
    const map = canvasTexture(THREE, PX, PX, (ctx) => {
        ctx.fillStyle = look.base;
        ctx.fillRect(0, 0, PX, PX);
        PATTERNS[look.pattern](ctx, look.ink);
        drawn = true;
    });
    // Where there is no 2D canvas to draw it (tests), the plain colour.
    if (!drawn) {
        map.dispose();
        return new THREE.MeshStandardMaterial({
            color: look.base,
            roughness: 0.9,
        });
    }
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(width / look.tile, height / look.tile);
    return new THREE.MeshStandardMaterial({
        map,
        roughness: 0.9,
    });
}
