import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    NOTE_BATCH,
    NOTE_CROWD,
    NOTES_PER_SECOND,
    useWorldPresence,
} from "./useWorldPresence.js";

// A stand-in for Echo's presence channels, one per name: each keeps its
// callbacks so a test can play members arriving, leaving and whispering. No
// Pusher connection is opened.
function fakeEcho() {
    const channels = {};
    return {
        channels,
        join: vi.fn((name) => {
            const handlers = { whispers: {} };
            const channel = {
                handlers,
                whisper: vi.fn(),
                listenForWhisper: (event, fn) => (
                    (handlers.whispers[event] = fn), channel
                ),
            };
            for (const on of ["here", "joining", "leaving", "error"]) {
                channel[on] = (fn) => ((handlers[on] = fn), channel);
            }
            channels[name] = channel;
            return channel;
        }),
        leave: vi.fn(),
    };
}

describe("useWorldPresence", () => {
    let echo;

    beforeEach(() => {
        vi.useFakeTimers();
        window.broadcastChannelPrefix = "testing";
        echo = fakeEcho();
        window.Echo = echo;
    });

    afterEach(() => {
        vi.useRealTimers();
        delete window.Echo;
        delete window.broadcastChannelPrefix;
    });

    it("joins the roster channel when enabled", () => {
        useWorldPresence({ enabled: true }).join();

        expect(echo.join).toHaveBeenCalledOnce();
        expect(echo.join).toHaveBeenCalledWith("testing.world");
    });

    it("joins nothing while the switch is off", () => {
        const presence = useWorldPresence({ enabled: false });
        presence.join();
        presence.leave();
        vi.runAllTimers();

        expect(echo.join).not.toHaveBeenCalled();
        expect(echo.leave).not.toHaveBeenCalled();
    });

    it("joins only once", () => {
        const presence = useWorldPresence({ enabled: true });
        presence.join();
        presence.join();

        expect(echo.join).toHaveBeenCalledOnce();
    });

    it("keeps the roster as people arrive and leave", () => {
        const { members, join } = useWorldPresence({ enabled: true });
        join();

        const { handlers } = echo.channels["testing.world"];
        handlers.here([{ id: 1, name: "Me" }]);
        handlers.joining({ id: 2, name: "Friend" });
        handlers.joining({ id: 2, name: "Friend" });
        expect(members.value).toEqual([
            { id: 1, name: "Me" },
            { id: 2, name: "Friend" },
        ]);

        handlers.leaving({ id: 2, name: "Friend" });
        expect(members.value).toEqual([{ id: 1, name: "Me" }]);
    });

    it("sees nobody when the roster refuses it", () => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
        const { members, join, leave } = useWorldPresence({ enabled: true });
        join();
        const { handlers } = echo.channels["testing.world"];
        handlers.here([{ id: 1, name: "Me" }]);

        handlers.error({ status: 403 });
        expect(members.value).toEqual([]);

        leave();
        expect(echo.leave).toHaveBeenCalledWith("testing.world");
    });

    it("leaves the roster and forgets it", () => {
        const { members, join, leave } = useWorldPresence({ enabled: true });
        join();
        echo.channels["testing.world"].handlers.here([{ id: 1, name: "Me" }]);

        leave();

        expect(echo.leave).toHaveBeenCalledWith("testing.world");
        expect(members.value).toEqual([]);
    });

    it("waits for Echo to arrive", () => {
        delete window.Echo;
        useWorldPresence({ enabled: true }).join();

        window.Echo = echo;
        vi.advanceTimersByTime(500);

        expect(echo.join).toHaveBeenCalledOnce();
    });

    it("gives up quietly when Echo never arrives", () => {
        delete window.Echo;
        const presence = useWorldPresence({ enabled: true });
        presence.join();
        vi.runAllTimers();

        window.Echo = echo;
        vi.runAllTimers();
        presence.leave();

        expect(echo.join).not.toHaveBeenCalled();
        expect(echo.leave).not.toHaveBeenCalled();
    });

    it("stops waiting for Echo once the world is left", () => {
        delete window.Echo;
        const presence = useWorldPresence({ enabled: true });
        presence.join();
        presence.leave();

        window.Echo = echo;
        vi.runAllTimers();

        expect(echo.join).not.toHaveBeenCalled();
    });
});

