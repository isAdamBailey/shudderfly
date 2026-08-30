import { useUnreadNotifications } from "@/composables/useUnreadNotifications";
import { resetPushNotificationBridge } from "@/utils/pushNotificationBridge";
import { router } from "@inertiajs/vue3";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reactive } from "vue";

// Reactive because the composable watches these props: a partial reload is how
// the refreshed count reaches it.
const mockPage = {
    props: reactive({
        auth: { user: { id: 1, name: "Test User" } },
        unread_notifications_count: 0,
    }),
};

vi.mock("@inertiajs/vue3", () => ({
    usePage: () => mockPage,
    router: { reload: vi.fn() },
}));

let listeners;

const dispatchServiceWorkerMessage = (data) => {
    listeners.forEach((listener) => listener({ data }));
};

const mountComposable = () => {
    const state = {};
    const wrapper = mount({
        template: "<div />",
        setup() {
            Object.assign(state, useUnreadNotifications());
        },
    });

    return { wrapper, state };
};

beforeEach(() => {
    vi.useFakeTimers();
    listeners = [];
    mockPage.props.unread_notifications_count = 0;
    router.reload.mockClear();

    window.Echo = {
        private: vi.fn(() => ({ notification: vi.fn() })),
        leave: vi.fn(),
    };

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
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    resetPushNotificationBridge();
    delete navigator.serviceWorker;
    delete window.Echo;
});

describe("useUnreadNotifications", () => {
    it("re-reads the unread count from the server when a push arrives", () => {
        mountComposable();

        dispatchServiceWorkerMessage({ type: "push-notification" });
        vi.runOnlyPendingTimers();

        expect(router.reload).toHaveBeenCalledWith({
            only: ["unread_notifications_count"],
        });
    });

    it("flags a new notification so the bell dot animates", () => {
        const { state } = mountComposable();

        expect(state.isNewNotification.value).toBe(false);

        dispatchServiceWorkerMessage({ type: "push-notification" });

        expect(state.isNewNotification.value).toBe(true);
    });

    it("shows the unread dot once the refreshed count arrives", async () => {
        const { wrapper, state } = mountComposable();

        dispatchServiceWorkerMessage({ type: "push-notification" });
        mockPage.props.unread_notifications_count = 3;
        await wrapper.vm.$nextTick();

        expect(state.unreadCount.value).toBe(3);
    });

    it("refreshes without the animation when the page becomes visible", () => {
        const { state } = mountComposable();

        Object.defineProperty(document, "visibilityState", {
            configurable: true,
            get: () => "visible",
        });
        document.dispatchEvent(new Event("visibilitychange"));
        vi.runOnlyPendingTimers();

        expect(router.reload).toHaveBeenCalledWith({
            only: ["unread_notifications_count"],
        });
        expect(state.isNewNotification.value).toBe(false);
    });

    it("collapses a burst of pushes into a single reload", () => {
        mountComposable();

        dispatchServiceWorkerMessage({ type: "push-notification" });
        dispatchServiceWorkerMessage({ type: "push-notification" });
        dispatchServiceWorkerMessage({ type: "notification-click" });
        vi.runOnlyPendingTimers();

        expect(router.reload).toHaveBeenCalledTimes(1);
    });
});
