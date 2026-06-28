import UserShow from "@/Pages/Users/Show.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

global.route = (name, params) => {
    if (params && typeof params === "object") {
        return `/${name}/${Object.values(params)[0]}`;
    }
    if (params) {
        return `/${name}/${params}`;
    }
    return `/${name}`;
};

const mockRouterPost = vi.fn();

vi.mock("@inertiajs/vue3", () => ({
    Head: { name: "Head", template: "<head><slot /></head>", props: ["title"] },
    Link: { name: "Link", template: "<a><slot /></a>", props: ["href"] },
    router: { post: mockRouterPost },
}));

const mockCanAdmin = vi.fn(() => false);

vi.mock("@/composables/permissions", () => ({
    usePermissions: () => ({
        get canAdmin() {
            return mockCanAdmin();
        },
    }),
}));

vi.mock("@/composables/useSpeechSynthesis", () => ({
    useSpeechSynthesis: () => ({
        speak: vi.fn(),
        speaking: false,
    }),
}));

vi.mock("@/composables/useTranslations", () => ({
    useTranslations: () => ({
        t: (key, replacements = {}) => {
            let translation = key;
            Object.keys(replacements).forEach((placeholder) => {
                translation = translation.replace(
                    new RegExp(`:${placeholder}`, "g"),
                    replacements[placeholder]
                );
            });
            return translation;
        },
    }),
}));

