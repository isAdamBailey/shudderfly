import {
    onPushNotification,
    resetPushNotificationBridge,
} from "@/utils/pushNotificationBridge";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let listeners;

const dispatchServiceWorkerMessage = (data) => {
    listeners.forEach((listener) => listener({ data }));
};

beforeEach(() => {
    listeners = [];

    Object.defineProperty(navigator, "serviceWorker", {
        configurable: true,
        value: {
            addEventListener: vi.fn((type, handler) => {
                if (type === "message") listeners.push(handler);
            }),
            removeEventListener: vi.fn((type, handler) => {
                listeners = listeners.filter((entry) => entry !== handler);
            }),
        },
    });
});

afterEach(() => {
    resetPushNotificationBridge();
    delete navigator.serviceWorker;
});

describe("pushNotificationBridge", () => {
    it("passes push messages from the service worker to subscribers", () => {
        const subscriber = vi.fn();
        onPushNotification(subscriber);

        dispatchServiceWorkerMessage({
            type: "push-notification",
            notification: { title: "Bob replied" },
        });

        expect(subscriber).toHaveBeenCalledWith({
            type: "push-notification",
            notification: { title: "Bob replied" },
        });
    });

    it("passes notification clicks through too", () => {
        const subscriber = vi.fn();
        onPushNotification(subscriber);

        dispatchServiceWorkerMessage({ type: "notification-click" });

        expect(subscriber).toHaveBeenCalledWith({
            type: "notification-click",
        });
    });

    it("ignores service worker messages it does not own", () => {
        const subscriber = vi.fn();
        onPushNotification(subscriber);

        dispatchServiceWorkerMessage({ type: "workbox-broadcast-update" });
        dispatchServiceWorkerMessage(undefined);

        expect(subscriber).not.toHaveBeenCalled();
    });

    it("attaches a single service worker listener for many subscribers", () => {
        onPushNotification(vi.fn());
        onPushNotification(vi.fn());

        expect(navigator.serviceWorker.addEventListener).toHaveBeenCalledTimes(
            1
        );
    });

    it("stops calling a subscriber once it unsubscribes", () => {
        const subscriber = vi.fn();
        const unsubscribe = onPushNotification(subscriber);

        unsubscribe();
        dispatchServiceWorkerMessage({ type: "push-notification" });

        expect(subscriber).not.toHaveBeenCalled();
    });

    it("keeps delivering when one subscriber throws", () => {
        const failing = vi.fn(() => {
            throw new Error("boom");
        });
        const healthy = vi.fn();
        const consoleError = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});

        onPushNotification(failing);
        onPushNotification(healthy);

        dispatchServiceWorkerMessage({ type: "push-notification" });

        expect(healthy).toHaveBeenCalled();
        consoleError.mockRestore();
    });

    it("does nothing in a browser without service worker support", () => {
        delete navigator.serviceWorker;

        expect(() => onPushNotification(vi.fn())).not.toThrow();
    });
});
