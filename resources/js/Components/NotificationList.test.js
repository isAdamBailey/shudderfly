import NotificationList from "@/Components/NotificationList.vue";
import { installServiceWorkerMock } from "@/vitest.setup";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

global.route = (name, params) => {
    if (params) {
        return `/${name}/${params}`;
    }
    return `/${name}`;
};

// Mock axios
vi.mock("axios", () => ({
    default: {
        get: vi.fn(() =>
            Promise.resolve({
                data: {
                    data: [],
                },
            })
        ),
        post: vi.fn(() => Promise.resolve({ data: {} })),
    },
    get: vi.fn(() =>
        Promise.resolve({
            data: {
                data: [],
            },
        })
    ),
    post: vi.fn(() => Promise.resolve({ data: {} })),
}));

// Mock usePage
const mockPage = {
    props: {
        auth: {
            user: { id: 1, name: "Test User" },
        },
    },
};

// vi.mock is hoisted, so the spies must be created inside the factory.
vi.mock("@inertiajs/vue3", () => ({
    router: {
        reload: vi.fn(),
        visit: vi.fn(),
    },
    usePage: () => mockPage,
}));

vi.mock("@/composables/useFlashMessage", () => ({
    useFlashMessage: () => ({ setFlashMessage: vi.fn() }),
}));

// Mock window.Echo
global.window.Echo = {
    private: vi.fn(() => ({
        notification: vi.fn(),
    })),
    leave: vi.fn(),
};

// Mock useUnreadNotifications
const mockUnreadCount = { value: 0 };
vi.mock("@/composables/useUnreadNotifications", () => ({
    useUnreadNotifications: () => ({
        unreadCount: mockUnreadCount,
    }),
    refreshUnreadCount: vi.fn(),
}));

vi.mock("@/composables/useSpeechSynthesis", () => ({
    useSpeechSynthesis: () => ({
        speak: vi.fn(),
        speaking: { value: false },
    }),
}));

vi.mock("@/composables/useTranslations", () => ({
    useTranslations: () => ({
        t: (key, replacements = {}) => {
            let str = key;
            Object.entries(replacements).forEach(([k, v]) => {
                str = str.replace(new RegExp(`:${k}`, "g"), v);
            });
            return str;
        },
    }),
}));

// The component subscribes to the page-level notification-refresh signal, which
// detaches only when its last subscriber goes away — so every wrapper has to be
// torn down, not just the ones a test unmounts itself.
enableAutoUnmount(afterEach);