describe("UserShow", () => {
    const profileUser = {
        name: "Test User",
        email: "test@example.com",
        avatar: null,
        created_at: "2024-01-15T10:30:00.000000Z",
    };

    const stats = {
        totalBooksCount: 4,
        totalReads: 165,
        topBooks: [
            {
                id: 1,
                title: "Test Book 1",
                slug: "test-book-1",
                read_count: 100,
                popularity_percentage: 95,
                cover_image: { media_path: "/path/to/cover1.jpg" },
                created_at: "2024-11-01T10:00:00.000000Z",
            },
            {
                id: 2,
                title: "Test Book 2",
                slug: "test-book-2",
                read_count: 50,
                popularity_percentage: 75,
                cover_image: null,
                created_at: "2024-10-15T10:00:00.000000Z",
            },
        ],
        recentBooks: [
            {
                id: 3,
                title: "Recent Book 1",
                slug: "recent-book-1",
                read_count: 10,
                popularity_percentage: 50,
                cover_image: { media_path: "/path/to/cover3.jpg" },
                created_at: "2024-12-01T10:00:00.000000Z",
            },
            {
                id: 4,
                title: "Recent Book 2",
                slug: "recent-book-2",
                read_count: 5,
                popularity_percentage: 25,
                cover_image: null,
                created_at: "2024-11-20T10:00:00.000000Z",
            },
        ],
        messagesCount: 12,
    };
    const weeklyOverview = {
        text: "Test User is the giggle-powered librarian hero who makes everyone feel welcome and important.",
        generatedAt: "2024-12-31T10:00:00.000000Z",
    };

    const recentMessages = [
        {
            id: 1,
            user_id: 1,
            message: "Test message",
            created_at: "2024-12-29T10:00:00.000000Z",
            user: profileUser,
            page: null,
        },
    ];

    const recentReplies = [
        {
            id: 1,
            message_id: 99,
            comment: "This is a reply to a message.",
            created_at: "2024-12-30T10:00:00.000000Z",
        },
    ];

    it("renders user profile information with inline weekly overview", () => {
        const wrapper = mount(UserShow, {
            props: {
                profileUser,
                weeklyOverview,
                stats,
                recentMessages: [],
                recentReplies: [],
            },
            global: {
                stubs: {
                    BreezeAuthenticatedLayout: {
                        template: "<div><slot name='header' /><slot /></div>",
                    },
                    Avatar: true,
                    MessageTimeline: true,
                    Head: true,
                },
            },
        });

        expect(wrapper.text()).toContain("Test User");
        expect(wrapper.text()).toContain("test@example.com");
        expect(wrapper.text()).toContain(weeklyOverview.text);
        expect(wrapper.text()).toContain("Updated");
        expect(wrapper.text()).not.toContain("Weekly AI Profile Story");
    });

    it("displays member since date", () => {
        const wrapper = mount(UserShow, {
            props: {
                profileUser,
                stats,
                recentMessages: [],
                recentReplies: [],
            },
            global: {
                stubs: {
                    BreezeAuthenticatedLayout: {
                        template: "<div><slot name='header' /><slot /></div>",
                    },
                    Avatar: true,
                    MessageTimeline: true,
                    Head: true,
                },
            },
        });

        expect(wrapper.text()).toContain("Member since");
    });

    it("displays top books by popularity", () => {
        const wrapper = mount(UserShow, {
            props: {
                profileUser,
                stats,
                recentMessages: [],
                recentReplies: [],
            },
            global: {
                stubs: {
                    BreezeAuthenticatedLayout: {
                        template: "<div><slot name='header' /><slot /></div>",
                    },
                    Avatar: true,
                    MessageTimeline: true,
                    Head: true,
                    Link: {
                        template: '<a :href="href"><slot /></a>',
                        props: ["href"],
                    },
                },
            },
        });

        expect(wrapper.text()).toContain("Top Books by");
        expect(wrapper.text()).toContain("Test Book 1");
        expect(wrapper.text()).toContain("Test Book 2");
        expect(wrapper.text()).toContain("popularity 50%");
        expect(wrapper.text()).toContain("popularity 25%");
    });

    it("displays messages count stat", () => {
        const wrapper = mount(UserShow, {
            props: {
                profileUser,
                stats,
                recentMessages: [],
                recentReplies: [],
            },
            global: {
                stubs: {
                    BreezeAuthenticatedLayout: {
                        template: "<div><slot name='header' /><slot /></div>",
                    },
                    Avatar: true,
                    MessageTimeline: true,
                    Head: true,
                },
            },
        });

        expect(wrapper.text()).toContain("12 total");
        expect(wrapper.text()).toContain("Messages");
    });

    it("shows recent messages when available", () => {
        const wrapper = mount(UserShow, {
            props: {
                profileUser,
                stats,
                recentMessages,
                recentReplies: [],
            },
            global: {
                stubs: {
                    BreezeAuthenticatedLayout: {
                        template: "<div><slot name='header' /><slot /></div>",
                    },
                    Avatar: true,
                    MessageTimeline: {
                        template:
                            "<div class='message-timeline-stub'><slot /></div>",
                        props: ["messages", "readOnly"],
                    },
                    Head: true,
                },
            },
        });

        expect(wrapper.text()).toContain("Recent Messages");
        expect(wrapper.find(".message-timeline-stub").exists()).toBe(true);
    });

    it("shows no messages text when user has no messages", () => {
        const wrapper = mount(UserShow, {
            props: {
                profileUser,
                stats,
                recentMessages: [],
                recentReplies: [],
            },
            global: {
                stubs: {
                    BreezeAuthenticatedLayout: {
                        template: "<div><slot name='header' /><slot /></div>",
                    },
                    Avatar: true,
                    MessageTimeline: true,
                    Head: true,
                },
            },
        });

        expect(wrapper.text()).toContain("No messages yet");
    });

    it("shows recent replies when available", () => {
        const wrapper = mount(UserShow, {
            props: {
                profileUser,
                stats,
                recentMessages: [],
                recentReplies,
            },
            global: {
                stubs: {
                    BreezeAuthenticatedLayout: {
                        template: "<div><slot name='header' /><slot /></div>",
                    },
                    Avatar: true,
                    MessageTimeline: true,
                    Head: true,
                    Link: {
                        template: '<a :href="href"><slot /></a>',
                        props: ["href"],
                    },
                },
            },
        });

        expect(wrapper.text()).toContain("Recent Replies");
        expect(wrapper.text()).toContain("This is a reply to a message.");
        expect(wrapper.text()).toContain("View message");
    });

    it("shows no replies text when user has no replies", () => {
        const wrapper = mount(UserShow, {
            props: {
                profileUser,
                stats,
                recentMessages: [],
                recentReplies: [],
            },
            global: {
                stubs: {
                    BreezeAuthenticatedLayout: {
                        template: "<div><slot name='header' /><slot /></div>",
                    },
                    Avatar: true,
                    MessageTimeline: true,
                    Head: true,
                    Link: {
                        template: '<a :href="href"><slot /></a>',
                        props: ["href"],
                    },
                },
            },
        });

        expect(wrapper.text()).toContain("No replies yet");
    });

    it("hides the regenerate overview button for non-admins", () => {
        mockCanAdmin.mockReturnValueOnce(false);

        const wrapper = mount(UserShow, {
            props: {
                profileUser,
                weeklyOverview,
                stats,
                recentMessages: [],
                recentReplies: [],
            },
            global: {
                stubs: {
                    BreezeAuthenticatedLayout: {
                        template: "<div><slot name='header' /><slot /></div>",
                    },
                    Avatar: true,
                    MessageTimeline: true,
                    Head: true,
                },
            },
        });

        expect(wrapper.text()).not.toContain("Regenerate AI overview");
    });

    it("shows the regenerate overview button for admins and posts on click", async () => {
        mockCanAdmin.mockReturnValueOnce(true);

        const wrapper = mount(UserShow, {
            props: {
                profileUser,
                weeklyOverview,
                stats,
                recentMessages: [],
                recentReplies: [],
            },
            global: {
                stubs: {
                    BreezeAuthenticatedLayout: {
                        template: "<div><slot name='header' /><slot /></div>",
                    },
                    Avatar: true,
                    MessageTimeline: true,
                    Head: true,
                },
            },
        });

        const button = wrapper.find("button");
        expect(button.text()).toContain("Regenerate AI overview");

        await button.trigger("click");

        expect(mockRouterPost).toHaveBeenCalledWith(
            "/users.regenerate-weekly-overview/test@example.com",
            {},
            expect.objectContaining({ onFinish: expect.any(Function) })
        );
    });
});
