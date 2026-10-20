import { channelName } from "@/utils/broadcastChannel";
import { sameId } from "@/utils/object";
import { whenEcho } from "@/utils/whenEcho";
import { computed, ref } from "vue";

const ROSTER = "world";

// The Pusher budget (issue #174): what a client may whisper, and how often.
// A move goes at most this often, and only once it is this far from the last
// one sent or something else about it changed. Stopping goes at once.
export const MOVE_EVERY_MS = 2000;
export const MOVE_MIN_PX = 80;
// A scene with this many people in it gets no positions at all, and no more
// than this many other people are drawn.
export const CROWD = 8;
// Someone walking sends a move every MOVE_EVERY_MS. Heard nothing for this
// long, they've stopped (their tab hid before the stop went out).
const STALE_MS = 5000;
// Nobody stands further from the start of a scene than this.
const POSITION_LIMIT = 100000;

const isCoordinate = (n) =>
    Number.isInteger(n) && Math.abs(n) <= POSITION_LIMIT;

/** A whispered place or move, checked and trimmed to what we draw, or null
 * for anything else. A place says nothing of facing or moving. */
function readPosition(data, { place }) {
    if (!data || typeof data !== "object") return null;
    const { x, z, lane } = data;
    const facing = place ? 1 : data.facing;
    const moving = place ? 0 : data.moving;
    if (!isCoordinate(x) || !isCoordinate(z)) return null;
    if (lane !== 0 && lane !== 1) return null;
    if (facing !== -1 && facing !== 1) return null;
    if (moving !== 0 && moving !== 1) return null;
    return { x, z, lane, facing, moving };
}

/** Whether `next` is worth a whisper after `last`. */
function changedEnough(last, next) {
    return (
        !last ||
        Math.abs(next.x - last.x) >= MOVE_MIN_PX ||
        Math.abs(next.z - last.z) >= MOVE_MIN_PX ||
        next.lane !== last.lane ||
        next.facing !== last.facing ||
        next.moving !== last.moving
    );
}

/**
 * Being in the Games World with other people (issue #174). This is the only
 * place that joins the world's channels and the only one that whispers on
 * them.
 *
 * - `world`, the roster: everyone in the world, as `{ id, name }` members,
 *   and which scene each is in, from the `client-place` ({ scene }) each
 *   sends on joining it, on changing scene and when someone new joins it,
 *   as `roster` (everyone but you).
 * - `world.<scene id>`, the scene you are standing in (enterScene): where
 *   the people in it are, from their `client-place` on arrival and their
 *   `client-move`s, as `others`.
 *
 * Positions are `{ x, z, lane, facing, moving }` in the scene's own whole
 * units: the road's x and lane (z 0), a room's x and z (lane 0).
 *
 * `enabled` is decided once by the page (the `world_together_enabled` setting
 * and a logged-in visitor). Off, nothing is ever joined or sent, so the world
 * is exactly what it is without this. `me` is the visitor's user id;
 * `scenes` the ids of every scene, the only ones a place may name.
 */
