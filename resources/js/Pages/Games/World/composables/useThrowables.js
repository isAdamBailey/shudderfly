import { ref } from "vue";
import { wallHeightOf } from "../scenes/roomLayout.js";
import { FOOTPRINTS } from "../three/footprints.js";
import { clamp, tossTilt } from "./useGamesWorld.js";

// The kitchen's fruit, thrown about the room as the road's are along the
// verge (useIdlerPhysics.js), but in the room's own world units and in all
// three directions: they bounce off its four walls and ceiling, land on the
// floor or on whatever stands against the back wall (a counter, the fridge),
// and roll to a stop.
const GRAVITY = 1800; // units/s²
// The share of its speed a throwable keeps off a wall, and off the floor.
const WALL_BOUNCE = 0.6;
const FLOOR_BOUNCE = 0.45;
// Below this speed (units/s) off the floor, it stops bouncing.
const SETTLE_SPEED = 80;
// How fast it slows rolling on what it landed on (per s), and the speed at
// which it comes to rest.
const ROLL_FRICTION = 4;
const REST_SPEED = 10;
// The fastest a fling can throw one, units/s.
const MAX_SPEED = 2600;
// How much of a fling's speed carries it out into the room, toward the
// camera: a finger can only throw across and up, so every throw also sails
// forward.
const FORWARD = 0.4;
// A ledge no higher than this (units) is stepped up onto, not bounced off
// or stopped at: the oven's cooktop and the worktop beside it differ by
// less than a unit.
const STEP = 4;
// A finger held still this long (ms) before it lets go throws nothing: it
// drops what it holds.
const STALE_FLING = 80;

/** What stands against the back wall that a throwable can land on or bounce
 * off, as footprints out from the wall with a top: the room's `counters`,
 * and any modelled prop on the floor with a footprint (three/footprints.js),
 * at its size. */
export function roomBlocks(room) {
    const props = room.interactables
        .filter((item) => FOOTPRINTS[item.model] && !item.y && !item.z)
        .map((item) => {
            const f = FOOTPRINTS[item.model];
            return {
                x: item.x,
                w: f.w * item.size,
                d: f.d * item.size,
                h: f.top * item.size,
            };
        });
    return [...(room.counters ?? []), ...props].map(({ x, w, d, h }) => ({
        x0: x - w / 2,
        x1: x + w / 2,
        z1: d,
        top: h,
    }));
}

const inside = (b, x, z) => x >= b.x0 && x <= b.x1 && z <= b.z1;

/**
 * The `throwable` things in `room` ({ size, frame?, counters?,
 * interactables }): where each is (`at`, by id: { x, y, z, vx, vy, vz,
 * held, flying }), picking one up, carrying it, letting it go with the
 * fling it was carried with, and the flight after, driven by `step(dt)`.
 * The physics runs on plain objects; `version` ticks when any of them
 * moves, for whatever draws them to follow. `isReducedMotion()` drops a
 * let-go throwable straight onto what's under it instead of flinging it;
 * `onLand(id)` hears where one comes to rest; `toward()` is the way to the
 * camera ({ x, z }, a step off the wall it faces; the back's if not given),
 * which every throw also sails.
 */
