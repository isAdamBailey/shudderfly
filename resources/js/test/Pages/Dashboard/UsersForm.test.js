import UsersForm from "@/Pages/Dashboard/UsersForm.vue";
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
    Link: { name: "Link", template: "<a><slot /></a>", props: ["href"] },
    useForm: vi.fn(() => ({
        user: null,
        permissions: null,
        put: vi.fn(),
        delete: vi.fn(),
        processing: false,
    })),
    usePage: () => ({
        props: {
            auth: {
                user: {
                    name: "Current User",
                    email: "current@example.com",
                },
            },
        },
    }),
}));

// Mock permissions composable - will be overridden in specific tests
let mockCanAdmin = true;
vi.mock("@/composables/permissions", () => ({
    usePermissions: () => ({
        canAdmin: mockCanAdmin,
    }),
}));

describe("UsersForm", () => {
    const users = [
        {
            name: "Admin User",
            email: "admin@example.com",
            permissions_list: ["admin", "edit pages", "edit profile"],
        },
        {
            name: "Regular User",
            email: "user@example.com",
            permissions_list: ["edit profile"],
        },
    ];

    it("renders user cards", () => {
        const wrapper = mount(UsersForm, {
            props: { users },
            global: {
                stubs: {
                    Avatar: true,
                    Dropdown: true,
                    Link: { template: "<a><slot /></a>" },
                },
            },
        });

        expect(wrapper.text()).toContain("Admin User");
        expect(wrapper.text()).toContain("Regular User");
    });

    it("shows admin instructional text when user is admin", () => {
        mockCanAdmin = true;
        const wrapper = mount(UsersForm, {
            props: { users },
            global: {
                stubs: {
                    Avatar: true,
                    Dropdown: true,
                    Link: { template: "<a><slot /></a>" },
                },
            },
        });

        expect(wrapper.text()).toContain(
            "This is where you can manage other users"
        );
        expect(wrapper.text()).toContain("as an administrator");
    });

    it("hides admin instructional text when user is not admin", async () => {
        mockCanAdmin = false;
        const wrapper = mount(UsersForm, {
            props: { users },
            global: {
                stubs: {
                    Avatar: true,
                    Dropdown: true,
                    Link: { template: "<a><slot /></a>" },
                },
            },
        });

        expect(wrapper.text()).not.toContain(
            "This is where you can manage other users"
        );
    });

    it("shows permission badges for each user", () => {
        const wrapper = mount(UsersForm, {
            props: { users },
            global: {
                stubs: {
                    Avatar: true,
                    Dropdown: true,
                    Link: { template: "<a><slot /></a>" },
                },
            },
        });

        expect(wrapper.text()).toContain("Admin");
        expect(wrapper.text()).toContain("Edit Pages");
        expect(wrapper.text()).toContain("Edit Profile");
    });

    it("shows dropdown actions menu when user is admin", () => {
        mockCanAdmin = true;
        const wrapper = mount(UsersForm, {
            props: { users },
            global: {
                stubs: {
                    Avatar: true,
                    Dropdown: {
                        template:
                            '<div class="dropdown-stub"><slot name="trigger" /><slot name="content" /></div>',
                    },
                    Link: { template: "<a><slot /></a>" },
                },
            },
        });

        expect(wrapper.findAll(".dropdown-stub").length).toBeGreaterThan(0);
    });

    it("hides dropdown actions menu when user is not admin", () => {
        mockCanAdmin = false;
        const wrapper = mount(UsersForm, {
            props: { users },
            global: {
                stubs: {
                    Avatar: true,
                    Dropdown: {
                        template:
                            '<div class="dropdown-stub"><slot name="trigger" /><slot name="content" /></div>',
                    },
                    Link: { template: "<a><slot /></a>" },
                },
            },
        });

        expect(wrapper.findAll(".dropdown-stub").length).toBe(0);
    });

    it("user names are links to user profiles", () => {
        const wrapper = mount(UsersForm, {
            props: { users },
            global: {
                stubs: {
                    Avatar: true,
                    Dropdown: true,
                    Link: {
                        template: '<a :href="href"><slot /></a>',
                        props: ["href"],
                    },
                },
            },
        });

        const links = wrapper.findAll("a");
        const userLinks = links.filter(
            (link) =>
                link.attributes("href")?.includes("users.show") ||
                link.text() === "Admin User" ||
                link.text() === "Regular User"
        );

        expect(userLinks.length).toBeGreaterThan(0);
    });
});
