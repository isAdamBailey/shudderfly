/**
 * Where the Garage's door was left (issue #230), remembered on this
 * device beside its clicker and door styles (useGarageStyles.js): as the
 * opener's rest() gives it, { position (0 shut … 1 open), last (+1 up,
 * -1 down) }. Room3D.vue saves where it's heading (rest()) on every
 * press and every turn back by its safety sensor; the road reads it to
 * draw the door from outside and to say whether you can go in. Storage
 * that's blocked, empty or holds nonsense gives a shut door.
 */

const KEY = "games.world.garage.position";

const SHUT = { position: 0, last: -1 };

/** The door as it was left: { position, last }. */
export function savedGarageDoor() {
    try {
        const saved = JSON.parse(localStorage.getItem(KEY));
        const position = Number(saved?.position);
        if (!Number.isFinite(position) || position < 0 || position > 1) {
            return { ...SHUT };
        }
        return { position, last: saved.last === 1 ? 1 : -1 };
    } catch {
        return { ...SHUT };
    }
}

/** Remembers the door at `rest` ({ position, last }). */
export function saveGarageDoor({ position, last }) {
    try {
        localStorage.setItem(KEY, JSON.stringify({ position, last }));
    } catch {
        // Not remembered, then: it's shut again next visit.
    }
}

/** Whether the door was left all the way up, so you can go through it. */
export function garageDoorOpen() {
    return savedGarageDoor().position === 1;
}
