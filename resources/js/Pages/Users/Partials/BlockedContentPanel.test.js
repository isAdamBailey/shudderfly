import BlockedContentPanel from "@/Pages/Users/Partials/BlockedContentPanel.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, nextTick } from "vue";

global.route = (name) => `/${name}`;

let mockCanEditPages = false;
vi.mock("@/composables/permissions", () => ({
    usePermissions: () => ({
        canEditPages: computed(() => mockCanEditPages),
    }),
}));

const mockSpeak = vi.fn();
vi.mock("@/composables/useSpeechSynthesis", () => ({
    useSpeechSynthesis: () => ({ speak: mockSpeak, speaking: false }),
}));

const mockSetFlashMessage = vi.fn();
vi.mock("@/composables/useFlashMessage", () => ({
    useFlashMessage: () => ({ setFlashMessage: mockSetFlashMessage }),
}));

vi.mock("@/composables/useTranslations", () => ({
    useTranslations: () => ({
        // Keys carry no placeholder text here, so append the replacement
        // values to make them assertable.
        t: (key, replacements = {}) => {
            const values = Object.values(replacements);
            return values.length ? `${key} ${values.join(",")}` : key;
        },
    }),
}));

vi.mock("@inertiajs/vue3", () => ({
    router: { reload: vi.fn() },
    usePage: () => ({ props: { auth: { user: { id: 7 } } } }),
}));

const mockPost = vi.fn();
vi.mock("axios", () => ({
    default: {
        post: (...args) => mockPost(...args),
    },
}));

const mountPanel = (blockedCount = 3, unblockAskedToday = false) =>
    mount(BlockedContentPanel, { props: { blockedCount, unblockAskedToday } });

// The dialog's confirm button is the observable cooldown: it goes disabled
// once the user has asked today.
const confirmDisabledAfterClick = async (wrapper) => {
    await wrapper.find("button").trigger("click");
    await nextTick();

    return wrapper.findComponent({ name: "ConfirmDialog" });
};

// The requesting user confirms in a dialog; admins act immediately.
const clickAndConfirm = async (wrapper) => {
    await wrapper.find("button").trigger("click");
    await nextTick();
    const dialog = wrapper.findComponent({ name: "ConfirmDialog" });
    if (dialog.exists()) {
        dialog.vm.$emit("confirm");
    }
    await nextTick();
    await nextTick();
};