describe("useWorldPresence on the street", () => {
    const ME = { id: 1, name: "Me" };
    const FRIEND = { id: 2, name: "Friend" };
    const SCENE = "testing.world.road";
    const standing = { x: 300, z: 0, lane: 0, facing: 1, moving: 0 };
    let echo;
    let hidden;

    beforeEach(() => {
        vi.useFakeTimers();
        window.broadcastChannelPrefix = "testing";
        echo = fakeEcho();
        window.Echo = echo;
        hidden = false;
        vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        delete window.Echo;
        delete window.broadcastChannelPrefix;
    });

    /** In the world and on the road with `people` (you first), standing
     * at `standing`. */
    function onTheRoad(people = [ME, FRIEND], { enabled = true } = {}) {
        const presence = useWorldPresence({ enabled, me: ME.id });
        presence.enterScene("road");
        presence.join();
        presence.move(standing);
        const road = echo.channels[SCENE];
        road?.handlers.here(people);
        return { presence, road };
    }

    const moves = (road) =>
        road.whisper.mock.calls.filter(([event]) => event === "move");

    it("joins the scene's channel along with the roster", () => {
        onTheRoad();

        expect(echo.join.mock.calls.map(([name]) => name)).toEqual([
            "testing.world",
            SCENE,
        ]);
    });

    it("says where you are on arrival", () => {
        const { road } = onTheRoad();

        expect(road.whisper).toHaveBeenCalledOnce();
        expect(road.whisper).toHaveBeenCalledWith("place", {
            scene: "road",
            x: 300,
            z: 0,
            lane: 0,
        });
    });

    it("sends nothing while the switch is off", () => {
        const { presence } = onTheRoad([ME, FRIEND], { enabled: false });
        presence.move({ ...standing, x: 900, moving: 1 });
        vi.runAllTimers();

        expect(echo.join).not.toHaveBeenCalled();
    });

    it("sends nothing when Echo never arrives", () => {
        delete window.Echo;
        const presence = useWorldPresence({ enabled: true, me: ME.id });
        presence.enterScene("road");
        presence.join();
        presence.move({ ...standing, x: 900, moving: 1 });
        vi.runAllTimers();

        expect(echo.join).not.toHaveBeenCalled();
    });

    it("sends nothing while the tab is hidden", () => {
        const { presence, road } = onTheRoad();
        hidden = true;
        vi.advanceTimersByTime(3000);
        presence.move({ ...standing, x: 900, moving: 1 });
        vi.runAllTimers();

        expect(moves(road)).toEqual([]);
    });

    it("keeps a move under 80px or 2 seconds to itself", () => {
        const { presence, road } = onTheRoad();

        presence.move({ ...standing, x: 360, moving: 0 });
        vi.advanceTimersByTime(5000);
        expect(moves(road)).toEqual([]);

        // Far enough, but not two seconds since the last one: it waits
        // for them.
        presence.move({ ...standing, x: 900, moving: 1 });
        vi.advanceTimersByTime(1000);
        presence.move({ ...standing, x: 1000, moving: 1 });
        expect(moves(road)).toHaveLength(1);
        vi.advanceTimersByTime(999);
        expect(moves(road)).toHaveLength(1);
        vi.advanceTimersByTime(1);
        expect(moves(road)).toHaveLength(2);
    });

    it("sends a walk every 2 seconds, the latest place each time", () => {
        const { presence, road } = onTheRoad();
        vi.advanceTimersByTime(2000);

        presence.move({ ...standing, x: 400, moving: 1 });
        presence.move({ ...standing, x: 500, moving: 1 });
        vi.advanceTimersByTime(1000);
        presence.move({ ...standing, x: 700, moving: 1 });
        vi.advanceTimersByTime(1000);
        presence.move({ ...standing, x: 900, moving: 1 });
        expect(moves(road).map(([, data]) => data.x)).toEqual([400, 700]);

        vi.advanceTimersByTime(2000);
        expect(moves(road).map(([, data]) => data.x)).toEqual([400, 700, 900]);
    });

    it("sends a stop once, at once", () => {
        const { presence, road } = onTheRoad();
        vi.advanceTimersByTime(2000);
        presence.move({ ...standing, x: 400, moving: 1 });

        presence.move({ ...standing, x: 450, moving: 0 });
        presence.move({ ...standing, x: 450, moving: 0 });
        vi.runAllTimers();

        expect(moves(road).map(([, data]) => data)).toEqual([
            { ...standing, x: 400, moving: 1 },
            { ...standing, x: 450, moving: 0 },
        ]);
    });

    it("sends no movement once the scene has 8 people in it", () => {
        const crowd = Array.from({ length: 8 }, (_, i) => ({
            id: i + 1,
            name: `Person ${i + 1}`,
        }));
        const { presence, road } = onTheRoad(crowd.slice(0, 7));
        vi.advanceTimersByTime(2000);

        road.handlers.joining(crowd[7]);
        road.whisper.mockClear();
        presence.move({ ...standing, x: 900, moving: 1 });
        vi.runAllTimers();

        expect(road.whisper).not.toHaveBeenCalled();
    });

    it("says nothing alone, and tells someone who arrives where you are", () => {
        const { presence, road } = onTheRoad([ME]);
        vi.advanceTimersByTime(2000);
        presence.move({ ...standing, x: 900, moving: 1 });
        vi.runAllTimers();
        expect(road.whisper).not.toHaveBeenCalled();
        presence.move(standing);

        road.handlers.joining(FRIEND);

        expect(road.whisper).toHaveBeenCalledWith("move", standing);
    });

    it("draws the others where they say they are", () => {
        const { presence, road } = onTheRoad();

        road.handlers.whispers.place(
            { scene: "road", x: 800, z: 0, lane: 1 },
            { user_id: "2" }
        );
        expect(presence.others.value).toEqual([
            {
                id: 2,
                name: "Friend",
                x: 800,
                z: 0,
                lane: 1,
                facing: 1,
                moving: 0,
            },
        ]);

        road.handlers.whispers.move(
            { x: 1000, z: 0, lane: 0, facing: -1, moving: 1, name: "<b>" },
            { user_id: 2 }
        );
        expect(presence.others.value).toEqual([
            {
                id: 2,
                name: "Friend",
                x: 1000,
                z: 0,
                lane: 0,
                facing: -1,
                moving: 1,
            },
        ]);
    });

    it("drops what isn't a position, or isn't from someone in the scene", () => {
        const { presence, road } = onTheRoad();
        const { place, move } = road.handlers.whispers;
        const friend = { user_id: 2 };

        place({ scene: "house.hall", x: 800, z: 0, lane: 0 }, friend);
        place({ scene: "road", x: "800", z: 0, lane: 0 }, friend);
        move({ x: 800, z: 0, lane: 2, facing: 1, moving: 0 }, friend);
        move({ x: 800.5, z: 0, lane: 0, facing: 1, moving: 0 }, friend);
        move({ x: 1e9, z: 0, lane: 0, facing: 1, moving: 0 }, friend);
        move({ x: 800, z: 0, lane: 0, facing: 0, moving: 0 }, friend);
        move({ x: 800, z: 0, lane: 0, facing: 1, moving: true }, friend);
        move(null, friend);
        move("move", friend);
        move({ ...standing }, { user_id: 99 });
        move({ ...standing }, {});

        expect(presence.others.value).toEqual([]);
    });

    it("draws nobody in a crowd, and everyone says where they are once there's room", () => {
        const people = Array.from({ length: 8 }, (_, i) => ({
            id: i + 1,
            name: `Person ${i + 1}`,
        }));
        const { presence, road } = onTheRoad(people.slice(0, 7));
        road.handlers.whispers.move(standing, { user_id: 2 });
        expect(presence.others.value).toHaveLength(1);

        road.handlers.joining(people[7]);
        expect(presence.others.value).toEqual([]);

        road.whisper.mockClear();
        road.handlers.leaving(people[7]);
        expect(road.whisper).toHaveBeenCalledWith("move", standing);
        expect(presence.others.value).toHaveLength(1);
    });

    it("tells others your facing after a place, which leaves it out", () => {
        const presence = useWorldPresence({ enabled: true, me: ME.id });
        presence.enterScene("road");
        presence.join();
        presence.move({ ...standing, facing: -1 });
        const road = echo.channels[SCENE];
        road.handlers.here([ME, FRIEND]);
        presence.move({ ...standing, facing: -1 });

        vi.advanceTimersByTime(2000);

        expect(moves(road).map(([, data]) => data)).toEqual([
            { ...standing, facing: -1 },
        ]);
    });

    it("says where a short walk ended", () => {
        const { presence, road } = onTheRoad();
        vi.advanceTimersByTime(500);

        presence.move({ ...standing, x: 330, moving: 1 });
        presence.move({ ...standing, x: 360, moving: 0 });
        vi.advanceTimersByTime(2000);

        expect(moves(road).map(([, data]) => data)).toEqual([
            { ...standing, x: 360 },
        ]);
    });

    it("stops someone walking it hasn't heard from in a while", () => {
        const { presence, road } = onTheRoad();
        road.handlers.whispers.move({ ...standing, moving: 1 }, { user_id: 2 });

        vi.advanceTimersByTime(5000);

        expect(presence.others.value[0].moving).toBe(0);
    });

    it("forgets someone who leaves, and everyone when you do", () => {
        const { presence, road } = onTheRoad([
            ME,
            FRIEND,
            { id: 3, name: "C" },
        ]);
        road.handlers.whispers.move(standing, { user_id: 2 });
        road.handlers.whispers.move(standing, { user_id: 3 });

        road.handlers.leaving(FRIEND);
        expect(presence.others.value.map((o) => o.id)).toEqual([3]);

        presence.leaveScene();
        expect(presence.others.value).toEqual([]);
        expect(echo.leave).toHaveBeenCalledWith(SCENE);
    });

    it("moves to the new scene's channel", () => {
        const { presence } = onTheRoad();

        presence.enterScene("house.hall");

        expect(echo.leave).toHaveBeenCalledWith(SCENE);
        expect(echo.join).toHaveBeenLastCalledWith("testing.world.house.hall");
    });
});

