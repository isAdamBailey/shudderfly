import { usePushNotificationRefresh } from "@/composables/usePushNotificationRefresh";
import { resetPushNotificationBridge } from "@/utils/pushNotificationBridge";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let listeners;

const dispatchServiceWorkerMessage = (data) => {
    listeners.forEach((listener) => listener({ data }));
};

const setVisibility = (state) => {
    Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => state,
    });
    document.dispatchEvent(new Event("visibilitychange"));
};

const mountWith = (callback, options) =>
    mount({
        template: "<div />",
        setup() {
            usePushNotificationRefresh(callback, options);
        },
    });

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

describe("usePushNotificationRefresh", () => {
    it("runs the callback when a push notification arrives", () => {
        const callback = vi.fn();
        mountWith(callback);

        dispatchServiceWorkerMessage({
            type: "push-notification",
            notification: { title: "Bob reacted" },
        });

        expect(callback).toHaveBeenCalledWith({
            type: "push-notification",
            notification: { title: "Bob reacted" },
        });
    });

    it("runs the callback when the page becomes visible again", () => {
        const callback = vi.fn();
        mountWith(callback);

        setVisibility("visible");

        expect(callback).toHaveBeenCalledWith({ type: "page-visible" });
    });

    it("does not run the callback when the page is hidden", () => {
        const callback = vi.fn();
        mountWith(callback);

        setVisibility("hidden");

        expect(callback).not.toHaveBeenCalled();
    });

    it("can opt out of the visibility trigger", () => {
        const callback = vi.fn();
        mountWith(callback, { refreshOnVisible: false });

        setVisibility("visible");

        expect(callback).not.toHaveBeenCalled();
    });

    it("stops listening once the component unmounts", () => {
        const callback = vi.fn();
        const wrapper = mountWith(callback);

        wrapper.unmount();

        dispatchServiceWorkerMessage({ type: "push-notification" });
        setVisibility("visible");

        expect(callback).not.toHaveBeenCalled();
    });
});
