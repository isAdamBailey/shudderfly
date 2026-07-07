import OwnerPanel from "@/Pages/Users/Partials/OwnerPanel.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

const mockCanAdmin = vi.hoisted(() => vi.fn(() => false));
const mockCanEditPages = vi.hoisted(() => vi.fn(() => false));
const mockAxiosPost = vi.hoisted(() =>
    vi.fn(() => Promise.resolve({ data: { message: "Unblocked!" } }))
);
const mockSetFlashMessage = vi.hoisted(() => vi.fn());
const mockRouterReload = vi.hoisted(() => vi.fn());

vi.mock("axios", () => ({
    default: { post: mockAxiosPost },
}));

vi.mock("@inertiajs/vue3", () => ({
    router: { reload: mockRouterReload },
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

vi.mock("@/composables/useFlashMessage", () => ({
    useFlashMessage: () => ({ setFlashMessage: mockSetFlashMessage }),
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

vi.mock("@/Pages/Profile/Partials/AvatarSelectionForm.vue", () => ({
    default: {
        name: "AvatarSelectionForm",
        template: "<div class='avatar-form' />",
    },
}));
vi.mock("@/Pages/Profile/Partials/VoiceSettingsForm.vue", () => ({
    default: {
        name: "VoiceSettingsForm",
        template: "<div class='voice-form' />",
    },
}));
vi.mock("@/Components/NotificationToggle.vue", () => ({
    default: {
        name: "NotificationToggle",
        template: "<div class='notification-toggle' />",
    },
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
        const wrapper = mount(OwnerPanel, {
            props: { blockedCount: 0 },
        });

        expect(wrapper.text()).toContain("Avatar");
        expect(wrapper.text()).toContain("Voice Settings");
        expect(wrapper.text()).toContain("Notification Settings");
        expect(wrapper.text()).toContain("Clocks");
        expect(wrapper.text()).toContain("Users");
        expect(wrapper.text()).toContain("Site Statistics");
    });

    it("hides the Administration section when the user has neither permission", () => {
        mockCanAdmin.mockReturnValueOnce(false);
        mockCanEditPages.mockReturnValueOnce(false);

        const wrapper = mount(OwnerPanel, {
            props: { blockedCount: 0 },
        });

        expect(wrapper.text()).not.toContain("Administration");
        expect(wrapper.text()).not.toContain("dashboard.unblock");
        expect(wrapper.text()).not.toContain("Categories");
        expect(wrapper.text()).not.toContain("Site Settings");
    });

    it("shows only the Unblock accordion for canEditPages users", () => {
        mockCanAdmin.mockReturnValueOnce(false);
        mockCanEditPages.mockReturnValueOnce(true);

        const wrapper = mount(OwnerPanel, {
            props: { blockedCount: 3 },
        });

        expect(wrapper.text()).toContain("Administration");
        expect(wrapper.text()).toContain("dashboard.unblock");
        expect(wrapper.text()).toContain("dashboard.blocked_pages_count");
        expect(wrapper.text()).not.toContain("Categories");
        expect(wrapper.findComponent({ name: "CategoriesForm" }).exists()).toBe(
            false
        );
        expect(wrapper.findComponent({ name: "SettingsForm" }).exists()).toBe(
            false
        );
    });

    it("shows Categories and Site Settings accordions for admins", () => {
        mockCanAdmin.mockReturnValueOnce(true);
        mockCanEditPages.mockReturnValueOnce(false);

        const wrapper = mount(OwnerPanel, {
            props: {
                blockedCount: 0,
                categories: [{ id: 1, name: "Fiction" }],
            },
        });

        expect(wrapper.text()).not.toContain("dashboard.unblock");
        expect(wrapper.findComponent({ name: "CategoriesForm" }).exists()).toBe(
            true
        );
        expect(wrapper.findComponent({ name: "SettingsForm" }).exists()).toBe(
            true
        );
    });

    it("does not render a New Book accordion (the CTA lives on the dashboard instead)", () => {
        mockCanAdmin.mockReturnValueOnce(true);
        mockCanEditPages.mockReturnValueOnce(true);

        const wrapper = mount(OwnerPanel, {
            props: { blockedCount: 0 },
        });

        expect(wrapper.findComponent({ name: "NewBookForm" }).exists()).toBe(
            false
        );
        expect(wrapper.text()).not.toContain("dashboard.new_book");
    });

    it("posts to unblock-all and reloads blockedCount when the unblock button is clicked", async () => {
        mockCanEditPages.mockReturnValueOnce(true);

        const wrapper = mount(OwnerPanel, {
            props: { blockedCount: 2 },
        });

        const button = wrapper
            .findAll("button")
            .find((b) =>
                b.text().includes("dashboard.unlock_all_blocked_pages")
            );
        expect(button).toBeTruthy();

        await button.trigger("click");
        await Promise.resolve();

        expect(mockAxiosPost).toHaveBeenCalledWith(
            "pages.unblock-all",
            {},
            { headers: { Accept: "application/json" } }
        );
        expect(mockSetFlashMessage).toHaveBeenCalledWith(
            "success",
            "Unblocked!"
        );
        expect(mockRouterReload).toHaveBeenCalledWith(
            expect.objectContaining({ only: ["blockedCount"] })
        );
    });
});
