import { computed, reactive } from "vue";
import { STAIRS_CLEARANCE, wallFacing } from "../scenes/roomLayout.js";
import { clamp, DRAG_SPEED, WALK_SPEED } from "./useGamesWorld.js";

// Close enough to an interactable to use it, in world units.
export const REACH = 120;
// Where the Butt stands to use something: this far in front of it.
export const STAND = 100;
// A walk that ends this close to where you'd use a door goes through it,
// unless it started there: a tap beside the door you just came in by
// mustn't send you back out.
export const TRIGGER_REACH = 60;
// The Butt never walks closer than this to a wall.
export const MARGIN = 50;

/** The spot in front of `item`, where the Butt stands to use it: a step
 * into the room off whichever wall it's on, or clear of a flight of stairs. */
function frontOf(item) {
    const face = wallFacing(item.wall);
    const stand = item.stairs ? STAIRS_CLEARANCE : STAND;
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
 * open front), where it's walking to, which interactable it's near, and
 * using one when it gets there. Rooms are rectangles and furniture never
 * blocks, so walking is a straight line; only stairs, which take up the
 * floor along their wall, keep the Butt further from it. Driven by
 * `step(dt)`.
 *
 * `room` is the scene ({ size: { w, d }, interactables }). Options:
 * - start: { x, z } where the Butt starts.
 * - onArrive(item): the Butt has reached something it was sent to use, or
 *   was dropped next to one that `autoTriggers` (a door, not a toy).
 * - autoTriggers(item): whether walking up to `item` uses it
 *   (interactions/index.js asks its handler).
 * - isReducedMotion(): suppresses the walking bob.
 * - extras(): interactables the scene's data doesn't list, fetched since
 *   (the books on a Library shelf).
 */
export function useRoom(
    room,
    {
        start,
        onArrive,
        autoTriggers = () => false,
        isReducedMotion,
        extras = () => [],
    } = {}
) {
    const { w, d } = room.size;
    const sideMargin = (wall) =>
        room.interactables.some((i) => i.stairs && i.wall === wall)
            ? STAIRS_CLEARANCE
            : MARGIN;
    const left = sideMargin("left");
    const right = sideMargin("right");

    const butt = reactive({
        x: clampX(start?.x ?? w / 2),
        z: clampZ(start?.z ?? d / 2),
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

    // Where the Butt is walking to: { x, z, item? }. With `item`, it uses
    // it on arrival.
    let target = null;
    // The door the Butt was at when this walk began, which it won't go
    // through just for ending the walk there again.
    let walkFrom = null;

    function clampX(x) {
        return clamp(x, left, w - right);
    }

    function clampZ(z) {
        return clamp(z, MARGIN, d);
    }

    /** Where to stand to use `item`: in front of it, inside the room. */
    function standAt(item) {
        const front = frontOf(item);
        return { x: clampX(front.x), z: clampZ(front.z) };
    }

    const distanceTo = (item) => {
        const front = frontOf(item);
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
            dx = (keys.x / length) * WALK_SPEED * dt;
            dz = (keys.z / length) * WALK_SPEED * dt;
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
        const x = clampX(butt.x + dx);
        const z = clampZ(butt.z + dz);
        const walking = x !== butt.x || z !== butt.z;
        let changed = walking !== butt.walking;
        butt.walking = walking;
        if (walking) {
            butt.x = x;
            butt.z = z;
            if (dx !== 0) butt.facing = Math.sign(dx);
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
        target = { x: clampX(x), z: clampZ(z) };
    }

    /** Walks to `item` and uses it there; uses it now if already there. */
    function goUse(item) {
        if (state.frozen) return;
        if (distanceTo(item) <= REACH) return use(item);
        target = { ...standAt(item), item };
    }

    /** Stands the Butt at `item` straight away, as keyboard focus does on
     * the road: the keyboard route shouldn't make you wait. */
    function standBy(item) {
        if (state.frozen) return;
        target = null;
        Object.assign(butt, standAt(item));
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
        target = { x: clampX(x), z: clampZ(z) };
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
        goUse,
        standBy,
        startDrag,
        updateDrag,
        endDrag,
        cancelDrag,
        setKey,
        halt,
        unfreeze,
    };
}