describe("BlockedContentPanel", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockCanEditPages = false;
        mockPost.mockResolvedValue({
            data: { message: "sent", sent: true },
        });
    });

    describe("role variants", () => {
        it("shows the request CTA for a user without edit pages", () => {
            const wrapper = mountPanel();

            expect(wrapper.text()).toContain("dashboard.request_unblock");
            expect(wrapper.text()).not.toContain(
                "dashboard.unlock_all_blocked_pages"
            );
        });

        it("shows the unblock-all button for a user with edit pages", () => {
            mockCanEditPages = true;
            const wrapper = mountPanel();

            expect(wrapper.text()).toContain(
                "dashboard.unlock_all_blocked_pages"
            );
            expect(wrapper.text()).not.toContain("dashboard.request_unblock");
        });

        it("asks for confirmation before unblocking for an edit-pages user", async () => {
            mockCanEditPages = true;
            mockPost.mockResolvedValue({ data: { message: "done" } });
            const wrapper = mountPanel();

            // A click alone must not unblock; only confirming the dialog does.
            await wrapper.find("button").trigger("click");
            await nextTick();
            expect(mockPost).not.toHaveBeenCalled();

            const dialog = wrapper.findComponent({ name: "ConfirmDialog" });
            expect(dialog.props("message")).toBe(
                "dashboard.unlock_all_confirm"
            );
            dialog.vm.$emit("confirm");
            await nextTick();
            await nextTick();

            expect(mockPost).toHaveBeenCalledWith(
                "/pages.unblock-all",
                {},
                expect.anything()
            );
        });
    });

    describe("requesting an unblock", () => {
        it("speaks the dialog's message and posts on confirm", async () => {
            const wrapper = mountPanel();

            await clickAndConfirm(wrapper);

            expect(mockSpeak).toHaveBeenCalledWith(
                "dashboard.request_unblock_confirm"
            );
            expect(mockPost).toHaveBeenCalledWith(
                "/unblock-requests.store",
                {},
                expect.anything()
            );
        });

        it("starts the cooldown after a successful send, without hiding the CTA", async () => {
            const wrapper = mountPanel();

            await clickAndConfirm(wrapper);

            expect(
                (await confirmDisabledAfterClick(wrapper)).props(
                    "confirmDisabled"
                )
            ).toBe(true);
            expect(wrapper.find("button").exists()).toBe(true);
        });

        it("does not start the cooldown when nothing was sent", async () => {
            mockPost.mockResolvedValue({
                data: { message: "nothing blocked", sent: false },
            });
            const wrapper = mountPanel();

            await clickAndConfirm(wrapper);

            expect(
                (await confirmDisabledAfterClick(wrapper)).props(
                    "confirmDisabled"
                )
            ).toBe(false);
        });

        it("starts the cooldown when the server says the day is used up", async () => {
            const err = new Error("already asked");
            err.response = { status: 429, data: { sent: false } };
            mockPost.mockRejectedValue(err);
            const wrapper = mountPanel();

            await clickAndConfirm(wrapper);

            expect(
                (await confirmDisabledAfterClick(wrapper)).props(
                    "confirmDisabled"
                )
            ).toBe(true);
            expect(wrapper.find("button").exists()).toBe(true);
        });

        it("does not start the cooldown for the route's rate-limit 429", async () => {
            // The abuse cap never created a request, so the day is untouched.
            const err = new Error("throttled");
            err.response = { status: 429, data: { message: "Too Many" } };
            mockPost.mockRejectedValue(err);
            const wrapper = mountPanel();

            await clickAndConfirm(wrapper);

            expect(
                (await confirmDisabledAfterClick(wrapper)).props(
                    "confirmDisabled"
                )
            ).toBe(false);
        });

        it("does not start the cooldown when the request fails", async () => {
            mockPost.mockRejectedValue(new Error("boom"));
            const wrapper = mountPanel();

            await clickAndConfirm(wrapper);

            expect(
                (await confirmDisabledAfterClick(wrapper)).props(
                    "confirmDisabled"
                )
            ).toBe(false);
            expect(mockSetFlashMessage).toHaveBeenCalledWith(
                "error",
                "dashboard.request_unblock_error"
            );
        });
    });

    describe("failure handling", () => {
        it("flashes an error when unblocking fails", async () => {
            mockCanEditPages = true;
            mockPost.mockRejectedValue(new Error("boom"));
            const wrapper = mountPanel();

            await clickAndConfirm(wrapper);

            expect(mockSetFlashMessage).toHaveBeenCalledWith(
                "error",
                "dashboard.request_unblock_error"
            );
        });

        it("flashes info, not success, when nothing was blocked", async () => {
            mockPost.mockResolvedValue({
                data: { message: "dashboard.blocked_none", sent: false },
            });
            const wrapper = mountPanel();

            await clickAndConfirm(wrapper);

            expect(mockSetFlashMessage).toHaveBeenCalledWith(
                "info",
                "dashboard.blocked_none"
            );
        });
    });

    describe("cooldown state", () => {
        it("keeps the CTA enabled when the server says the user has asked today", () => {
            const wrapper = mountPanel(3, true);

            expect(wrapper.find("button").exists()).toBe(true);
            expect(
                wrapper.find("button").attributes("disabled")
            ).toBeUndefined();
        });

        it("tells the user they already asked and disables the dialog's confirm button, without posting again", async () => {
            const wrapper = mountPanel(3, true);

            const dialog = await confirmDisabledAfterClick(wrapper);

            expect(dialog.props("message")).toBe(
                "dashboard.request_unblock_already_asked"
            );
            expect(dialog.props("confirmDisabled")).toBe(true);
            expect(mockSpeak).toHaveBeenCalledWith(
                "dashboard.request_unblock_already_asked"
            );
            expect(mockPost).not.toHaveBeenCalled();
        });

        it("offers the CTA when the server says the user has not asked today", () => {
            const wrapper = mountPanel();

            expect(wrapper.find("button").exists()).toBe(true);
            expect(
                wrapper.find("button").attributes("disabled")
            ).toBeUndefined();
            expect(wrapper.find("button").attributes("title")).toBe(
                "dashboard.request_unblock_limit"
            );
        });

        it("disables the CTA when nothing is blocked", () => {
            const wrapper = mountPanel(0, true);

            expect(wrapper.find("button").attributes("disabled")).toBeDefined();
            expect(wrapper.find("button").attributes("title")).toBe(
                "dashboard.blocked_none"
            );
        });
    });
});
