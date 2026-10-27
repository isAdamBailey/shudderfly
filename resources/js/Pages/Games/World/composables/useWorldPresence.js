import { channelName } from "@/utils/broadcastChannel";
import { sameId } from "@/utils/object";
import { whenEcho } from "@/utils/whenEcho";
import throttle from "lodash/throttle";
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
// A radio tuned again and again sends no more often than this, the last
// tune winning.
export const RADIO_EVERY_MS = 1000;
// A song said to be further in than this is nothing to join.
const RADIO_SINCE_MS = 6 * 60 * 60 * 1000;
// Notes from an organ, harp or drum: no more than this many whispers a
// second, and none at all once a scene has more people in it than
// NOTE_CROWD. Notes played while one can't go wait for the next, together
// (no more than NOTE_BATCH of them), each saying how long after the first
// it came, so a strum or a tune is heard whole.
export const NOTES_PER_SECOND = 2;
export const NOTE_CROWD = 6;
export const NOTE_BATCH = 16;
// How many numbers a note may carry (its handler says what they mean).
const NOTE_MAX_NUMBERS = 16;
// No note in a whisper comes later than this after its first, ms.
const NOTE_AFTER_MS = 1000;

const isCoordinate = (n) =>
    Number.isInteger(n) && Math.abs(n) <= POSITION_LIMIT;

/** Whether `id` could be a thing's id in a scene. */
const isThingId = (id) => typeof id === "string" && /^[\w.-]{1,64}$/.test(id);

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

/** A whispered radio, checked: `{ id, songId, at, again }` for a song
 * `at` ms in, `{ id, songId: null }` for switched off, or null for anything
 * else. `again` marks a song told again for someone arriving. */
function readRadio(data) {
    if (!data || typeof data !== "object") return null;
    const { id, songId, at, again = false } = data;
    if (!isThingId(id)) return null;
    if (songId === null) return { id, songId: null };
    if (!Number.isInteger(songId) || songId < 1) return null;
    if (!Number.isInteger(at) || at < 0 || at > RADIO_SINCE_MS) return null;
    if (typeof again !== "boolean") return null;
    return { id, songId, at, again };
}

/** A note in a whisper, checked: `{ id, which, after }`, the instrument's
 * id, a short list of whole numbers and how many ms after the whisper's
 * first note it was played, or null for anything else. Whether `which` is
 * something it can play is its handler's to say (interactions/index.js
 * playedFrom). */
function readNote(data) {
    if (!data || typeof data !== "object") return null;
    const { id, which, after } = data;
    if (!isThingId(id)) return null;
    if (!Array.isArray(which) || which.length > NOTE_MAX_NUMBERS) return null;
    if (!which.every((n) => Number.isInteger(n) && n >= 0)) return null;
    if (!Number.isInteger(after) || after < 0 || after > NOTE_AFTER_MS) {
        return null;
    }
    return { id, which, after };
}

/** A whispered `{ notes }`, checked: its notes (readNote()'s), or null if
 * any isn't one. */
