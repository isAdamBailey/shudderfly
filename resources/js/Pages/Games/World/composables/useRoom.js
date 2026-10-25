import { computed, reactive } from "vue";
import { INSTRUMENT_FOOTPRINTS, isInstrument } from "../scenes/instruments.js";
import {
    inView,
    itemLocal,
    itemPoint,
    ROOM_SIZES,
    STAIRS_CLEARANCE,
    viewBand,
    wallFacing,
    wallToFace,
} from "../scenes/roomLayout.js";
import { clamp, DRAG_SPEED, FOLLOW_GAP, WALK_SPEED } from "./useGamesWorld.js";
import { fromView, toView, viewSize, wallBehind, wallTurned } from "./views.js";

// Close enough to an interactable to use it, in world units.
export const REACH = 120;
// Where the Butt stands to use something: this far in front of it.
export const STAND = 100;
// A walk that ends this close to where you'd use a door goes through it,
// unless it started there: a tap beside the door you just came in by
// mustn't send you back out.
export const TRIGGER_REACH = 60;
// The Butt never walks closer than this to a wall, nor someone else is
// kept.
export const MARGIN = 50;
// Nor closer than this to furniture that blocks it (an instrument): half its
// own width, so its sprite never covers the thing.
export const BLOCK_CLEARANCE = ROOM_SIZES.butt / 2;

/** The spot in front of `item`, where the Butt stands to use it: a step
 * into the room off whichever wall it's on, or clear of a flight of stairs
 * or anything else that says how far (`stand`: an organ's keydesk). */
function frontOf(item) {
    const face = wallFacing(item.wall);
    const stand = item.stairs ? STAIRS_CLEARANCE : item.stand ?? STAND;
    return {
        x: item.x + face.x * stand,
        z: (item.z ?? 0) + face.z * stand,
    };
}

/** Where the Butt starts in `room`: where it was (`position`), in front of
 * the door it came in by (`spot`), or the room's spawn point. */
export function arrivalSpot(room, { spot, position } = {}) {
    if (Number.isFinite(position?.x) && Number.isFinite(position?.z)) {
        return { x: position.x, z: position.z };
    }
    const item = spot && room.interactables.find((i) => i.id === spot);
    return item ? frontOf(item) : { ...room.spawn };
}

/**
 * Everything a room does, DOM-free like useGamesWorld (issue #130): where
 * the Butt is on the floor ({ x, z }, z from the back wall toward the
 * front), where it's walking to, which interactable it's near, and
 * using one when it gets there. Rooms are rectangles and most furniture
 * never blocks, so walking is a straight line; stairs, which take up the
 * floor along their wall, keep the Butt further from it, and an instrument's
 * floor is kept off (the Butt slides along its edge), so the Butt can't
 * stand over what's played. Driven by `step(dt)`.
 *
 * The Butt walks the floor in view (issue #183): the band in front of the
 * wall the camera faces (roomLayout.js viewBand()), and the arrow keys'
 * left, right, up and down are the screen's. `face(wall)` turns it, as
 * does sending the Butt to something out of view: it faces it first.
 *
 * `room` is the scene ({ size: { w, d }, interactables }). Options:
 * - start: { x, z } where the Butt starts.
 * - wall: the wall the camera faces to begin with (back if it doesn't say).
 * - onTurn(wall): it has turned to face `wall`, for the camera to follow.
 * - onArrive(item): the Butt has reached something it was sent to use, or
 *   was dropped next to one that `autoTriggers` (a door, not a toy).
 * - autoTriggers(item): whether walking up to `item` uses it
 *   (interactions/index.js asks its handler).
 * - isReducedMotion(): suppresses the walking bob.
 * - extras(): interactables the scene's data doesn't list, fetched since
 *   (the books on a Library shelf).
 * - placed(item): `item` where it is now, if it can be moved (a thrown
 *   fruit, useThrowables.js); the Butt goes there to use it.
 */
