import { computed, ref, shallowRef, unref } from "vue";

const STORAGE_KEY = "games-world.place";

/** sessionStorage, or null where reading it throws (blocked storage). */
function sessionStore() {
    try {
        return window.sessionStorage;
    } catch {
        return null;
    }
}

/**
 * Which scene of the Games World is showing, how it was reached, and where
 * the player was (issue #130). DOM-free like useGamesWorld: the stage reads
 * `current` and mounts its renderer, and the scene places the Butt from
 * `arrival`.
 *
 * `arrival` is how the current scene was reached: `{ spot }` through a door
 * (the id of the interactable to stand at), `{ position }` restored from
 * sessionStorage (whatever the scene saved: the road's { x, side }), or `{}`.
 *
 * Options:
 * - link: a shared link (`/games?scene=house.hall`) as the server sends it,
 *   { scene, visit }. `visit` is new on every click of the link but the same
 *   when the browser comes back to the page from history, so a fresh click
 *   opens at the link and coming back from a game to that URL puts you
 *   where you were.
 * - storage: the Storage to remember the place in (default sessionStorage).
 *   Every read and write may throw; the world opens on the road if it does.
 */
export function useSceneRouter(scenes, { link = null, storage } = {}) {
    const store = storage === undefined ? sessionStore() : storage;
    const exists = (id) =>
        typeof id === "string" &&
        Object.prototype.hasOwnProperty.call(unref(scenes) ?? {}, id);

    const saved = read();
    const linked =
        exists(link?.scene) && link.visit !== saved?.visit ? link.scene : null;
    const restored = !linked && exists(saved?.scene) ? saved : null;

    const currentId = ref(linked ?? restored?.scene ?? "road");
    const arrival = shallowRef(
        restored ? { position: restored.position ?? null } : {}
    );
    // The link visit this page was opened with, kept with the saved place.
    const visit = linked ? link.visit : saved?.visit ?? null;

    // Scene ids left through doors, most recent last: Escape goes back the
    // way you came.
    const history = [];

    const current = computed(() =>
        exists(currentId.value) ? unref(scenes)[currentId.value] : null
    );

    function read() {
        try {
            const place = JSON.parse(store?.getItem(STORAGE_KEY) ?? "null");
            return place && typeof place === "object" ? place : null;
        } catch {
            return null;
        }
    }

    /** Saves the current scene and `position` (the scene's own, or null). */
    function remember(position = null) {
        try {
            store?.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    scene: currentId.value,
                    position,
                    visit,
                })
            );
        } catch {
            // Full or blocked: the world just won't remember.
        }
    }

    /** Moves to scene `id`, arriving at `spot`. False for an unknown id. */
    function goTo(id, { spot = null } = {}) {
        if (!exists(id)) return false;
        // Going back where you came from unwinds rather than piling up, and
        // going out through the exit (with nothing to unwind: a reload, a
        // link) isn't a way back either, or the next exit would lead straight
        // back in.
        if (history[history.length - 1] === id) history.pop();
        else if (!leadsOut(id)) history.push(currentId.value);
        currentId.value = id;
        arrival.value = spot ? { spot } : {};
        remember();
        return true;
    }

    /** Stays in the current scene but arrives again at `position` (the
     * scene's own, or null), for a scene drawn afresh, e.g. by another
     * renderer. */
    function stay(position) {
        arrival.value = position ? { position } : {};
    }

    /** Whether the current scene's `exit` door leads to scene `id`. */
    function leadsOut(id) {
        return (current.value?.interactables ?? []).some(
            (item) => item.type === "door" && item.exit && item.to === id
        );
    }

    /** The door that leaves the current scene: the one back to where you
     * came from, or, with no history (a reload, a shared link), the one the
     * registry marks `exit`. Null outside (the road), which has neither. */
    function exitDoor() {
        const doors = (current.value?.interactables ?? []).filter(
            (item) => item.type === "door"
        );
        const back = history[history.length - 1];
        return (
            doors.find((door) => back && door.to === back) ??
            doors.find((door) => door.exit) ??
            null
        );
    }

    return { current, currentId, arrival, goTo, stay, exitDoor, remember };
}