function readNotes(data) {
    const notes = data?.notes;
    if (!Array.isArray(notes) || notes.length === 0) return null;
    if (notes.length > NOTE_BATCH) return null;
    const read = notes.map(readNote);
    return read.every(Boolean) ? read : null;
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
 * - `world`, the roster: everyone in the world, as `{ id, name, avatar }`
 *   members, and which scene each is in, from the `client-place`
 *   ({ scene }) each sends on joining it, on changing scene and when
 *   someone new joins it, as `roster` (everyone but you); `ready` once it
 *   has said who's there.
 * - `world.<scene id>`, the scene you are standing in (enterScene): where
 *   the people in it are, from their `client-place` on arrival and their
 *   `client-move`s, as `others`; its radio, `client-radio`, sent
 *   through `radio()` and handed to `hearRadio`; and its instruments,
 *   `client-note`, sent through `note()` and handed to `hearNote`.
 *
 * Positions are `{ x, z, lane, facing, moving }` in the scene's own whole
 * units: the road's x and lane (z 0), a room's x and z (lane 0).
 *
 * `enabled` is decided once by the page (the `world_together_enabled` setting
 * and a logged-in visitor). Off, nothing is ever joined or sent, so the world
 * is exactly what it is without this. `me` is the visitor's user id;
 * `scenes` the ids of every scene, the only ones a place may name.
 *
 * A radio is `{ id, songId, startedAt }`, the radio's id, the song on it
 * and when it began in this browser's clock (`{ id, songId: null }`
 * switched off). On the wire it's `{ id, songId, at }`, `at` ms into the
 * song when sent, so no two clocks need agree. `hearRadio(radio)` is called
 * with someone else's in your scene; `radioNow(id)` says what's on radio
 * `id`, the one you last tuned, as `{ songId, startedAt }` (or null), to
 * tell someone who arrives. That retelling is marked `again`, and is only
 * for whoever hasn't heard the radio in this scene yet, so it doesn't
 * restart it for someone who switched theirs off.
 *
 * A note is `{ id, which }`: an instrument played, as its handler tells it
 * (interactions/index.js noteOf). On the wire a whisper is `{ notes }`,
 * each note with `after`, ms after the first. `hearNote(note)` is called
 * with each of someone else's in your scene, as far apart as they were
 * played, while this tab is showing.
 */
