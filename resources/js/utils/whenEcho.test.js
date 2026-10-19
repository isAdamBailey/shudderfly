import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { whenEcho } from "./whenEcho";

describe("whenEcho", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        delete window.Echo;
    });

    afterEach(() => {
        vi.useRealTimers();
        delete window.Echo;
    });

    it("calls at once when Echo is there", () => {
        window.Echo = { id: 1 };
        const fn = vi.fn();
        expect(whenEcho(fn)).toBeNull();
        expect(fn).toHaveBeenCalledWith(window.Echo);
    });

    it("waits for Echo to arrive", () => {
        const fn = vi.fn();
        whenEcho(fn, { every: 100 });
        vi.advanceTimersByTime(250);
        expect(fn).not.toHaveBeenCalled();
        window.Echo = {};
        vi.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it("gives up after its attempts", () => {
        const fn = vi.fn();
        whenEcho(fn, { attempts: 2, every: 100 });
        vi.advanceTimersByTime(250);
        window.Echo = {};
        vi.advanceTimersByTime(1000);
        expect(fn).not.toHaveBeenCalled();
    });

    it("stops looking once cancelled", () => {
        const fn = vi.fn();
        const cancel = whenEcho(fn, { every: 100 });
        cancel();
        window.Echo = {};
        vi.advanceTimersByTime(1000);
        expect(fn).not.toHaveBeenCalled();
    });
});
