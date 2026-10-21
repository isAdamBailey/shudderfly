import { sameId } from "@/utils/object";
import { computed, ref, watch } from "vue";

/** The door to take from scene `from` on the way to scene `to`: the first
 * door of the way through the fewest doors, or null when there's no way
 * (or you're there). `scenes` is the registry, scene id → scene. */
export function doorToward(scenes, from, to) {
    if (from === to || !scenes[from] || !scenes[to]) return null;
    // Scene id → the door out of `from` that reaches it soonest.
    const firstDoor = new Map([[from, null]]);
    const queue = [from];
    while (queue.length) {
        const id = queue.shift();
        for (const item of scenes[id].interactables ?? []) {
            if (item.type !== "door" || !scenes[item.to]) continue;
            if (firstDoor.has(item.to)) continue;
            const door = firstDoor.get(id) ?? item;
            if (item.to === to) return door;
            firstDoor.set(item.to, door);
            queue.push(item.to);
        }
    }
    return null;
}

/**
 * Following someone round the Games World (issue #174): to them in the
 * scene you share, or through the doors toward the scene they're in, and on
 * after them as they move. DOM-free: the stage hands it what it needs.
 *
 * - presence: useWorldPresence's ({ roster, ready, others }).
 * - scenes(): the registry, scene id → scene.
 * - currentId: the scene you're in (a ref).
 * - scene(): the mounted scene's API, which walks the Butt: walkUpTo(other)
 *   and walkThrough(door). Null while none is mounted.
 * - busy(): whether the stage is between scenes, when nothing is sent.
 * - canEnter(id): whether this browser can draw scene `id` (a room needs
 *   WebGL). A follow that would need one it can't stops.
 *
 * Whatever the player does to steer the Butt calls stop(); so does the
 * person leaving the world. startWhenHere(id) is for an invite's link:
 * once the roster says who is in the world, it follows them if they still
 * are, and steering before then calls it off. A scene may refuse a walk (a card is up): the
 * stage calls nudge() once it's let go, to try again.
 */
export function useFollow({
    presence,
    scenes,
    currentId,
    scene,
    busy = () => false,
    canEnter = () => true,
}) {
    // The user id being followed, or null.
    const following = ref(null);

    const leader = computed(() =>
        following.value === null
            ? null
            : presence.roster.value.find((m) =>
                  sameId(m.id, following.value)
              ) ?? null
    );

    /** Where they stand in your scene, if they've said. */
    const near = computed(() =>
        following.value === null
            ? null
            : presence.others.value.find((o) =>
                  sameId(o.id, following.value)
              ) ?? null
    );

    // Who to follow once the roster says who's there, or null.
    let awaited = null;

    function start(id) {
        awaited = null;
        following.value = id;
    }

    function stop() {
        awaited = null;
        following.value = null;
    }

    function startWhenHere(id) {
        awaited = id;
        followAwaited();
    }

    function followAwaited() {
        if (awaited === null || !presence.ready?.value) return;
        const id = awaited;
        awaited = null;
        if (presence.roster.value.some((m) => sameId(m.id, id))) start(id);
    }

    // Sync: who was there when the roster said, not who joined since.
    watch(() => presence.ready?.value, followAwaited, { flush: "sync" });

    /** Takes the next step after them: walks up to them here, or to the
     * door toward wherever they are. */
    function lead() {
        if (following.value === null) return;
        const who = leader.value;
        if (!who) return stop();
        const api = scene();
        // Their scene not said yet, or between scenes: wait for it.
        if (!api || busy() || !who.scene) return;
        if (who.scene === currentId.value) {
            if (near.value) api.walkUpTo(near.value);
            return;
        }
        const door = doorToward(scenes(), currentId.value, who.scene);
        if (!door || !canEnter(door.to)) return stop();
        api.walkThrough(door);
    }

    // Every new thing to go on: who, which scene they're in, where they
    // stand, which scene you're in and whether it's ready to walk. Each a
    // source of its own, so a new roster or list of others that changes
    // none of them doesn't walk anywhere again.
    watch(
        [
            following,
            () => leader.value?.scene,
            currentId,
            () => near.value?.x,
            () => near.value?.z,
            () => near.value?.lane,
            scene,
            busy,
        ],
        lead
    );

    return { following, leader, start, startWhenHere, stop, nudge: lead };
}