export function useWorldPresence({
    enabled,
    me = null,
    scenes = [],
    radioNow = () => null,
    hearRadio = () => {},
    hearNote = () => {},
}) {
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
    // Whether the roster has said who is in the world (its `here`).
    const rosterReady = ref(false);
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
    // Whether you tuned the radio last in this scene (so you're the one to
    // tell a newcomer).
    let radioMine = false;
    // The radio you last tuned here, to say what's on it.
    let radioTuned = null;
    // Whether you've heard (or tuned) a radio in this scene: a retelling is
    // then old news.
    let radioHeard = false;
    // Whether the radio to send next is a tune, not a retelling.
    let radioFresh = false;
    // Notes played while none could go, waiting for the next whisper, and
    // when the first of them was played.
    let notesWaiting = [];
    let notesSince = 0;
    // Someone else's notes waiting to be heard, as far apart as they were
    // played.
    const noteTimers = new Set();
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
                avatar: member.avatar,
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
                    rosterReady.value = true;
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
                    rosterReady.value = false;
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
        rosterReady.value = false;
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
            !rosterReady.value ||
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
                    // Someone new: they don't know where you are yet,
                    // or what's on the radio you tuned.
                    if (current) send("move", current);
                    tellRadio();
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
                )
                .listenForWhisper("radio", heardRadio)
                .listenForWhisper("note", heardNote);
        } catch (e) {
            console.error("Error joining the Games World scene:", e);
            sceneChannel = null;
        }
    }

    /** Out of the scene you were in, into none (the world left). */
    function leaveScene() {
        clearTimeout(moveTimer);
        moveTimer = null;
        sendRadio.cancel();
        sendNotes.cancel();
        notesWaiting = [];
        noteTimers.forEach(clearTimeout);
        noteTimers.clear();
        radioMine = false;
        radioTuned = null;
        radioHeard = false;
        radioFresh = false;
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

    /** Whether a whisper's sender is someone else in the scene. */
    function fromSomeoneHere(meta) {
        const id = meta?.user_id;
        return (
            !sameId(id, me) && sceneMembers.value.some((m) => sameId(m.id, id))
        );
    }

    /** Someone in the scene tuned its radio, or switched it off. */
    function heardRadio(data, meta) {
        if (!fromSomeoneHere(meta)) return;
        const radio = readRadio(data);
        if (!radio || (radio.again && radioHeard)) return;
        radioHeard = true;
        // Theirs now: they tell whoever arrives.
        radioMine = false;
        const { id: radioId, songId, at } = radio;
        hearRadio(
            songId === null
                ? { id: radioId, songId }
                : { id: radioId, songId, startedAt: Date.now() - at }
        );
    }

    /** Someone in the scene played an instrument. */
    function heardNote(data, meta) {
        // A hidden tab would only pile the notes up, to all sound at once.
        if (!fromSomeoneHere(meta) || document.hidden) return;
        for (const { id, which, after } of readNotes(data) ?? []) {
            if (after === 0) {
                hearNote({ id, which });
                continue;
            }
            const timer = setTimeout(() => {
                noteTimers.delete(timer);
                hearNote({ id, which });
            }, after);
            noteTimers.add(timer);
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

    const canWhisper = () =>
        sceneReady && !document.hidden && sceneMembers.value.length > 1;
    // A crowd hears no more moves; a radio is one whisper a tune.
    const canSend = () => canWhisper() && !crowded();

    /** Whispers `data`; `heard` is what others now think of you (a place
     * says nothing of facing or moving, so they take 1 and 0). */
    function send(event, data, heard = data) {
        // A dropped whisper only leaves you standing still for others.
        if (!canSend() || !whisper(event, data)) return;
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

    /** Tuned a radio, or switched it off: `{ id, songId, startedAt }`, or
     * `{ id, songId: null }`. A tune that comes quickly after the last
     * waits out RADIO_EVERY_MS, and the latest goes. `again` retells it to
     * someone arriving (tellRadio). */
    function radio(state, { again = false } = {}) {
        if (!enabled || !sceneId) return;
        radioMine = state.songId !== null;
        radioTuned = state.id;
        radioHeard = true;
        // A tune waiting to go stays one, whatever comes after it.
        if (!again) radioFresh = true;
        sendRadio(state, again && !radioFresh);
    }

    const sendRadio = throttle((state, again) => {
        radioFresh = false;
        if (!canWhisper()) return;
        const { id, songId, startedAt } = state;
        if (songId === null) {
            whisper("radio", { id, songId });
            return;
        }
        // How far in, as it goes: however long the throttle held it.
        const at = Math.max(0, Date.now() - startedAt);
        whisper(
            "radio",
            again ? { id, songId, at, again } : { id, songId, at }
        );
    }, RADIO_EVERY_MS);

    const canNote = () =>
        canWhisper() && sceneMembers.value.length <= NOTE_CROWD;

    /** Played an instrument: `{ id, which }`. The first goes at once; any
     * played in the next 1/NOTES_PER_SECOND s go together after it. None go
     * in a scene of more than NOTE_CROWD; a note that can't go is only heard
     * here. */
    function note({ id, which }) {
        if (!canNote()) return;
        const now = Date.now();
        if (notesWaiting.length === 0) notesSince = now;
        if (notesWaiting.length >= NOTE_BATCH) return;
        notesWaiting.push({ id, which, after: now - notesSince });
        sendNotes();
    }

    const sendNotes = throttle(() => {
        const notes = notesWaiting;
        notesWaiting = [];
        if (notes.length && canNote()) whisper("note", { notes });
    }, 1000 / NOTES_PER_SECOND);

    /** Whispers on the scene's channel; whether it went. */
    function whisper(event, data) {
        try {
            sceneChannel.whisper(event, data);
            return true;
        } catch (e) {
            console.warn("Couldn't whisper in the Games World:", e);
            return false;
        }
    }

    /** Someone has arrived: what's on the radio you tuned, if it's still
     * on. */
    function tellRadio() {
        if (!radioMine) return;
        const now = radioNow(radioTuned);
        if (now) radio({ id: radioTuned, ...now }, { again: true });
        else radioMine = false;
    }

    return {
        enabled,
        members,
        roster: rosterList,
        ready: rosterReady,
        others,
        join,
        leave,
        enterScene,
        leaveScene,
        move,
        radio,
        note,
    };
}