export function useThrowables(
    room,
    { isReducedMotion, onLand, toward = () => ({ x: 0, z: 1 }) } = {}
) {
    const { w, d } = room.size;
    const ceiling = wallHeightOf(room);
    const blocks = roomBlocks(room);
    const radius = new Map();
    const at = {};
    for (const item of room.interactables) {
        if (!item.throwable) continue;
        radius.set(item.id, item.size / 2);
        at[item.id] = {
            x: item.x,
            y: item.y ?? 0,
            z: item.z,
            vx: 0,
            vy: 0,
            vz: 0,
            held: false,
            flying: false,
            // Moved since changed() last asked.
            dirty: false,
            // When it was last carried ({ t }), for its fling.
            last: null,
        };
    }
    const version = ref(0);

    function moved(p) {
        p.dirty = true;
        version.value += 1;
    }

    /** How high the surface is under (x, z): the floor, or the top of
     * whatever stands there. */
    function groundAt(x, z) {
        let top = 0;
        for (const b of blocks) {
            if (inside(b, x, z)) top = Math.max(top, b.top);
        }
        return top;
    }

    /** (x, y, z) kept inside the room for throwable `id`, and on top of
     * anything it's over. */
    function within(id, x, y, z) {
        const r = radius.get(id);
        const cx = clamp(x, r, w - r);
        const cz = clamp(z, r, d - r);
        const cy = clamp(y, groundAt(cx, cz), ceiling - r * 2);
        return { x: cx, y: cy, z: cz };
    }

    /** Throwable `id` comes to rest where it is, on what's under it; `onLand`
     * hears of it unless it was only put down (`quiet`). */
    function settle(id, p, quiet = false) {
        Object.assign(p, {
            y: groundAt(p.x, p.z),
            vx: 0,
            vy: 0,
            vz: 0,
            held: false,
            flying: false,
            last: null,
        });
        moved(p);
        if (!quiet) onLand?.(id);
    }

    /** Picks throwable `id` up where it is. */
    function grab(id) {
        const p = at[id];
        if (!p) return;
        Object.assign(p, { held: true, flying: false, vx: 0, vy: 0, vz: 0 });
        p.last = null;
    }

    /** Carries the held throwable `id` to `to` ({ x, y, z }, z staying
     * where it is if it doesn't say: across the screen, at its depth, when
     * the camera faces the back) at time `now` (ms): how fast it's carried
     * is the fling it's let go with. */
    function carry(id, { x, y, z }, now = performance.now()) {
        const p = at[id];
        if (!p?.held) return;
        let to = within(id, x, y, z ?? p.z);
        // Carried low into the side of something taller, it stops there,
        // as it would bounce off it in flight, rather than climb onto it.
        if (blocks.some((b) => climbs(b, p, to))) {
            to = within(id, p.x, y, p.z);
        }
        // Its fling is how fast it really moved, not the finger pushing it
        // into the floor or a wall.
        if (p.last) {
            const dt = Math.max((now - p.last.t) / 1000, 1 / 120);
            p.vx = (to.x - p.x) / dt;
            p.vy = (to.y - p.y) / dt;
            p.vz = (to.z - p.z) / dt;
        }
        p.last = { t: now };
        Object.assign(p, to);
        moved(p);
    }

    /** Whether moving from `p` to `to` takes it into block `b` from the
     * side, lower than its top (by more than a STEP). */
    function climbs(b, p, to) {
        return (
            inside(b, to.x, to.z) && !inside(b, p.x, p.z) && b.top - p.y > STEP
        );
    }

    /** Lets go of throwable `id` at time `now` (ms), flinging it as fast as
     * it was last carried, unless it was held still, and out toward the
     * camera. */
    function release(id, now = performance.now()) {
        const p = at[id];
        if (!p?.held) return;
        if (isReducedMotion?.()) {
            settle(id, p);
            return;
        }
        // Held still before letting go, it falls from where it is.
        const still = !p.last || now - p.last.t > STALE_FLING;
        const speed = still ? 0 : Math.hypot(p.vx, p.vy, p.vz);
        const k = speed > MAX_SPEED ? MAX_SPEED / speed : still ? 0 : 1;
        const forward = speed * k * FORWARD;
        const out = toward();
        Object.assign(p, {
            vx: p.vx * k + out.x * forward,
            vy: p.vy * k,
            vz: p.vz * k + out.z * forward,
            held: false,
            flying: true,
            last: null,
        });
    }

    /** Advances one throwable's flight by `dt` s. */
    function fly(id, p, dt) {
        const r = radius.get(id);
        p.vy -= GRAVITY * dt;
        let x = p.x + p.vx * dt;
        let y = p.y + p.vy * dt;
        let z = p.z + p.vz * dt;

        // Into the side or front of something it's lower than: off it.
        for (const b of blocks) {
            if (!inside(b, x, z) || y >= b.top - STEP || p.y >= b.top) {
                continue;
            }
            if (p.x < b.x0 || p.x > b.x1) {
                x = p.x;
                p.vx = -p.vx * WALL_BOUNCE;
            }
            if (p.z > b.z1) {
                z = p.z;
                p.vz = -p.vz * WALL_BOUNCE;
            }
        }

        // The four walls and the ceiling.
        if (x < r || x > w - r) {
            x = clamp(x, r, w - r);
            p.vx = -p.vx * WALL_BOUNCE;
        }
        if (z < r || z > d - r) {
            z = clamp(z, r, d - r);
            p.vz = -p.vz * WALL_BOUNCE;
        }
        if (y > ceiling - r * 2) {
            y = ceiling - r * 2;
            p.vy = -Math.abs(p.vy) * WALL_BOUNCE;
        }

        // The floor, or what it came down on: a bounce, then a roll.
        const ground = groundAt(x, z);
        if (y <= ground) {
            y = ground;
            if (p.vy < -SETTLE_SPEED) {
                p.vy = -p.vy * FLOOR_BOUNCE;
            } else {
                p.vy = 0;
                const slow = Math.exp(-ROLL_FRICTION * dt);
                p.vx *= slow;
                p.vz *= slow;
            }
        }
        p.x = x;
        p.y = y;
        p.z = z;
        moved(p);

        if (p.vy === 0 && Math.hypot(p.vx, p.vz) < REST_SPEED) settle(id, p);
    }

    /** Advances every throwable in flight by `dt` s; whether any moved. */
    function step(dt) {
        let any = false;
        for (const [id, p] of Object.entries(at)) {
            if (!p.flying) continue;
            fly(id, p, dt);
            any = true;
        }
        return any;
    }

    /** Puts down anything held, where it is, onto what's under it (the
     * tab was hidden, a card came up): only put down, it feeds nothing. */
    function drop() {
        for (const [id, p] of Object.entries(at)) {
            if (p.held) settle(id, p, true);
        }
    }

    /** Each throwable that moved since this was last asked, as the scene
     * graph stands it: on what's under it, lifted off that, spinning with
     * the speed it was thrown at. */
    function changed() {
        const out = [];
        for (const [id, p] of Object.entries(at)) {
            if (!p.dirty) continue;
            p.dirty = false;
            out.push({
                id,
                x: p.x,
                y: p.y,
                z: p.z,
                ground: groundAt(p.x, p.z),
                tilt: p.flying ? tossTilt(p.vx) : 0,
            });
        }
        return out;
    }

    /** `item` where it is now, if it's been thrown. Reads `version`, so a
     * computed over it follows the throw. */
    function placed(item) {
        const p = at[item.id];
        if (!p) return item;
        void version.value;
        return { ...item, x: p.x, y: p.y, z: p.z };
    }

    return {
        at,
        version,
        groundAt,
        grab,
        carry,
        release,
        step,
        drop,
        changed,
        placed,
    };
}
