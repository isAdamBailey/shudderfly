import { onNotificationRefresh } from "@/utils/notificationRefresh";
import {
    installServiceWorkerMock,
    setDocumentVisibility,
} from "@/vitest.setup";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let serviceWorker;
let unsubscribes;

const subscribe = (callback) => {
    const unsubscribe = onNotificationRefresh(callback);
    unsubscribes.push(unsubscribe);
    return unsubscribe;
};

beforeEach(() => {
    unsubscribes = [];
    serviceWorker = installServiceWorkerMock();
});

afterEach(() => {
    unsubscribes.forEach((unsubscribe) => unsubscribe());
    serviceWorker.uninstall();
});

describe("notificationRefresh", () => {
    it.each([
        ["push-notification", "push"],
        ["notification-click", "click"],
    ])("reports %s as %s", (message, reason) => {
        const subscriber = vi.fn();
        subscribe(subscriber);

        serviceWorker.dispatch(message);

        expect(subscriber).toHaveBeenCalledWith(reason);
    });

    it("reports the page becoming visible again", () => {
        const subscriber = vi.fn();
        subscribe(subscriber);

        setDocumentVisibility("visible");

        expect(subscriber).toHaveBeenCalledWith("visible");
    });

    it("stays quiet while the page is hidden", () => {
        const subscriber = vi.fn();
        subscribe(subscriber);

        setDocumentVisibility("hidden");

        expect(subscriber).not.toHaveBeenCalled();
    });

    it("ignores service worker messages it does not own", () => {
        const subscriber = vi.fn();
        subscribe(subscriber);

        serviceWorker.dispatch("workbox-broadcast-update");

        expect(subscriber).not.toHaveBeenCalled();
    });

    it("attaches one service worker listener however many subscribers there are", () => {
        subscribe(vi.fn());
        subscribe(vi.fn());

        expect(serviceWorker.listenerCount()).toBe(1);
    });

    it("detaches its listeners once the last subscriber leaves", () => {
        const first = subscribe(vi.fn());
        const second = subscribe(vi.fn());

        first();
        expect(serviceWorker.listenerCount()).toBe(1);

        second();
        expect(serviceWorker.listenerCount()).toBe(0);
    });

    it("stops calling a subscriber once it unsubscribes", () => {
        const subscriber = vi.fn();
        const unsubscribe = subscribe(subscriber);

        unsubscribe();
        serviceWorker.dispatch("push-notification");

        expect(subscriber).not.toHaveBeenCalled();
    });

    it("keeps delivering when one subscriber throws", () => {
        const consoleError = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});
        const healthy = vi.fn();

        subscribe(() => {
            throw new Error("boom");
        });
        subscribe(healthy);

        serviceWorker.dispatch("push-notification");

        expect(healthy).toHaveBeenCalled();
        consoleError.mockRestore();
    });

    it("works in a browser without service worker support", () => {
        serviceWorker.uninstall();
        const subscriber = vi.fn();

        expect(() => subscribe(subscriber)).not.toThrow();

        setDocumentVisibility("visible");
        expect(subscriber).toHaveBeenCalledWith("visible");
    });
});
