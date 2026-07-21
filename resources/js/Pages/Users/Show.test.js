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

const mockRouterPost = vi.hoisted(() => vi.fn());
const mockCanAdmin = vi.hoisted(() => vi.fn(() => false));
const mockCanEditPages = vi.hoisted(() => vi.fn(() => false));

vi.mock("@inertiajs/vue3", () => ({
    Head: { name: "Head", template: "<head><slot /></head>", props: ["title"] },
    Link: { name: "Link", template: "<a><slot /></a>", props: ["href"] },
    router: { post: mockRouterPost },
    usePage: () => ({
        props: { settings: { messaging_enabled: true } },
    }),
}));

vi.mock("@/composables/permissions", () => ({
    usePermissions: () => ({
        get canAdmin() {
            return mockCanAdmin();
        },
        get canEditPages() {
            return mockCanEditPages();
        },
    }),
}));

vi.mock("@/composables/useNotificationSync", () => ({
    useNotificationSync: () => ({
        isRead: () => false,
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
    }),
}));

vi.mock("@/Pages/Users/Partials/OwnerPanel.vue", () => ({
    default: {
        name: "OwnerPanel",
        template: '<div class="owner-panel-stub" />',
    },
}));

vi.mock("@/Pages/Books/NewBookForm.vue", () => ({
    default: {
        name: "NewBookForm",
        template: '<form class="new-book-form-stub" />',
        props: ["authors", "categories"],
    },
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

        expect(wrapper.text()).toContain("profile.user_top_books");
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
                recentMessages,
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
        expect(wrapper.text()).toContain("profile.user_latest_messages");
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

        expect(wrapper.text()).toContain("profile.user_latest_messages");
        expect(wrapper.find(".message-timeline-stub").exists()).toBe(true);
    });

    it("hides the messages tile entirely when user has no messages", () => {
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

        expect(wrapper.text()).not.toContain("profile.user_latest_messages");
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

        expect(wrapper.text()).toContain("profile.user_latest_replies");
        expect(wrapper.text()).toContain("This is a reply to a message.");
        expect(wrapper.text()).toContain("View message");
    });

    it("hides the replies tile entirely when user has no replies", () => {
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

        expect(wrapper.text()).not.toContain("profile.user_latest_replies");
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

        const button = wrapper
            .findAll("button")
            .find((b) => b.text().includes("Regenerate AI overview"));
        expect(button).toBeTruthy();
        expect(button.text()).toContain("Regenerate AI overview");

        await button.trigger("click");

        expect(mockRouterPost).toHaveBeenCalledWith(
            "/users.regenerate-weekly-overview/test@example.com",
            {},
            expect.objectContaining({ onFinish: expect.any(Function) })
        );
    });

    describe("owner dashboard view", () => {
        const ownerStubs = {
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
        };

        it("shows the welcome greeting and hides visitor-only sections when isOwner", () => {
            const wrapper = mount(UserShow, {
                props: {
                    profileUser,
                    isOwner: true,
                    stats,
                    recentMessages: [],
                    recentReplies: [],
                },
                global: { stubs: ownerStubs },
            });

            // Header title is intentionally omitted; the greeting lives in the
            // profile card (welcome_with_name).
            expect(wrapper.text()).not.toContain("profile.welcome_header");
            expect(wrapper.text()).toContain("profile.welcome_with_name");
            expect(wrapper.text()).not.toContain("profile.user_top_books");
            expect(wrapper.text()).not.toContain(
                "profile.user_recently_created"
            );
            expect(wrapper.text()).not.toContain(
                "profile.user_latest_messages"
            );
            expect(wrapper.text()).not.toContain("profile.user_latest_replies");
        });

        it("renders owner-only activity, new books, uploads, and OwnerPanel sections", () => {
            const wrapper = mount(UserShow, {
                props: {
                    profileUser,
                    isOwner: true,
                    stats,
                    recentMessages: [],
                    recentReplies: [],
                    recentActivity: {
                        replies: [
                            {
                                id: 1,
                                created_at: "2024-12-30T10:00:00.000000Z",
                                data: {
                                    commenter_name: "Other User",
                                    comment: "Nice page!",
                                    url: "/messages#message-5",
                                },
                            },
                        ],
                        mentions: [
                            {
                                id: 2,
                                created_at: "2024-12-30T11:00:00.000000Z",
                                data: {
                                    tagger_name: "Tagger Person",
                                    message: "Check this out!",
                                    url: "/messages#message-9",
                                },
                            },
                        ],
                    },
                    newBooksThisWeek: [
                        {
                            id: 10,
                            title: "Brand New Book",
                            slug: "brand-new-book",
                            created_at: "2024-12-29T10:00:00.000000Z",
                        },
                    ],
                    recentUploads: [
                        {
                            id: 20,
                            created_at: "2024-12-28T10:00:00.000000Z",
                            book: { title: "Some Book" },
                            media_path: "/path/to/image.jpg",
                        },
                    ],
                },
                global: { stubs: ownerStubs },
            });

            expect(wrapper.text()).toContain("profile.replies_to_you");
            expect(wrapper.text()).toContain("profile.messages_to_you");
            expect(wrapper.text()).toContain("Other User");
            expect(wrapper.text()).toContain("Nice page!");
            expect(wrapper.text()).toContain("profile.new_books_this_week");
            expect(wrapper.text()).toContain("Brand New Book");
            expect(wrapper.text()).toContain("profile.recent_uploads");
            expect(wrapper.text()).toContain("Some Book");
            expect(wrapper.findComponent({ name: "OwnerPanel" }).exists()).toBe(
                true
            );
        });

        it("does not render OwnerPanel or owner-only sections for visitors", () => {
            const wrapper = mount(UserShow, {
                props: {
                    profileUser,
                    isOwner: false,
                    stats,
                    recentMessages: [],
                    recentReplies: [],
                },
                global: { stubs: ownerStubs },
            });

            expect(wrapper.findComponent({ name: "OwnerPanel" }).exists()).toBe(
                false
            );
            expect(wrapper.text()).not.toContain("profile.replies_to_you");
            expect(wrapper.text()).not.toContain("profile.messages_to_you");
            expect(wrapper.text()).not.toContain("profile.new_books_this_week");
            expect(wrapper.text()).not.toContain("profile.recent_uploads");
        });

        it("shows the hero summary and browse CTAs to every owner regardless of permissions", () => {
            mockCanEditPages.mockReturnValueOnce(false);
            mockCanAdmin.mockReturnValueOnce(false);

            const wrapper = mount(UserShow, {
                props: {
                    profileUser,
                    isOwner: true,
                    stats,
                    recentMessages: [],
                    recentReplies: [],
                },
                global: { stubs: ownerStubs },
            });

            // Personalized welcome + navigation CTAs exposed to all users
            expect(wrapper.text()).toContain("profile.welcome_with_name");
            expect(wrapper.text()).toContain("dashboard.browse_collages");
            expect(wrapper.text()).toContain("dashboard.browse_games");
            expect(wrapper.text()).toContain("dashboard.browse_chat");
            // Edit/admin-only actions hidden for a plain user
            expect(wrapper.text()).not.toContain("dashboard.add_new_book");
            expect(wrapper.text()).not.toContain("Regenerate AI overview");
        });

        it("renders the AI weekly overview inside the hero for owners", () => {
            const wrapper = mount(UserShow, {
                props: {
                    profileUser,
                    isOwner: true,
                    stats,
                    recentMessages: [],
                    recentReplies: [],
                    weeklyOverview: {
                        text: "You had a wonderful week of stories!",
                        generatedAt: "2024-12-30T10:00:00.000000Z",
                    },
                },
                global: { stubs: ownerStubs },
            });

            expect(wrapper.text()).toContain(
                "You had a wonderful week of stories!"
            );
        });

        it("shows the new-book CTA and Add button only when isOwner and canEditPages", () => {
            mockCanEditPages.mockReturnValueOnce(true);

            const wrapper = mount(UserShow, {
                props: {
                    profileUser,
                    isOwner: true,
                    stats,
                    recentMessages: [],
                    recentReplies: [],
                },
                global: { stubs: ownerStubs },
            });

            expect(wrapper.text()).toContain("dashboard.add_new_book");
            expect(
                wrapper.findComponent({ name: "NewBookForm" }).exists()
            ).toBe(false);
        });

        it("hides the add-new-book button when the owner cannot edit pages", () => {
            mockCanEditPages.mockReturnValueOnce(false);

            const wrapper = mount(UserShow, {
                props: {
                    profileUser,
                    isOwner: true,
                    stats,
                    recentMessages: [],
                    recentReplies: [],
                },
                global: { stubs: ownerStubs },
            });

            expect(wrapper.text()).not.toContain("dashboard.add_new_book");
        });
    });
});