describe("useWorldPresence on the roster", () => {
    const ME = { id: 1, name: "Me" };
    const FRIEND = { id: 2, name: "Friend" };
    const SCENES = ["road", "house.hall"];
    const standing = { x: 300, z: 0, lane: 0, facing: 1, moving: 0 };
    let echo;

    beforeEach(() => {
        vi.useFakeTimers();
        window.broadcastChannelPrefix = "testing";
        echo = fakeEcho();
        window.Echo = echo;
    });

    afterEach(() => {
        vi.useRealTimers();
        delete window.Echo;
        delete window.broadcastChannelPrefix;
    });

    /** In the world with `people`, on the road at `standing`. */
    function inTheWorld(people = [ME, FRIEND]) {
        const presence = useWorldPresence({
            enabled: true,
            me: ME.id,
            scenes: SCENES,
        });
        presence.enterScene("road");
        presence.join();
        presence.move(standing);
        const roster = echo.channels["testing.world"];
        roster.handlers.here(people);
        return { presence, roster };
    }

    const places = (roster) =>
        roster.whisper.mock.calls.filter(([event]) => event === "place");

    it("tells the roster which scene you're in, once", () => {
        const { presence, roster } = inTheWorld();
        presence.move({ ...standing, x: 900, moving: 1 });

        expect(places(roster)).toEqual([["place", { scene: "road" }]]);
    });

    it("tells it again in a new scene, straight away", () => {
        const { presence, roster } = inTheWorld();

        presence.enterScene("house.hall");

        expect(places(roster)[1]).toEqual(["place", { scene: "house.hall" }]);
    });

    it("tells the roster once the tab is back, if it was hidden", () => {
        let hidden = true;
        vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
        const { roster } = inTheWorld();
        expect(places(roster)).toEqual([]);

        hidden = false;
        document.dispatchEvent(new Event("visibilitychange"));

        expect(places(roster)).toEqual([["place", { scene: "road" }]]);
        vi.restoreAllMocks();
    });

    it("tells nobody alone, and tells whoever joins", () => {
        const { roster } = inTheWorld([ME]);
        expect(roster.whisper).not.toHaveBeenCalled();

        roster.handlers.joining(FRIEND);

        expect(places(roster)).toHaveLength(1);
    });

    it("keeps everyone else's scene, and forgets theirs when they go", () => {
        const { presence, roster } = inTheWorld();
        expect(presence.roster.value).toEqual([
            { id: 2, name: "Friend", scene: null },
        ]);

        roster.handlers.whispers.place(
            { scene: "house.hall" },
            { user_id: "2" }
        );
        expect(presence.roster.value).toEqual([
            { id: 2, name: "Friend", scene: "house.hall" },
        ]);

        roster.handlers.leaving(FRIEND);
        roster.handlers.joining(FRIEND);
        expect(presence.roster.value[0].scene).toBeNull();
    });

    it("drops a place for an unknown scene, or from a stranger", () => {
        const { presence, roster } = inTheWorld();
        const { place } = roster.handlers.whispers;

        place({ scene: "house.attic" }, { user_id: 2 });
        place({ scene: "constructor" }, { user_id: 2 });
        place({ scene: ["road"] }, { user_id: 2 });
        place(null, { user_id: 2 });
        place({ scene: "road" }, { user_id: 99 });
        place({ scene: "road" }, { user_id: 1 });

        expect(presence.roster.value).toEqual([
            { id: 2, name: "Friend", scene: null },
        ]);
    });
});

