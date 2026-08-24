import BlockedContentPanel from "@/Pages/Users/Partials/BlockedContentPanel.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, nextTick } from "vue";

global.route = (name) => `/${name}`;

const HOUR_MS = 60 * 60 * 1000;

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

// Cooldown is scoped per user so a shared device doesn't lock out the next login.
const STORAGE_KEY = "unblockRequestedAt:7";

const mockPost = vi.fn();
vi.mock("axios", () => ({
    default: {
        post: (...args) => mockPost(...args),
    },
}));

const mountPanel = (blockedCount = 3) =>
    mount(BlockedContentPanel, { props: { blockedCount } });

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
        localStorage.clear();
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

        it("unblocks without a confirm dialog for an edit-pages user", async () => {
            mockCanEditPages = true;
            mockPost.mockResolvedValue({ data: { message: "done" } });
            const wrapper = mountPanel();

            // Admins never get a confirm step: the click alone unblocks.
            await wrapper.find("button").trigger("click");
            await nextTick();

            expect(mockPost).toHaveBeenCalledWith(
                "/pages.unblock-all",
                {},
                expect.anything()
            );
        });
    });

    describe("requesting an unblock", () => {
        it("speaks the prompt and posts on confirm", async () => {
            const wrapper = mountPanel();

            await clickAndConfirm(wrapper);

            expect(mockSpeak).toHaveBeenCalledWith(
                "dashboard.request_unblock_speak 3"
            );
            expect(mockPost).toHaveBeenCalledWith(
                "/unblock-requests.store",
                {},
                expect.anything()
            );
        });

        it("starts the cooldown only after a successful send", async () => {
            const wrapper = mountPanel();

            await clickAndConfirm(wrapper);

            expect(Number(localStorage.getItem(STORAGE_KEY))).toBeGreaterThan(
                0
            );
            expect(wrapper.find("button").attributes("disabled")).toBeDefined();
        });

        it("does not start the cooldown when nothing was sent", async () => {
            mockPost.mockResolvedValue({
                data: { message: "nothing blocked", sent: false },
            });
            const wrapper = mountPanel();

            await clickAndConfirm(wrapper);

            expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
        });

        it("starts the cooldown and reports a sane countdown on a 429", async () => {
            const err = new Error("throttled");
            err.response = { status: 429 };
            mockPost.mockRejectedValue(err);
            const wrapper = mountPanel();

            await clickAndConfirm(wrapper);

            expect(Number(localStorage.getItem(STORAGE_KEY))).toBeGreaterThan(
                0
            );
            // `now` must be refreshed alongside `requestedAt`; otherwise the
            // countdown is measured from mount time and reports nonsense.
            expect(wrapper.text()).toContain(
                "dashboard.request_unblock_already"
            );
            expect(wrapper.text()).toMatch(/\b60\b/);
        });

        it("does not start the cooldown when the request fails", async () => {
            mockPost.mockRejectedValue(new Error("429"));
            const wrapper = mountPanel();

            await clickAndConfirm(wrapper);

            expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
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
        it("disables the CTA when the last request was under an hour ago", () => {
            localStorage.setItem(
                STORAGE_KEY,
                String(Date.now() - 10 * 60 * 1000)
            );
            const wrapper = mountPanel();

            expect(wrapper.find("button").attributes("disabled")).toBeDefined();
            expect(wrapper.text()).toContain(
                "dashboard.request_unblock_already"
            );
        });

        it("re-enables the CTA once the hour has passed", () => {
            localStorage.setItem(
                STORAGE_KEY,
                String(Date.now() - HOUR_MS - 1000)
            );
            const wrapper = mountPanel();

            expect(
                wrapper.find("button").attributes("disabled")
            ).toBeUndefined();
            expect(wrapper.text()).toContain("dashboard.request_unblock_limit");
        });

        it("disables the CTA and clears storage when nothing is blocked", () => {
            localStorage.setItem(STORAGE_KEY, String(Date.now()));
            const wrapper = mountPanel(0);

            expect(wrapper.find("button").attributes("disabled")).toBeDefined();
            expect(wrapper.text()).toContain("dashboard.blocked_none");
            expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
        });

        it("still renders when localStorage throws", () => {
            const spy = vi
                .spyOn(Storage.prototype, "getItem")
                .mockImplementation(() => {
                    throw new Error("denied");
                });

            expect(() => mountPanel()).not.toThrow();

            spy.mockRestore();
        });
    });
});
