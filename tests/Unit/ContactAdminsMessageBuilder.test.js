import { describe, it, expect, beforeEach, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";
import { nextTick } from "vue";

// Mocks for composables and router
vi.mock("@/composables/useDisableButtonState", () => ({
    useButtonState: () => ({
        buttonsDisabled: { value: false },
        setTimestamp: vi.fn(),
    }),
}));
vi.mock("@/composables/useSpeechSynthesis", () => ({
    useSpeechSynthesis: () => ({ speak: vi.fn(), speaking: { value: false } }),
}));
vi.mock("@inertiajs/vue3", () => ({ router: { post: vi.fn() } }));

import ContactAdminsMessageBuilder from "@/Pages/Profile/Partials/ContactAdminsMessageBuilder.vue";

const FAVORITES_KEY = "contact_builder_favorites_v1";

describe("ContactAdminsMessageBuilder - favorites", () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it("loads favorites from localStorage on mount", async () => {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(["hello world"]));
        const wrapper = shallowMount(ContactAdminsMessageBuilder, {
            global: {
                components: {
                    Button: { template: "<button><slot/></button>" },
                },
            },
        });

        // wait next tick for onMounted
        await nextTick();

        // favorite button should exist with title "hello world"
        const favBtn = wrapper.find(`button[title="hello world"]`);
        expect(favBtn.exists()).toBe(true);
    });

    it("saves current message to favorites when clicking save", async () => {
        const wrapper = shallowMount(ContactAdminsMessageBuilder, {
            global: {
                components: {
                    Button: { template: "<button><slot/></button>" },
                },
            },
        });

        // click a subject word (there are buttons with text like "I")
        const subjectBtn = wrapper
            .findAll("button")
            .find((b) => b.text().trim() === "I");
        expect(subjectBtn).toBeTruthy();
        await subjectBtn.trigger("click");

        // click save favorite (button with aria-label "Save favorite")
        const saveBtn = wrapper.find('button[aria-label="Save favorite"]');
        expect(saveBtn.exists()).toBe(true);
        await saveBtn.trigger("click");

        // localStorage should now contain the favorite "I"
        const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
        expect(stored).toContain("I");

        // rendered favorite apply button should exist
        const favApply = wrapper.find(`button[title="I"]`);
        expect(favApply.exists()).toBe(true);
    });

    it("removes a favorite when remove button clicked", async () => {
        localStorage.setItem(
            FAVORITES_KEY,
            JSON.stringify(["a favorite", "other"])
        );
        const wrapper = shallowMount(ContactAdminsMessageBuilder, {
            global: {
                components: {
                    Button: { template: "<button><slot/></button>" },
                },
            },
        });

        await nextTick();

        // stub global confirm so jsdom doesn't throw
        vi.stubGlobal("confirm", () => true);

        // remove button has aria-label `Remove favorite: a favorite`
        const removeBtn = wrapper.find(
            `button[aria-label="Remove favorite: a favorite"]`
        );
        expect(removeBtn.exists()).toBe(true);
        await removeBtn.trigger("click");
        await nextTick();

        const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
        expect(stored).toEqual(["other"]);

        // apply button for a favorite should no longer exist
        const gone = wrapper.find(`button[title="a favorite"]`);
        expect(gone.exists()).toBe(false);
    });
});