export function useWorldPresence({ enabled, me = null, scenes = [] }) {
    const knownScenes = new Set(scenes);
    const members = ref([]);
    // Which scene each person on the roster last said they were in: user
    // id → scene id.
    const places = ref({});
    // Who is in the scene with you (yourself included), and where the ones
    // who have said are: user id → readPosition()'s.
    const sceneMembers = ref([]);
    const positions = ref({});

    let cancelWait = null;
    // The roster's channel, once joined.
    let roster = null;
    let rosterReady = false;
    // Whether the roster has yet to hear which scene you're in now.
    let placeUntold = false;

    let sceneId = null;
    let sceneName = null;
    let sceneChannel = null;
    let sceneReady = false;
    // Where you are (move()'s), what was last whispered, and when.
    let current = null;
    let lastSent = null;
    let lastSentAt = -Infinity;
    let moveTimer = null;
    // Whether you've walked since the last whisper.
    let walked = false;
    const staleTimers = {};

    const without = (list, member) =>
        list.filter((m) => !sameId(m.id, member.id));

    /** Everyone else in the world, and the scene each is in (null until
     * they say). */
    const rosterList = computed(() =>
        members.value
            .filter((member) => !sameId(member.id, me))
            .map((member) => ({
                id: member.id,
                name: member.name,
                scene: places.value[member.id] ?? null,
            }))
    );

    /** The other people standing in your scene, where they are: no more
     * than CROWD of them. */
    const others = computed(() =>
        sceneMembers.value
            // A crowd sends no positions, so what was heard is stale.
            .filter((member) => !crowded() && positions.value[member.id])
            .slice(0, CROWD)
            .map((member) => ({
                id: member.id,
                name: member.name,
                ...positions.value[member.id],
            }))
    );

    function join() {
        if (!enabled || roster || cancelWait) return;
        // A tab that was hidden when the roster needed telling tells it
        // once it's back.
        document.addEventListener("visibilitychange", tellRoster);
        cancelWait = whenEcho(joinRoster);
    }

    function joinRoster(echo) {
        cancelWait = null;
        try {
            roster = echo
                .join(channelName(ROSTER))
                .here((here) => {
                    members.value = here;
                    rosterReady = true;
                    tellRoster();
                })
                .joining((member) => {
                    members.value = [...without(members.value, member), member];
                    // Someone new: they don't know where you are yet.
                    placeUntold = true;
                    tellRoster();
                })
                .leaving((member) => {
                    members.value = without(members.value, member);
                    forgetPlace(member.id);
                })
                // Refused (switched off since the page loaded): nobody
                // to see, and nothing else changes.
                .error((error) => {
                    console.warn("Not let into the Games World roster:", error);
                    members.value = [];
                    places.value = {};
                    rosterReady = false;
                })
                .listenForWhisper("place", hearPlace);
        } catch (e) {
            console.error("Error joining the Games World roster:", e);
            roster = null;
            return;
        }
        if (sceneId) joinScene();
    }

    function leave() {
        cancelWait?.();
        cancelWait = null;
        document.removeEventListener("visibilitychange", tellRoster);
        leaveScene();
        current = null;
        members.value = [];
        places.value = {};
        rosterReady = false;
        if (!roster) return;
        roster = null;
        window.Echo?.leave(channelName(ROSTER));
    }

    /** Tells the roster which scene you're in, once it hasn't heard.
     * Nobody else there, nothing goes: whoever joins is told then. */
    function tellRoster() {
        if (
            !placeUntold ||
            !sceneId ||
            !rosterReady ||
            document.hidden ||
            members.value.length < 2
        ) {
            return;
        }
        try {
            roster.whisper("place", { scene: sceneId });
            placeUntold = false;
        } catch (e) {
            console.warn("Couldn't whisper in the Games World:", e);
        }
    }

    /** Someone on the roster says which scene they're in. */
    function hearPlace(data, meta) {
        const id = meta?.user_id;
        const member = members.value.find((m) => sameId(m.id, id));
        if (!member || sameId(id, me)) return;
        const scene = data?.scene;
        if (!knownScenes.has(scene)) return;
        places.value = { ...places.value, [member.id]: scene };
    }

    function forgetPlace(id) {
        if (!(id in places.value)) return;
        const rest = { ...places.value };
        delete rest[id];
        places.value = rest;
    }

    // --- The scene you're in -------------------------------------------------

    /** Standing in scene `id` now: its channel, instead of the last one's.
     * Waits for the roster when Echo hasn't arrived yet. */
    function enterScene(id) {
        if (!enabled || id === sceneId) return;
        leaveScene();
        sceneId = id;
        // Where you stand here comes with the scene's first move().
        current = null;
        placeUntold = true;
        tellRoster();
        if (roster) joinScene();
    }

    function joinScene() {
        sceneName = channelName(`${ROSTER}.${sceneId}`);
        try {
            sceneChannel = window.Echo.join(sceneName)
                .here((here) => {
                    sceneMembers.value = here;
                    sceneReady = true;
                    // Here, so everyone already in sees where.
                    if (current) {
                        send("place", place(current), {
                            ...current,
                            facing: 1,
                            moving: 0,
                        });
                    }
                })
                .joining((member) => {
                    sceneMembers.value = [
                        ...without(sceneMembers.value, member),
                        member,
                    ];
                    // Someone new: they don't know where you are yet.
                    if (current) send("move", current);
                })
                .leaving((member) => {
                    const wasCrowded = crowded();
                    sceneMembers.value = without(sceneMembers.value, member);
                    forget(member.id);
                    // Room again: everyone says where they are once more,
                    // as nobody did while it was crowded.
                    if (wasCrowded && !crowded() && current) {
                        send("move", current);
                    }
                })
                .error((error) => {
                    console.warn("Not let into the Games World scene:", error);
                    sceneMembers.value = [];
                    sceneReady = false;
                })
                // A place for some other scene is nothing to draw here.
                .listenForWhisper("place", (data, meta) =>
                    hear(meta, data?.scene === sceneId ? data : null, true)
                )
                .listenForWhisper("move", (data, meta) =>
                    hear(meta, data, false)
                );
        } catch (e) {
            console.error("Error joining the Games World scene:", e);
            sceneChannel = null;
        }
    }

    /** Out of the scene you were in, into none (the world left). */
    function leaveScene() {
        clearTimeout(moveTimer);
        moveTimer = null;
        Object.keys(staleTimers).forEach(stopStale);
        sceneMembers.value = [];
        positions.value = {};
        lastSent = null;
        lastSentAt = -Infinity;
        walked = false;
        sceneReady = false;
        if (sceneChannel) window.Echo?.leave(sceneName);
        sceneChannel = null;
        sceneName = null;
        sceneId = null;
    }

    const place = ({ x, z, lane }) => ({ scene: sceneId, x, z, lane });

    // --- Hearing -------------------------------------------------------------

    /** A place or move whispered by someone in the scene. Pusher says who
     * sent it, so a payload can't speak for someone else. */
    function hear(meta, data, isPlace) {
        const id = meta?.user_id;
        const member = sceneMembers.value.find((m) => sameId(m.id, id));
        if (!member || sameId(id, me)) return;
        const position = readPosition(data, { place: isPlace });
        if (!position) return;
        positions.value = { ...positions.value, [member.id]: position };

        stopStale(member.id);
        if (position.moving) {
            staleTimers[member.id] = setTimeout(() => {
                delete staleTimers[member.id];
                const last = positions.value[member.id];
                if (last) {
                    positions.value = {
                        ...positions.value,
                        [member.id]: { ...last, moving: 0 },
                    };
                }
            }, STALE_MS);
        }
    }

    function stopStale(id) {
        clearTimeout(staleTimers[id]);
        delete staleTimers[id];
    }

    function forget(id) {
        stopStale(id);
        if (!(id in positions.value)) return;
        const rest = { ...positions.value };
        delete rest[id];
        positions.value = rest;
    }

    // --- Sending -------------------------------------------------------------

    // Pusher bills a whisper nobody hears, so someone alone in a scene
    // sends nothing: whoever arrives is told on `joining`.
    const crowded = () => sceneMembers.value.length >= CROWD;

    function canSend() {
        return (
            sceneReady &&
            !document.hidden &&
            sceneMembers.value.length > 1 &&
            !crowded()
        );
    }

    /** Whispers `data`; `heard` is what others now think of you (a place
     * says nothing of facing or moving, so they take 1 and 0). */
    function send(event, data, heard = data) {
        if (!canSend()) return;
        try {
            sceneChannel.whisper(event, data);
        } catch (e) {
            // A dropped whisper only leaves you standing still for others.
            console.warn("Couldn't whisper in the Games World:", e);
            return;
        }
        lastSent = heard;
        lastSentAt = Date.now();
        walked = false;
    }

    /** Where you are now, `{ x, z, lane, facing, moving }` in the scene's own
     * whole units, whenever it changes. It goes out under the rate rules
     * above: a change waits for the next MOVE_EVERY_MS, and only a stop goes
     * at once. */
    function move(state) {
        if (!enabled) return;
        current = state;
        if (state.moving) walked = true;
        if (!canSend()) return;
        if (lastSent?.moving && !state.moving) {
            clearTimeout(moveTimer);
            flushMove();
            return;
        }
        if (moveTimer) return;
        const wait = lastSentAt + MOVE_EVERY_MS - Date.now();
        if (wait <= 0) flushMove();
        else moveTimer = setTimeout(flushMove, wait);
    }

    function flushMove() {
        moveTimer = null;
        if (!current) return;
        // A walk that ended short of MOVE_MIN_PX still ends somewhere else.
        const stoppedElsewhere =
            walked &&
            !current.moving &&
            (current.x !== lastSent?.x || current.z !== lastSent?.z);
        if (stoppedElsewhere || changedEnough(lastSent, current)) {
            send("move", current);
        }
    }

    return {
        enabled,
        members,
        roster: rosterList,
        others,
        join,
        leave,
        enterScene,
        leaveScene,
        move,
    };
}
