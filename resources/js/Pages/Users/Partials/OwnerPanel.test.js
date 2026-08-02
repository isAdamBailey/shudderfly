import OwnerPanel from "@/Pages/Users/Partials/OwnerPanel.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

const mockCanAdmin = vi.hoisted(() => vi.fn(() => false));

vi.mock("@/composables/permissions", () => ({
    usePermissions: () => ({
        get canAdmin() {
            return mockCanAdmin();
        },
    }),
}));

vi.mock("@/Pages/Profile/Partials/ClocksSection.vue", () => ({
    default: {
        name: "ClocksSection",
        template: "<div class='clocks-section' />",
        props: ["defaultCities", "maxCities", "timezoneLabels", "worldClock"],
    },
}));
vi.mock("@/Pages/Profile/Partials/UsersForm.vue", () => ({
    default: {
        name: "UsersForm",
        template: "<div class='users-form' />",
        props: ["users"],
    },
}));
vi.mock("@/Pages/Profile/Partials/StatsCard.vue", () => ({
    default: {
        name: "StatsCard",
        template: "<div class='stats-card' />",
        props: ["stats"],
    },
}));
vi.mock("@/Pages/Profile/Partials/CategoriesForm.vue", () => ({
    default: {
        name: "CategoriesForm",
        template: "<div class='categories-form' />",
        props: ["categories"],
    },
}));
vi.mock("@/Pages/Profile/Partials/SettingsForm.vue", () => ({
    default: {
        name: "SettingsForm",
        template: "<div class='settings-form' />",
        props: ["settings"],
    },
}));

describe("OwnerPanel", () => {
    it("always renders the general accordions regardless of permissions", () => {
        const wrapper = mount(OwnerPanel);

        expect(wrapper.text()).toContain("Clocks");
        expect(wrapper.text()).toContain("Users");
        expect(wrapper.text()).toContain("Site Statistics");
    });

    it("hides the Administration section for non-admins", () => {
        mockCanAdmin.mockReturnValueOnce(false);

        const wrapper = mount(OwnerPanel);

        expect(wrapper.text()).not.toContain("Administration");
        expect(wrapper.text()).not.toContain("Categories");
        expect(wrapper.findComponent({ name: "SettingsForm" }).exists()).toBe(
            false
        );
    });

    it("shows Categories and Site accordions for admins", () => {
        mockCanAdmin.mockReturnValueOnce(true);

        const wrapper = mount(OwnerPanel, {
            props: {
                categories: [{ id: 1, name: "Fiction" }],
            },
        });

        expect(wrapper.text()).toContain("Administration");
        expect(wrapper.findComponent({ name: "CategoriesForm" }).exists()).toBe(
            true
        );
        expect(wrapper.findComponent({ name: "SettingsForm" }).exists()).toBe(
            true
        );
    });

    it("does not render a New Book accordion (the CTA lives on the dashboard instead)", () => {
        mockCanAdmin.mockReturnValueOnce(true);

        const wrapper = mount(OwnerPanel);

        expect(wrapper.findComponent({ name: "NewBookForm" }).exists()).toBe(
            false
        );
        expect(wrapper.text()).not.toContain("dashboard.new_book");
    });
});
