import UsersForm from "@/Pages/Profile/Partials/UsersForm.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
let mockCanSuperAdmin = false;
vi.mock("@/composables/permissions", () => ({
    usePermissions: () => ({
        canAdmin: mockCanAdmin,
        canSuperAdmin: mockCanSuperAdmin,
    }),
}));

describe("UsersForm", () => {
    beforeEach(() => {
        mockCanAdmin = true;
        mockCanSuperAdmin = false;
    });

    const users = [
        {
            name: "Admin User",
            email: "admin@example.com",
            permissions_list: [
                "admin",
                "edit pages",
                "edit profile",
                "super admin",
            ],
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

    it("shows permission badges for each user when viewer is admin", () => {
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

        expect(wrapper.text()).toContain("Admin");
        expect(wrapper.text()).toContain("Edit Pages");
        expect(wrapper.text()).toContain("Edit Profile");
    });

    it("hides permission badges when viewer is not admin", () => {
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

        expect(wrapper.find(".bg-purple-100").exists()).toBe(false);
        expect(wrapper.find(".bg-blue-100").exists()).toBe(false);
        expect(wrapper.find(".bg-green-100").exists()).toBe(false);
        expect(wrapper.text()).not.toContain("Edit Pages");
        expect(wrapper.text()).not.toContain("Edit Profile");
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

    it("shows the super admin badge for super admins", () => {
        mockCanAdmin = true;
        mockCanSuperAdmin = false;
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

        expect(wrapper.text()).toContain("Super Admin");
        expect(wrapper.findAll(".bg-amber-100").length).toBe(1);
    });

    it("hides super admin actions from admins who are not super admins", () => {
        mockCanAdmin = true;
        mockCanSuperAdmin = false;
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

        expect(wrapper.text()).not.toContain("Make Super Admin");
        expect(wrapper.text()).not.toContain("Revoke Super Admin");
    });

    it("lets a super admin grant and revoke super admin", () => {
        mockCanAdmin = true;
        mockCanSuperAdmin = true;
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

        expect(wrapper.text()).toContain("Revoke Super Admin");
        expect(wrapper.text()).toContain("Make Super Admin");
    });
});
