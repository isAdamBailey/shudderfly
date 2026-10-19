import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWorldPresence } from "./useWorldPresence.js";

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