describe("useWorldPresence's radio", () => {
    const ME = { id: 1, name: "Me" };
    const FRIEND = { id: 2, name: "Friend" };
    const SCENE = "testing.world.house.den";
    const NOW = 1000000;
    let echo;
    let hidden;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
        window.broadcastChannelPrefix = "testing";
        echo = fakeEcho();
        window.Echo = echo;
        hidden = false;
        vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        delete window.Echo;
        delete window.broadcastChannelPrefix;
    });

    /** In the den with `people` (you first). */
    function inTheDen(people = [ME, FRIEND], options = {}) {
        const hearRadio = vi.fn();
        const presence = useWorldPresence({
            enabled: true,
            me: ME.id,
            hearRadio,
            ...options,
        });
        presence.enterScene("house.den");
        presence.join();
        const den = echo.channels[SCENE];
        den.handlers.here(people);
        return { presence, den, hearRadio };
    }

    const radios = (den) =>
        den.whisper.mock.calls
            .filter(([event]) => event === "radio")
            .map(([, data]) => data);

    it("tells the room a tune as how far into the song it is", () => {
        const { presence, den } = inTheDen();

        presence.radio({ id: "radio", songId: 7, startedAt: NOW - 2000 });

        expect(radios(den)).toEqual([{ id: "radio", songId: 7, at: 2000 }]);
    });

    it("tells it the radio is off", () => {
        const { presence, den } = inTheDen();

        presence.radio({ id: "radio", songId: null });

        expect(radios(den)).toEqual([{ id: "radio", songId: null }]);
    });

    it("sends a quick run of tunes once a second, the last one winning", () => {
        const { presence, den } = inTheDen();

        presence.radio({ id: "radio", songId: 7, startedAt: NOW });
        presence.radio({ id: "radio", songId: 8, startedAt: NOW });
        presence.radio({ id: "radio", songId: null });
        expect(radios(den)).toHaveLength(1);

        vi.advanceTimersByTime(1000);
        expect(radios(den)).toEqual([
            { id: "radio", songId: 7, at: 0 },
            { id: "radio", songId: null },
        ]);
    });

    it("says how far in a held-back tune is when it goes", () => {
        const { presence, den } = inTheDen();

        presence.radio({ id: "radio", songId: 7, startedAt: NOW });
        presence.radio({ id: "radio", songId: 8, startedAt: NOW });
        vi.advanceTimersByTime(1000);

        expect(radios(den).at(-1)).toEqual({
            id: "radio",
            songId: 8,
            at: 1000,
        });
    });

    it("sends nothing alone", () => {
        const { presence, den } = inTheDen([ME]);

        presence.radio({ id: "radio", songId: 7, startedAt: NOW });

        expect(radios(den)).toEqual([]);
    });

    it("sends nothing while the tab is hidden", () => {
        const { presence, den } = inTheDen();
        hidden = true;

        presence.radio({ id: "radio", songId: 7, startedAt: NOW });

        expect(radios(den)).toEqual([]);
    });

    it("sends nothing while the switch is off", () => {
        const presence = useWorldPresence({ enabled: false });
        presence.enterScene("house.den");
        presence.join();

        presence.radio({ id: "radio", songId: 7, startedAt: NOW });
        vi.runAllTimers();

        expect(echo.join).not.toHaveBeenCalled();
    });

    it("hears someone else's tune in this browser's clock", () => {
        const { den, hearRadio } = inTheDen();

        den.handlers.whispers.radio(
            { id: "radio", songId: 7, at: 2000 },
            { user_id: 2 }
        );
        den.handlers.whispers.radio(
            { id: "radio", songId: null },
            { user_id: 2 }
        );

        expect(hearRadio.mock.calls).toEqual([
            [{ id: "radio", songId: 7, startedAt: NOW - 2000 }],
            [{ id: "radio", songId: null }],
        ]);
    });

    it("drops a radio that isn't one, or isn't from someone in the room", () => {
        const { den, hearRadio } = inTheDen();
        const { radio } = den.handlers.whispers;

        radio({ id: "radio", songId: 7, at: 0 }, { user_id: 99 });
        radio({ id: "radio", songId: 7, at: 0 }, { user_id: 1 });
        radio({ id: "<b>", songId: 7, at: 0 }, { user_id: 2 });
        radio({ id: "radio", songId: "7", at: 0 }, { user_id: 2 });
        radio({ id: "radio", songId: 0, at: 0 }, { user_id: 2 });
        radio({ id: "radio", songId: 7 }, { user_id: 2 });
        radio({ id: "radio", songId: 7, at: -1 }, { user_id: 2 });
        radio({ id: "radio", songId: 7, at: 1.5 }, { user_id: 2 });
        radio({ id: "radio", songId: 7, at: 7 * 3600000 }, { user_id: 2 });
        radio({ id: "radio", songId: 7, at: 0, again: 1 }, { user_id: 2 });
        radio(null, { user_id: 2 });

        expect(hearRadio).not.toHaveBeenCalled();
    });

    it("tells someone who arrives what's on the radio you tuned, as a retelling", () => {
        const radioNow = vi.fn(() => ({ songId: 8, startedAt: NOW - 30000 }));
        const { presence, den } = inTheDen([ME, FRIEND], { radioNow });
        presence.radio({ id: "radio", songId: 7, startedAt: NOW });
        vi.advanceTimersByTime(1000);

        den.handlers.joining({ id: 3, name: "Late" });

        expect(radioNow).toHaveBeenCalledWith("radio");
        expect(radios(den).at(-1)).toEqual({
            id: "radio",
            songId: 8,
            at: 31000,
            again: true,
        });
    });

    it("keeps a tune waiting to go a tune when someone arrives", () => {
        const radioNow = vi.fn(() => ({ songId: 8, startedAt: NOW }));
        const { presence, den } = inTheDen([ME, FRIEND], { radioNow });
        presence.radio({ id: "radio", songId: 7, startedAt: NOW });
        presence.radio({ id: "radio", songId: 8, startedAt: NOW });

        den.handlers.joining({ id: 3, name: "Late" });
        vi.advanceTimersByTime(1000);

        expect(radios(den).at(-1)).not.toHaveProperty("again");
    });

    it("takes a retelling only before hearing the radio here", () => {
        const { den, hearRadio } = inTheDen();
        const { radio } = den.handlers.whispers;

        radio({ id: "radio", songId: 7, at: 0, again: true }, { user_id: 2 });
        expect(hearRadio).toHaveBeenCalledOnce();

        radio({ id: "radio", songId: 8, at: 0, again: true }, { user_id: 2 });
        expect(hearRadio).toHaveBeenCalledOnce();

        radio({ id: "radio", songId: null }, { user_id: 2 });
        expect(hearRadio).toHaveBeenCalledTimes(2);
    });

    it("takes no retelling after tuning, until in another scene", () => {
        const { presence, den, hearRadio } = inTheDen();
        presence.radio({ id: "radio", songId: 7, startedAt: NOW });

        den.handlers.whispers.radio(
            { id: "radio", songId: 8, at: 0, again: true },
            { user_id: 2 }
        );
        expect(hearRadio).not.toHaveBeenCalled();

        presence.leaveScene();
        presence.enterScene("house.den");
        const again = echo.channels[SCENE];
        again.handlers.here([ME, FRIEND]);
        again.handlers.whispers.radio(
            { id: "radio", songId: 8, at: 0, again: true },
            { user_id: 2 }
        );
        expect(hearRadio).toHaveBeenCalledOnce();
    });

    it("leaves telling newcomers to whoever tuned it last, and only while it's on", () => {
        const radioNow = vi.fn(() => null);
        const { presence, den } = inTheDen([ME, FRIEND], { radioNow });
        presence.radio({ id: "radio", songId: 7, startedAt: NOW });
        den.handlers.whispers.radio(
            { id: "radio", songId: 8, at: 0 },
            { user_id: 2 }
        );
        vi.advanceTimersByTime(1000);
        den.handlers.joining({ id: 3, name: "Late" });
        expect(radioNow).not.toHaveBeenCalled();

        presence.radio({ id: "radio", songId: 9, startedAt: NOW });
        vi.advanceTimersByTime(1000);
        den.handlers.joining({ id: 4, name: "Later" });
        expect(radioNow).toHaveBeenCalledOnce();
        expect(radios(den)).toHaveLength(2);
    });
});