export function useRoom(
    room,
    {
        start,
        wall = "back",
        onTurn,
        onArrive,
        autoTriggers = () => false,
        isReducedMotion,
        extras = () => [],
        placed = (item) => item,
    } = {}
) {
    const { w, d } = room.size;
    // How far off `wall` the Butt keeps: clear of any stairs along it
    // (stairs that don't say are on the back wall).
    const margin = (wall) =>
        room.interactables.some((i) => i.stairs && (i.wall ?? "back") === wall)
            ? STAIRS_CLEARANCE
            : MARGIN;
    // Floor the Butt keeps off: each instrument's, and a little round it,
    // in the instrument's own space (an organ may stand turned in a corner).
    const c = BLOCK_CLEARANCE;
    const blocks = room.interactables.filter(isInstrument).map((item) => {
        const f = INSTRUMENT_FOOTPRINTS[item.type];
        return {
            item,
            x0: f.x0 - c,
            x1: f.x1 + c,
            z0: f.z0 - c,
            z1: f.z1 + c,
        };
    });
    const blocked = (x, z) =>
        blocks.find((b) => {
            const p = itemLocal(b.item, { x, z });
            return p.x > b.x0 && p.x < b.x1 && p.z > b.z0 && p.z < b.z1;
        });

    // The camera's view ({ wall, size }, views.js), how deep the floor in
    // view runs, and the part of it the Butt walks, in the view's frame:
    // { x0, x1, z0, z1 }.
    let view = null;
    let band = 0;
    let floor = null;
    setView(wall);

    const butt = reactive({
        // Never starting inside an instrument (a spot saved before it came).
        ...clear(within(start?.x ?? w / 2, start?.z ?? d / 2)),
        facing: 1,
        bob: 0,
        walking: false,
    });

    const state = reactive({
        // Frozen while a card is up or a door is being gone through.
        frozen: false,
        dragging: false,
        // The arrow keys held: x across, z toward (+1) or away (-1).
        keys: { x: 0, z: 0 },
    });

    // Where the Butt is walking to: { x, z, item?, quiet? }. With `item`,
    // it uses it on arrival; `quiet`, nothing at all (not even a door).
    let target = null;
    // The door the Butt was at when this walk began, which it won't go
    // through just for ending the walk there again.
    let walkFrom = null;

    /** Faces `faced`: the floor in view is the band in front of it, clear
     * of its walls, and of the wall behind the camera if the band reaches
     * it. */
    function setView(faced) {
        view = { wall: faced, size: room.size };
        const seen = viewSize(view);
        band = viewBand(room.size, faced);
        floor = {
            x0: margin(wallTurned(faced, -1)),
            x1: seen.w - margin(wallTurned(faced, 1)),
            z0: margin(faced),
            z1: band < seen.d ? band : seen.d - margin(wallBehind(faced)),
        };
    }

    /** Spot (x, z) kept to the floor in view. */
    function within(x, z) {
        const p = toView(view, { x, z });
        return fromView(view, {
            x: clamp(p.x, floor.x0, floor.x1),
            z: clamp(p.z, floor.z0, floor.z1),
        });
    }

    /** A step of `dx`, `dz` in the view's frame (the screen's across, and
     * away or toward), in the room's. */
    function stepInRoom(dx, dz) {
        const o = fromView(view, { x: 0, z: 0 });
        const p = fromView(view, { x: dx, z: dz });
        return { dx: p.x - o.x, dz: p.z - o.z };
    }

    /** Spot { x, z } on the floor, off any furniture that blocks: out by
     * the nearest edge that's still on the floor. */
    function clear({ x, z }) {
        const b = blocked(x, z);
        if (!b) return { x, z };
        let best = { x, z };
        let bestDistance = Infinity;
        const p = itemLocal(b.item, { x, z });
        for (const [lx, lz] of [
            [b.x0, p.z],
            [b.x1, p.z],
            [p.x, b.z0],
            [p.x, b.z1],
        ]) {
            const edge = itemPoint(b.item, [lx, 0, lz]);
            const out = within(edge.x, edge.z);
            const distance = (out.x - x) ** 2 + (out.z - z) ** 2;
            if (distance < bestDistance && !blocked(out.x, out.z)) {
                best = out;
                bestDistance = distance;
            }
        }
        return best;
    }

    /** Where to stand to use `item`: in front of it, on the floor in
     * view. */
    function standAt(item) {
        const front = frontOf(placed(item));
        return clear(within(front.x, front.z));
    }

    const distanceTo = (item) => {
        const front = frontOf(placed(item));
        return Math.hypot(front.x - butt.x, front.z - butt.z);
    };

    /** The interactable the Butt is standing at, if any. */
    const nearest = computed(() => {
        let best = null;
        let bestDistance = REACH;
        for (const list of [room.interactables, extras()]) {
            for (const item of list) {
                const distance = distanceTo(item);
                if (distance <= bestDistance) {
                    best = item;
                    bestDistance = distance;
                }
            }
        }
        return best;
    });

    /** The door the Butt is close enough to walk through, if any. */
    function doorway() {
        let best = null;
        let bestDistance = TRIGGER_REACH;
        // Only the room's own things: nothing fetched walks you anywhere.
        for (const item of room.interactables) {
            const distance = distanceTo(item);
            if (autoTriggers(item) && distance <= bestDistance) {
                best = item;
                bestDistance = distance;
            }
        }
        return best;
    }

    /** Advances the room by `dt` s; whether anything moved. */
    function step(dt) {
        if (state.frozen) return false;
        const { keys } = state;
        let dx = 0;
        let dz = 0;
        let arrived = false;
        if (keys.x || keys.z) {
            const length = Math.hypot(keys.x, keys.z);
            ({ dx, dz } = stepInRoom(
                (keys.x / length) * WALK_SPEED * dt,
                (keys.z / length) * WALK_SPEED * dt
            ));
        } else if (target) {
            const gx = target.x - butt.x;
            const gz = target.z - butt.z;
            const gap = Math.hypot(gx, gz);
            const max = DRAG_SPEED * dt;
            if (gap <= max) {
                dx = gx;
                dz = gz;
                arrived = !state.dragging;
            } else {
                dx = (gx / gap) * max;
                dz = (gz / gap) * max;
            }
        }

        // Against a wall, a held key goes nowhere: that isn't walking.
        // Into furniture, it slides along it, or stops.
        let { x, z } = dx || dz ? within(butt.x + dx, butt.z + dz) : butt;
        if (blocked(x, z)) {
            if (!blocked(x, butt.z)) z = butt.z;
            else if (!blocked(butt.x, z)) x = butt.x;
            else [x, z] = [butt.x, butt.z];
            // Stuck short of where it was going: it's got as far as it can.
            if (target && x === butt.x && z === butt.z) {
                arrived = !state.dragging;
            }
        }
        const walking = x !== butt.x || z !== butt.z;
        let changed = walking !== butt.walking;
        butt.walking = walking;
        if (walking) {
            // Facing the way it goes across the screen.
            const across =
                toView(view, { x, z }).x -
                toView(view, { x: butt.x, z: butt.z }).x;
            butt.x = x;
            butt.z = z;
            if (across !== 0) butt.facing = Math.sign(across);
            butt.bob = isReducedMotion?.()
                ? 0
                : (butt.bob + dt) % (Math.PI * 2);
            changed = true;
        } else if (butt.bob !== 0) {
            // Stopped: back down on the floor, not hanging mid-bob.
            butt.bob = 0;
            changed = true;
        }
        if (arrived) arrive();
        return changed;
    }

    /** The Butt got where it was going: use what it was sent to, or a door
     * it walked up to (not the one it set off from). */
    function arrive() {
        if (target.quiet) {
            target = null;
            return;
        }
        const door = doorway();
        const item = target.item ?? (door !== walkFrom ? door : null);
        target = null;
        if (item) use(item);
    }

    function use(item) {
        state.frozen = true;
        onArrive?.(item);
    }

    /** Walks to the floor at (x, z). */
    function walkTo(x, z) {
        if (state.frozen) return;
        walkFrom = doorway();
        target = clear(within(x, z));
    }

    /** Walks up to someone standing at (x, z): toward them, stopping
     * FOLLOW_GAP short, and using nothing there, a door included. Already
     * that close, it stays put. */
    function walkUpTo(x, z) {
        if (state.frozen) return;
        faceToward(inside(x, z));
        const gx = x - butt.x;
        const gz = z - butt.z;
        const gap = Math.hypot(gx, gz);
        if (gap <= FOLLOW_GAP) {
            target = null;
            return;
        }
        const k = (gap - FOLLOW_GAP) / gap;
        target = {
            ...clear(within(butt.x + gx * k, butt.z + gz * k)),
            quiet: true,
        };
    }

    /** Spot (x, z) moved inside the room's walls (someone else's, who may
     * say anything, and faces whichever wall they like). */
    function inside(x, z) {
        return {
            x: clamp(x, margin("left"), w - margin("right")),
            z: clamp(z, margin("back"), d - margin("front")),
        };
    }

    /** Walks to `item` and uses it there; uses it now if already there. */
    function goUse(item) {
        if (state.frozen) return;
        faceToward(placed(item));
        if (distanceTo(item) <= REACH) return use(item);
        target = { ...standAt(item), item };
    }

    /** Stands the Butt at `item` straight away, as keyboard focus does on
     * the road: the keyboard route shouldn't make you wait. */
    function standBy(item) {
        if (state.frozen) return;
        faceToward(placed(item));
        target = null;
        Object.assign(butt, standAt(item));
    }

    /** Turns to face `faced`: whatever's in hand stops, the Butt is kept
     * to the new floor in view (facing the end wall of a long hall, it's
     * brought to that end), and onTurn hears of it. */
    function face(faced) {
        if (faced === view.wall) return;
        halt();
        setView(faced);
        Object.assign(butt, clear(within(butt.x, butt.z)));
        onTurn?.(faced);
    }

    /** Faces whichever wall `thing` ({ x, y?, z, wall? }) is seen from, if
     * it's out of view: on the wall behind the camera, or past the floor
     * in view. */
    function faceToward(thing) {
        if (!inView(thing, view, band)) face(wallToFace(thing, room.size));
    }

    function startDrag() {
        if (state.frozen) return;
        state.dragging = true;
        walkFrom = doorway();
        target = { x: butt.x, z: butt.z };
    }

    /** The finger is over the floor at (x, z): stroll toward it. */
    function updateDrag(x, z) {
        if (!state.dragging) return;
        target = clear(within(x, z));
    }

    /** Let go: the Butt finishes the stroll, and a door it lands at opens. */
    function endDrag() {
        state.dragging = false;
    }

    /** A cancelled drag (an incoming call): stop where it is. */
    function cancelDrag() {
        state.dragging = false;
        target = null;
    }

    /** Holds an arrow key down (or lets it go, with 0) on `axis`. */
    function setKey(axis, dir) {
        state.keys[axis] = dir;
        if (dir) target = null;
    }

    /** Stops everything in hand: keys, a stroll, a drag. */
    function halt() {
        state.keys.x = 0;
        state.keys.z = 0;
        state.dragging = false;
        target = null;
    }

    function unfreeze() {
        state.frozen = false;
        halt();
    }

    return {
        butt,
        state,
        nearest,
        step,
        walkTo,
        walkUpTo,
        inside,
        goUse,
        standBy,
        face,
        startDrag,
        updateDrag,
        endDrag,
        cancelDrag,
        setKey,
        halt,
        unfreeze,
    };
}
