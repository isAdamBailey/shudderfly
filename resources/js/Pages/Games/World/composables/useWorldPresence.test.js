import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWorldPresence } from "./useWorldPresence.js";

// A stand-in for Echo's presence channel: it keeps the callbacks so a test
// can play members arriving and leaving. No Pusher connection is opened.
function fakeEcho() {
    const handlers = {};
    const channel = {
        here: (fn) => ((handlers.here = fn), channel),
        joining: (fn) => ((handlers.joining = fn), channel),
        leaving: (fn) => ((handlers.leaving = fn), channel),
        error: (fn) => ((handlers.error = fn), channel),
    };
    return {
        handlers,
        join: vi.fn(() => channel),
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

        echo.handlers.here([{ id: 1, name: "Me" }]);
        echo.handlers.joining({ id: 2, name: "Friend" });
        echo.handlers.joining({ id: 2, name: "Friend" });
        expect(members.value).toEqual([
            { id: 1, name: "Me" },
            { id: 2, name: "Friend" },
        ]);

        echo.handlers.leaving({ id: 2, name: "Friend" });
        expect(members.value).toEqual([{ id: 1, name: "Me" }]);
    });

    it("sees nobody when the roster refuses it", () => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
        const { members, join, leave } = useWorldPresence({ enabled: true });
        join();
        echo.handlers.here([{ id: 1, name: "Me" }]);

        echo.handlers.error({ status: 403 });
        expect(members.value).toEqual([]);

        leave();
        expect(echo.leave).toHaveBeenCalledWith("testing.world");
    });

    it("leaves the roster and forgets it", () => {
        const { members, join, leave } = useWorldPresence({ enabled: true });
        join();
        echo.handlers.here([{ id: 1, name: "Me" }]);

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