describe("useWorldPresence's notes", () => {
    const ME = { id: 1, name: "Me" };
    const FRIEND = { id: 2, name: "Friend" };
    const SCENE = "testing.world.cockroach.music";
    const DRUM = { id: "bass-drum", which: [0] };
    const NOW = 1000000;
    let echo;
    let hidden;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
        window.broadcastChannelPrefix = "testing";
        echo = fakeEcho();
        window.Echo = echo;
        hidden = false;
        vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        delete window.Echo;
        delete window.broadcastChannelPrefix;
    });

    /** In the music room with `people` (you first). */
    function inTheMusicRoom(people = [ME, FRIEND], options = {}) {
        const hearNote = vi.fn();
        const presence = useWorldPresence({
            enabled: true,
            me: ME.id,
            hearNote,
            ...options,
        });
        presence.enterScene("cockroach.music");
        presence.join();
        const room = echo.channels[SCENE];
        room.handlers.here(people);
        return { presence, room, hearNote };
    }

    const whispers = (room) =>
        room.whisper.mock.calls
            .filter(([event]) => event === "note")
            .map(([, data]) => data.notes);

    const people = (n) =>
        Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `P${i}` }));

    it("tells the room the first note at once", () => {
        const { presence, room } = inTheMusicRoom();

        presence.note({ id: "organ", which: [1, 2] });

        expect(whispers(room)).toEqual([
            [{ id: "organ", which: [1, 2], after: 0 }],
        ]);
    });

    it("sends the notes that follow together, as far apart as they came", () => {
        const { presence, room } = inTheMusicRoom();
        const strum = (n) => presence.note({ id: "harp", which: [n] });

        strum(0);
        vi.advanceTimersByTime(50);
        strum(1);
        vi.advanceTimersByTime(50);
        strum(2);
        expect(whispers(room)).toHaveLength(1);

        vi.advanceTimersByTime(1000 / NOTES_PER_SECOND);
        expect(whispers(room)).toEqual([
            [{ id: "harp", which: [0], after: 0 }],
            [
                { id: "harp", which: [1], after: 0 },
                { id: "harp", which: [2], after: 50 },
            ],
        ]);
    });

    it("whispers no more than twice a second, however fast it's played", () => {
        const { presence, room } = inTheMusicRoom();

        for (let i = 0; i < 100; i += 1) {
            presence.note(DRUM);
            vi.advanceTimersByTime(20);
        }

        expect(whispers(room)).toHaveLength(2 * NOTES_PER_SECOND + 1);
        expect(
            whispers(room).every((notes) => notes.length <= NOTE_BATCH)
        ).toBe(true);
    });

    it("forgets notes waiting to go when it leaves the room", () => {
        const { presence, room } = inTheMusicRoom();
        presence.note(DRUM);
        presence.note(DRUM);

        presence.enterScene("house.hall");
        vi.runAllTimers();

        expect(whispers(room)).toHaveLength(1);
    });

    it("sends no notes once the room has more than six people", () => {
        const full = inTheMusicRoom(people(NOTE_CROWD));
        full.presence.note(DRUM);
        expect(whispers(full.room)).toHaveLength(1);

        full.room.handlers.joining({ id: 99, name: "One more" });
        vi.advanceTimersByTime(1000);
        full.presence.note(DRUM);
        vi.runAllTimers();
        expect(whispers(full.room)).toHaveLength(1);
    });

    it("sends nothing alone, hidden, or with the switch off", () => {
        const alone = inTheMusicRoom([ME]);
        alone.presence.note(DRUM);
        expect(whispers(alone.room)).toEqual([]);

        const { presence, room } = inTheMusicRoom();
        hidden = true;
        presence.note(DRUM);
        expect(whispers(room)).toEqual([]);

        const off = useWorldPresence({ enabled: false });
        off.enterScene("cockroach.music");
        off.join();
        off.note(DRUM);
        expect(echo.join).toHaveBeenCalledTimes(4);
    });

    it("hears someone else's notes as far apart as they were played", () => {
        const { room, hearNote } = inTheMusicRoom();

        room.handlers.whispers.note(
            {
                notes: [
                    { id: "harp", which: [0, 1], after: 0 },
                    { id: "harp", which: [2], after: 50 },
                ],
            },
            { user_id: 2 }
        );
        expect(hearNote.mock.calls).toEqual([[{ id: "harp", which: [0, 1] }]]);

        vi.advanceTimersByTime(50);
        expect(hearNote).toHaveBeenLastCalledWith({ id: "harp", which: [2] });
    });

    it("hears nothing more from the room it left, or while hidden", () => {
        const { presence, room, hearNote } = inTheMusicRoom();
        const { note } = room.handlers.whispers;

        note({ notes: [{ ...DRUM, after: 100 }] }, { user_id: 2 });
        presence.enterScene("house.hall");
        vi.runAllTimers();
        expect(hearNote).not.toHaveBeenCalled();

        const again = inTheMusicRoom();
        hidden = true;
        again.room.handlers.whispers.note(
            { notes: [{ ...DRUM, after: 0 }] },
            { user_id: 2 }
        );
        expect(again.hearNote).not.toHaveBeenCalled();
    });

    it("drops notes that aren't, or aren't from someone in the room", () => {
        const { room, hearNote } = inTheMusicRoom();
        const { note } = room.handlers.whispers;
        const one = (n) => ({ notes: [{ ...DRUM, after: 0, ...n }] });

        note(one(), { user_id: 99 });
        note(one(), { user_id: 1 });
        note(one({ id: "<b>" }), { user_id: 2 });
        note(one({ which: 0 }), { user_id: 2 });
        note(one({ which: [0.5] }), { user_id: 2 });
        note(one({ which: [-1] }), { user_id: 2 });
        note(one({ which: Array(17).fill(0) }), { user_id: 2 });
        note(one({ after: -1 }), { user_id: 2 });
        note(one({ after: 1001 }), { user_id: 2 });
        note(one({ after: "0" }), { user_id: 2 });
        note({ notes: [] }, { user_id: 2 });
        note(
            { notes: Array(NOTE_BATCH + 1).fill({ ...DRUM, after: 0 }) },
            { user_id: 2 }
        );
        note({ notes: [{ ...DRUM, after: 0 }, null] }, { user_id: 2 });
        note(DRUM, { user_id: 2 });
        note(null, { user_id: 2 });
        vi.runAllTimers();

        expect(hearNote).not.toHaveBeenCalled();
    });
});