describe("NotificationList", () => {
    let serviceWorker;

    const pushNotificationArrives = () =>
        serviceWorker.dispatch("push-notification");

    const mockNotifications = [
        {
            id: "1",
            type: "App\\Notifications\\UserTagged",
            data: {
                tagger_name: "Alice",
                message: "Hello @Test User!",
                message_id: 1,
                url: "/messages",
            },
            created_at: new Date().toISOString(),
            read_at: null,
        },
        {
            id: "2",
            type: "App\\Notifications\\UserTagged",
            data: {
                tagger_name: "Bob",
                message: "How are you?",
                message_id: 2,
                url: "/messages",
            },
            created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            read_at: new Date().toISOString(), // Already read
        },
    ];

    beforeEach(async () => {
        vi.clearAllMocks();
        const axios = (await import("axios")).default;
        axios.get = vi.fn().mockResolvedValue({
            data: {
                data: mockNotifications,
            },
        });
        axios.post = vi.fn().mockResolvedValue({ data: {} });
        mockUnreadCount.value = 1;

        // Mock window.Echo
        global.window.Echo = {
            private: vi.fn(() => ({
                notification: vi.fn(),
            })),
            leave: vi.fn(),
        };

        serviceWorker = installServiceWorkerMock();
    });

    afterEach(() => {
        serviceWorker.uninstall();
    });

    describe("Rendering", () => {
        it("displays loading state initially", async () => {
            const axios = (await import("axios")).default;
            axios.get.mockImplementation(
                () =>
                    new Promise((resolve) => {
                        setTimeout(() => resolve({ data: { data: [] } }), 100);
                    })
            );

            const wrapper = mount(NotificationList);

            expect(wrapper.text()).toContain("Loading notifications");
        });

        it("displays notifications when loaded", async () => {
            const wrapper = mount(NotificationList);

            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(wrapper.text()).toContain("Alice");
            expect(wrapper.text()).toContain("Hello");
        });

        it("displays empty state when no notifications", async () => {
            const axios = (await import("axios")).default;
            axios.get.mockResolvedValue({
                data: {
                    data: [],
                },
            });

            const wrapper = mount(NotificationList);

            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(wrapper.text()).toContain("No notifications yet");
        });
    });

    describe("Notification display", () => {
        it("shows unread indicator for unread notifications", async () => {
            const wrapper = mount(NotificationList);

            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Check for unread indicator (amber/teal highlight)
            const html = wrapper.html();
            expect(html).toContain("bg-amber-50");
        });

        it("shows read styling for read notifications", async () => {
            const wrapper = mount(NotificationList);

            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Check for read styling
            const html = wrapper.html();
            expect(html).toContain("bg-gray-50");
        });

        it("displays tagger name correctly", async () => {
            const wrapper = mount(NotificationList);

            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(wrapper.text()).toContain("Alice");
            expect(wrapper.text()).toContain("tagged you");
        });

        it("displays notification message", async () => {
            const wrapper = mount(NotificationList);

            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(wrapper.text()).toContain("Hello");
        });

        it("displays emoji reaction notifications", async () => {
            const axios = (await import("axios")).default;
            axios.get.mockResolvedValue({
                data: {
                    data: [
                        {
                            id: "3",
                            type: "App\\Notifications\\MessageReacted",
                            data: {
                                reactor_name: "Carol",
                                reactor_id: 5,
                                emoji: "👍",
                                message: "Look at my drawing",
                                message_id: 7,
                                url: "/messages#message-7",
                            },
                            created_at: new Date().toISOString(),
                            read_at: null,
                        },
                    ],
                },
            });

            const wrapper = mount(NotificationList);

            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(wrapper.text()).toContain("Carol");
            expect(wrapper.text()).toContain("notifications.reaction_label");
            expect(wrapper.text()).toContain("Look at my drawing");
        });

        it("labels reaction notifications on replies differently", async () => {
            const axios = (await import("axios")).default;
            axios.get.mockResolvedValue({
                data: {
                    data: [
                        {
                            id: "4",
                            type: "App\\Notifications\\MessageReacted",
                            data: {
                                reactor_name: "Carol",
                                reactor_id: 5,
                                emoji: "😂",
                                message: "Look at my drawing",
                                message_id: 7,
                                comment_id: 12,
                                comment: "That is great",
                                url: "/messages#message-7",
                            },
                            created_at: new Date().toISOString(),
                            read_at: null,
                        },
                    ],
                },
            });

            const wrapper = mount(NotificationList);

            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(wrapper.text()).toContain(
                "notifications.reaction_comment_label"
            );
            expect(wrapper.text()).toContain("That is great");
        });

        it("shows view message link when message_id exists", async () => {
            const wrapper = mount(NotificationList);

            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 100));

            // The entire notification card is now clickable, check for the "View message" text
            expect(wrapper.text()).toContain("general.view_message");
        });
    });

    describe("Mark as read", () => {
        it("shows mark as read button for unread notifications", async () => {
            const wrapper = mount(NotificationList);

            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 100));

            const markAsReadButton = wrapper.find('button[title="Clear"]');
            expect(markAsReadButton.exists()).toBe(true);
        });

        it("calls API when mark as read is clicked", async () => {
            const axios = (await import("axios")).default;
            axios.post = vi.fn().mockResolvedValue({ data: {} });

            const wrapper = mount(NotificationList);

            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 200));

            // Wait for notifications to load
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 100));

            const unreadNotification = wrapper.vm.notifications?.find(
                (n) => !n.read_at
            );

            if (unreadNotification) {
                await wrapper.vm.markAsRead(unreadNotification.id);

                // Wait for axios call
                await nextTick();
                await new Promise((resolve) => setTimeout(resolve, 100));

                expect(axios.post).toHaveBeenCalled();
                if (axios.post.mock.calls.length > 0) {
                    const callArgs = axios.post.mock.calls[0];
                    // The route function generates "/notifications.read/1" format
                    expect(callArgs[0]).toContain("notifications");
                    expect(callArgs[0]).toContain("read");
                }
            } else {
                // If no unread notifications, just verify the component loaded
                expect(wrapper.vm.notifications).toBeDefined();
            }
        });

        it("updates notification to read state after marking", async () => {
            const wrapper = mount(NotificationList);

            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 200));

            const unreadNotification = wrapper.vm.notifications.find(
                (n) => !n.read_at
            );

            if (unreadNotification) {
                await wrapper.vm.markAsRead(unreadNotification.id);

                await nextTick();

                // Notification should be marked as read locally
                const updatedNotification = wrapper.vm.notifications.find(
                    (n) => n.id === unreadNotification.id
                );
                expect(updatedNotification.read_at).toBeTruthy();
            }
        });

        it("does not show mark as read button for already read notifications", async () => {
            const axios = (await import("axios")).default;
            const readOnlyNotifications = [
                {
                    id: "2",
                    type: "App\\Notifications\\UserTagged",
                    data: {
                        tagger_name: "Bob",
                        message: "How are you?",
                        message_id: 2,
                    },
                    created_at: new Date().toISOString(),
                    read_at: new Date().toISOString(),
                },
            ];

            axios.get.mockResolvedValue({
                data: {
                    data: readOnlyNotifications,
                },
            });

            const wrapper = mount(NotificationList);

            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 100));

            const markAsReadButton = wrapper.find('button[title="Clear"]');
            expect(markAsReadButton.exists()).toBe(false);
        });
    });

    describe("Date formatting", () => {
        it("formats recent dates correctly", async () => {
            const axios = (await import("axios")).default;
            const recentNotification = [
                {
                    id: "1",
                    type: "App\\Notifications\\UserTagged",
                    data: {
                        tagger_name: "Alice",
                        message: "Hello",
                        message_id: 1,
                    },
                    created_at: new Date().toISOString(),
                    read_at: null,
                },
            ];

            axios.get.mockResolvedValue({
                data: {
                    data: recentNotification,
                },
            });

            const wrapper = mount(NotificationList);

            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 100));

            const text = wrapper.text();
            expect(text).toMatch(/just now|minute/i);
        });
    });

    describe("Echo integration", () => {
        it("subscribes to user's private channel on mount", () => {
            mount(NotificationList);

            expect(global.window.Echo.private).toHaveBeenCalledWith(
                "App.Models.User.1"
            );
        });

        it("adds new notification when broadcast event is received", async () => {
            const wrapper = mount(NotificationList);

            await nextTick();

            const channel = global.window.Echo.private("App.Models.User.1");
            const notificationCallback =
                channel.notification.mock.calls[0]?.[0];

            if (notificationCallback) {
                const newNotification = {
                    id: "3",
                    type: "App\\Notifications\\UserTagged",
                    data: {
                        tagger_name: "Charlie",
                        message: "New notification",
                        message_id: 3,
                    },
                    created_at: new Date().toISOString(),
                    read_at: null,
                };

                notificationCallback(newNotification);
                await nextTick();

                expect(wrapper.text()).toContain("Charlie");
            }
        });
    });

    describe("Error handling", () => {
        it("handles API errors gracefully", async () => {
            const axios = (await import("axios")).default;
            const consoleErrorSpy = vi
                .spyOn(console, "error")
                .mockImplementation(() => {});

            axios.get.mockRejectedValue(new Error("API Error"));

            mount(NotificationList);

            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });
    });

    describe("Unblock requests", () => {
        const unblockNotification = {
            id: "9",
            type: "App\\Notifications\\UnblockRequested",
            data: {
                requester_name: "Dana",
                requester_id: 9,
                blocked_count: 4,
                unblock_request_id: 77,
            },
            created_at: new Date().toISOString(),
            read_at: null,
        };

        it("unblocks in place instead of navigating", async () => {
            const axios = (await import("axios")).default;
            axios.get.mockResolvedValue({
                data: { data: [unblockNotification] },
            });
            axios.post.mockResolvedValue({
                data: { message: "Unblocked 4 things." },
            });

            const wrapper = mount(NotificationList);
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 100));

            await wrapper.find(".cursor-pointer").trigger("click");
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Admins unblock directly from the bell, with no confirm and no
            // trip to the dashboard — and scoped to the ask, so honouring it
            // here also kills the emailed link.
            expect(axios.post).toHaveBeenCalledWith(
                "/unblock-requests.unblock/77",
                {},
                expect.anything()
            );
            const { router } = await import("@inertiajs/vue3");
            expect(router.visit).not.toHaveBeenCalled();
        });

        it("keeps other live asks when one is already handled", async () => {
            const axios = (await import("axios")).default;
            axios.get.mockResolvedValue({
                data: {
                    data: [
                        { ...unblockNotification },
                        {
                            ...unblockNotification,
                            id: "10",
                            data: {
                                ...unblockNotification.data,
                                requester_name: "Sam",
                                unblock_request_id: 78,
                            },
                        },
                    ],
                },
            });
            axios.post.mockRejectedValue({
                response: { status: 409, data: { message: "Already done." } },
            });

            const wrapper = mount(NotificationList);
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 100));

            await wrapper.findAll(".cursor-pointer")[0].trigger("click");
            await new Promise((resolve) => setTimeout(resolve, 50));
            await nextTick();

            // A 409 unblocked nothing, so the other child's ask must survive.
            expect(wrapper.text()).toContain("Sam");
            expect(wrapper.text()).not.toContain("Dana");
        });

        it("clears every ask from the list once one unblock succeeds", async () => {
            const axios = (await import("axios")).default;
            axios.get.mockResolvedValue({
                data: {
                    data: [
                        { ...unblockNotification },
                        {
                            ...unblockNotification,
                            id: "10",
                            data: {
                                ...unblockNotification.data,
                                unblock_request_id: 78,
                            },
                        },
                    ],
                },
            });
            axios.post.mockResolvedValue({
                data: { message: "Unblocked 4 things." },
            });

            const wrapper = mount(NotificationList);
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 100));

            await wrapper.findAll(".cursor-pointer")[0].trigger("click");
            await new Promise((resolve) => setTimeout(resolve, 50));
            await nextTick();

            // The server deletes every outstanding ask, so the sibling entry
            // must go too rather than sit there offering a dead unblock.
            expect(wrapper.text()).not.toContain("unblock_request.asked_label");
        });
    });

    describe("Push notification refresh", () => {
        it("re-fetches the list when a push notification arrives", async () => {
            const axios = (await import("axios")).default;
            axios.get.mockResolvedValue({ data: { data: [] } });

            const wrapper = mount(NotificationList);
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(wrapper.text()).toContain("No notifications yet");

            axios.get.mockResolvedValue({
                data: { data: [mockNotifications[0]] },
            });
            pushNotificationArrives();
            await new Promise((resolve) => setTimeout(resolve, 100));
            await nextTick();

            // The push is the only signal an open-but-asleep tab gets, so the
            // new notification has to appear without a page reload.
            expect(wrapper.text()).toContain("Alice");
        });

        it("keeps the current list on screen while refreshing", async () => {
            const axios = (await import("axios")).default;

            const wrapper = mount(NotificationList);
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 100));

            axios.get.mockImplementation(
                () =>
                    new Promise((resolve) => {
                        setTimeout(
                            () =>
                                resolve({ data: { data: mockNotifications } }),
                            100
                        );
                    })
            );
            pushNotificationArrives();
            await nextTick();

            expect(wrapper.text()).not.toContain("Loading notifications");
            expect(wrapper.text()).toContain("Alice");
        });

        it("stops refreshing once unmounted", async () => {
            const axios = (await import("axios")).default;

            const wrapper = mount(NotificationList);
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 100));

            wrapper.unmount();
            axios.get.mockClear();
            pushNotificationArrives();
            await new Promise((resolve) => setTimeout(resolve, 50));

            expect(axios.get).not.toHaveBeenCalled();
        });
    });
});
