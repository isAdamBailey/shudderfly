import { useUnreadNotifications } from "@/composables/useUnreadNotifications";
import {
    installServiceWorkerMock,
    setDocumentVisibility,
} from "@/vitest.setup";
import { router } from "@inertiajs/vue3";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reactive } from "vue";

// Reactive because the composable watches these props: a partial reload is how
// a refreshed count reaches it.
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

let serviceWorker;
let wrappers;

const mountConsumer = () => {
    const state = {};
    const wrapper = mount({
        template: "<div />",
        setup() {
            Object.assign(state, useUnreadNotifications());
        },
    });
    wrappers.push(wrapper);

    return { wrapper, state };
};

beforeEach(() => {
    vi.useFakeTimers();
    wrappers = [];
    mockPage.props.unread_notifications_count = 0;
    router.reload.mockClear();

    window.Echo = {
        private: vi.fn(() => ({ notification: vi.fn() })),
        leave: vi.fn(),
    };

    serviceWorker = installServiceWorkerMock();
});

afterEach(() => {
    wrappers.forEach((wrapper) => wrapper.unmount());
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    serviceWorker.uninstall();
    delete window.Echo;
});

describe("useUnreadNotifications", () => {
    it("re-reads the unread count from the server when a push arrives", () => {
        mountConsumer();

        serviceWorker.dispatch("push-notification");
        vi.runOnlyPendingTimers();

        expect(router.reload).toHaveBeenCalledWith({
            only: ["unread_notifications_count"],
        });
    });

    it("flags a new notification so the bell dot animates", () => {
        const { state } = mountConsumer();

        expect(state.isNewNotification.value).toBe(false);

        serviceWorker.dispatch("push-notification");

        expect(state.isNewNotification.value).toBe(true);
    });

    it("shows the unread dot once the refreshed count arrives", async () => {
        const { wrapper, state } = mountConsumer();

        serviceWorker.dispatch("push-notification");
        mockPage.props.unread_notifications_count = 3;
        await wrapper.vm.$nextTick();

        expect(state.unreadCount.value).toBe(3);
    });

    it("refreshes without the animation when the page becomes visible", () => {
        const { state } = mountConsumer();

        setDocumentVisibility("visible");
        vi.runOnlyPendingTimers();

        expect(router.reload).toHaveBeenCalledWith({
            only: ["unread_notifications_count"],
        });
        expect(state.isNewNotification.value).toBe(false);
    });

    it("collapses a burst of signals into a single reload", () => {
        mountConsumer();

        serviceWorker.dispatch("push-notification");
        serviceWorker.dispatch("notification-click");
        setDocumentVisibility("visible");
        vi.runOnlyPendingTimers();

        expect(router.reload).toHaveBeenCalledTimes(1);
    });

    it("shares one count, one Echo subscription and one listener across consumers", () => {
        const first = mountConsumer();
        const second = mountConsumer();

        expect(second.state.unreadCount).toBe(first.state.unreadCount);
        expect(window.Echo.private).toHaveBeenCalledTimes(1);
        expect(serviceWorker.listenerCount()).toBe(1);
    });

    it("keeps working for the remaining consumers when one unmounts", () => {
        const { wrapper } = mountConsumer();
        const survivor = mountConsumer();

        wrapper.unmount();
        serviceWorker.dispatch("push-notification");

        expect(window.Echo.leave).not.toHaveBeenCalled();
        expect(survivor.state.isNewNotification.value).toBe(true);

        vi.runOnlyPendingTimers();
        expect(router.reload).toHaveBeenCalledTimes(1);
    });

    it("tears down once the last consumer unmounts", () => {
        const { wrapper } = mountConsumer();

        wrapper.unmount();

        expect(window.Echo.leave).toHaveBeenCalled();
        expect(serviceWorker.listenerCount()).toBe(0);

        serviceWorker.dispatch("push-notification");
        vi.runOnlyPendingTimers();
        expect(router.reload).not.toHaveBeenCalled();
    });
});
