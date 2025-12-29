import UserShow from "@/Pages/Users/Show.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

global.route = (name, params) => {
    if (params) {
        return `/${name}/${params}`;
    }
    return `/${name}`;
};

// Mock Inertia
vi.mock("@inertiajs/vue3", () => ({
    Head: { name: "Head", template: "<head><slot /></head>", props: ["title"] },
    Link: { name: "Link", template: "<a><slot /></a>", props: ["href"] },
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
        totalReads: 165, // Sum of all book reads
        topBooks: [
            {
                id: 1,
                title: "Test Book 1",
                slug: "test-book-1",
                read_count: 100,
                cover_image: { media_path: "/path/to/cover1.jpg" },
                created_at: "2024-11-01T10:00:00.000000Z",
            },
            {
                id: 2,
                title: "Test Book 2",
                slug: "test-book-2",
                read_count: 50,
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
                cover_image: { media_path: "/path/to/cover3.jpg" },
                created_at: "2024-12-01T10:00:00.000000Z",
            },
            {
                id: 4,
                title: "Recent Book 2",
                slug: "recent-book-2",
                read_count: 5,
                cover_image: null,
                created_at: "2024-11-20T10:00:00.000000Z",
            },
        ],
        messagesCount: 12,
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

    it("renders user profile information", () => {
        const wrapper = mount(UserShow, {
            props: {
                profileUser,
                stats,
                recentMessages: [],
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
    });

    it("displays member since date", () => {
        const wrapper = mount(UserShow, {
            props: {
                profileUser,
                stats,
                recentMessages: [],
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

    it("displays top books by read count", () => {
        const wrapper = mount(UserShow, {
            props: {
                profileUser,
                stats,
                recentMessages: [],
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

        expect(wrapper.text()).toContain("Top Books by Read Count");
        expect(wrapper.text()).toContain("Test Book 1");
        expect(wrapper.text()).toContain("Test Book 2");
        expect(wrapper.text()).toContain("100 reads");
        expect(wrapper.text()).toContain("50 reads");
    });

    it("displays messages count stat", () => {
        const wrapper = mount(UserShow, {
            props: {
                profileUser,
                stats,
                recentMessages: [],
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
});
