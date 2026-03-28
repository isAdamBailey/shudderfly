import AddToCollageButton from "@/Components/AddToCollageButton.vue";
import { useForm } from "@inertiajs/vue3";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

global.route = (name) => `/${name}`;

// Mock the constants
vi.mock("@/constants/collage", () => ({
    MAX_COLLAGE_PAGES: 10,
}));

// Mock the speech synthesis composable
let mockSpeak = vi.fn();
vi.mock("@/composables/useSpeechSynthesis", () => ({
    useSpeechSynthesis: () => ({
        speak: mockSpeak,
        speaking: false,
    }),
}));

vi.mock("@/composables/useTranslations", () => ({
    useTranslations: () => ({
        t: (key, replacements = {}) => {
            const map = {
                "page.collage_select_placeholder": "Select collage",
                "page.collage_all_full": "All collages are full",
                "page.collage_option_label": "Collage #:number:",
                "page.collage_add_button": "Add to Collage",
                "page.collage_add_success":
                    "Page successfully added to collage!",
                "page.collage_confirm_speak_single":
                    "Are you sure you want to add this page to collage:",
                "page.collage_confirm_speak_choice":
                    "Are you sure you want to add this page to collage #:number:",
                "page.collage_confirm_dialog_single":
                    "Are you sure you want to add this page to collage?",
                "page.collage_confirm_dialog_choice":
                    "Are you sure you want to add this page to collage #:number?",
            };
            let translation = map[key] || key;
            Object.keys(replacements).forEach((placeholder) => {
                translation = translation.replace(
                    new RegExp(`:${placeholder}`, "g"),
                    String(replacements[placeholder])
                );
            });
            return translation;
        },
    }),
}));

describe("AddToCollageButton", () => {
    let wrapper;
    let mockForm;

    const createMockForm = () => ({
        collage_id: null,
        page_id: 1,
        data: { collage_id: null, page_id: 1 },
        errors: {},
        processing: false,
        post: vi.fn(),
        reset: vi.fn(),
    });

    const createCollages = (overrides = []) => {
        const defaultCollages = [
            { id: 1, pages: [], is_archived: false, is_locked: false },
            { id: 2, pages: [], is_archived: false, is_locked: false },
            { id: 3, pages: [], is_archived: false, is_locked: false },
        ];

        return defaultCollages.map((collage, index) => ({
            ...collage,
            ...(overrides[index] || {}),
        }));
    };

    beforeEach(() => {
        mockForm = createMockForm();
        useForm.mockReturnValue(mockForm);
        mockSpeak.mockClear();
        mockSpeak.mockImplementation((phrase, onComplete) => {
            onComplete?.();
        });
        vi.spyOn(window, "confirm").mockReturnValue(true);
    });

    describe("Page already in collage", () => {
        it("shows message without number when only one collage exists", () => {
            const collages = [
                { id: 1, pages: [{ id: 1 }], is_archived: false, is_locked: false },
            ];

            wrapper = mount(AddToCollageButton, {
                props: {
                    pageId: 1,
                    collages,
                },
            });

            expect(wrapper.text()).toContain("This picture is in collage");
            expect(wrapper.text()).not.toMatch(/#\d/);
            expect(wrapper.find("select").exists()).toBe(false);
            expect(wrapper.text()).not.toContain("Add to collage:");
        });

        it("shows collage number when page is in a collage among several", () => {
            const collages = createCollages([
                { id: 1, pages: [{ id: 1 }], is_archived: false },
                { id: 2, pages: [], is_archived: false },
                { id: 3, pages: [], is_archived: false },
            ]);

            wrapper = mount(AddToCollageButton, {
                props: {
                    pageId: 1,
                    collages,
                },
            });

            expect(wrapper.text()).toContain("This picture is in collage");
            expect(wrapper.text()).toContain("#1");
            expect(wrapper.find("select").exists()).toBe(false);
        });

        it("shows message when page is in multiple collages", () => {
            const collages = createCollages([
                { id: 1, pages: [{ id: 1 }], is_archived: false },
                { id: 2, pages: [{ id: 1 }], is_archived: false },
            ]);

            wrapper = mount(AddToCollageButton, {
                props: {
                    pageId: 1,
                    collages,
                },
            });

            expect(wrapper.text()).toContain("This picture is in collage");
            expect(wrapper.text()).toContain("#1");
            expect(wrapper.text()).toContain("#2");
            const normalized = wrapper.text().replace(/\s+/g, "");
            expect(normalized).toContain("#1,#2");
        });

        it("does not show message when page is only in archived collages", () => {
            const collages = [
                {
                    id: 1,
                    pages: [{ id: 1 }],
                    is_archived: true,
                    is_locked: false,
                },
            ];

            wrapper = mount(AddToCollageButton, {
                props: {
                    pageId: 1,
                    collages,
                },
            });

            expect(wrapper.text()).not.toMatch(/This picture is in collage/);
            // Since the archived collage is filtered out, there are no available collages,
            // so no select should be shown either
            expect(wrapper.find("select").exists()).toBe(false);
        });
    });

    describe("Single collage auto-selection", () => {
        it("hides select dropdown when only one collage is available", () => {
            const collages = [
                { id: 1, pages: [], is_archived: false, is_locked: false },
            ];

            wrapper = mount(AddToCollageButton, {
                props: {
                    pageId: 1,
                    collages,
                },
            });

            expect(wrapper.find("select").exists()).toBe(false);
            expect(wrapper.text()).toContain("Add to Collage");
            expect(wrapper.text()).not.toMatch(/Add to Collage #/);
        });

        it("shows add button without collage number when only one collage", () => {
            const collages = [
                { id: 5, pages: [], is_archived: false, is_locked: false },
            ];

            wrapper = mount(AddToCollageButton, {
                props: {
                    pageId: 1,
                    collages,
                },
            });

            const addButton = wrapper
                .findAll("button")
                .find((btn) => btn.text().includes("Add to Collage"));
            expect(addButton.text().trim()).toBe("Add to Collage");
        });

        it("enables button when only one collage is available", () => {
            const collages = [
                { id: 1, pages: [], is_archived: false, is_locked: false },
            ];

            wrapper = mount(AddToCollageButton, {
                props: {
                    pageId: 1,
                    collages,
                },
            });

            const addButton = wrapper
                .findAll("button")
                .find((btn) => btn.text().includes("Add to Collage"));
            expect(addButton.attributes("disabled")).toBeUndefined();
        });

        it("automatically sets collage_id when single collage button is clicked", async () => {
            const collages = [
                { id: 3, pages: [], is_archived: false, is_locked: false },
            ];

            wrapper = mount(AddToCollageButton, {
                props: {
                    pageId: 1,
                    collages,
                },
            });

            const addButton = wrapper
                .findAll("button")
                .find((btn) => btn.text().includes("Add to Collage"));
            await addButton.trigger("click");

            expect(mockForm.post).toHaveBeenCalledWith("/collage-page.store", {
                preserveScroll: true,
                onSuccess: expect.any(Function),
            });
            // The form should have been updated with the collage ID before posting
            expect(mockForm.collage_id).toBe(3);
        });

        it("ignores locked collages when determining single collage scenario", () => {
            const collages = [
                { id: 1, pages: [], is_archived: false, is_locked: true },
                { id: 2, pages: [], is_archived: false, is_locked: false },
            ];

            wrapper = mount(AddToCollageButton, {
                props: {
                    pageId: 1,
                    collages,
                },
            });

            expect(wrapper.find("select").exists()).toBe(false);
            expect(wrapper.text()).toContain("Add to Collage");
            expect(wrapper.text()).not.toMatch(/Add to Collage #/);
        });
    });

    describe("Collage selection", () => {
        it("shows select dropdown when multiple collages are available", () => {
            const collages = createCollages();

            wrapper = mount(AddToCollageButton, {
                props: {
                    pageId: 1,
                    collages,
                },
            });

            expect(wrapper.find("select").exists()).toBe(true);
            expect(wrapper.find("option[value='null']").text()).toBe(
                "Select collage"
            );
        });

        it("shows generic button text when multiple collages are available", () => {
            const collages = createCollages();

            wrapper = mount(AddToCollageButton, {
                props: {
                    pageId: 1,
                    collages,
                },
            });

            const addButton = wrapper
                .findAll("button")
                .find((btn) => btn.text().includes("Add to Collage"));
            expect(addButton.text()).toBe("Add to Collage");
        });

        it("disables full collages in dropdown", () => {
            const collages = [
                {
                    id: 1,
                    pages: Array(10).fill({ id: 2 }),
                    is_archived: false,
                    is_locked: false,
                },
                { id: 2, pages: [], is_archived: false, is_locked: false },
            ];

            wrapper = mount(AddToCollageButton, {
                props: {
                    pageId: 1,
                    collages,
                },
            });

            const options = wrapper.findAll("option");
            expect(options.length).toBeGreaterThanOrEqual(3);
            expect(options[1].attributes("disabled")).toBeDefined();
            expect(options[1].text()).toContain("(Full)");
            expect(options[2].attributes("disabled")).toBeUndefined();
        });

        it("disables entire select when all collages are full", () => {
            const collages = [
                {
                    id: 1,
                    pages: Array(10).fill({ id: 2 }),
                    is_archived: false,
                    is_locked: false,
                },
                {
                    id: 2,
                    pages: Array(10).fill({ id: 2 }),
                    is_archived: false,
                    is_locked: false,
                },
            ];

            wrapper = mount(AddToCollageButton, {
                props: {
                    pageId: 1,
                    collages,
                },
            });

            const select = wrapper.find("select");
            expect(select.exists()).toBe(true);
            expect(select.attributes("disabled")).toBeDefined();
            expect(wrapper.find("option[value='null']").text()).toBe(
                "All collages are full"
            );
        });

        it("ignores archived and locked collages when checking availability", () => {
            const collages = [
                {
                    id: 1,
                    pages: Array(10).fill({ id: 2 }),
                    is_archived: true,
                    is_locked: false,
                },
                {
                    id: 2,
                    pages: Array(10).fill({ id: 2 }),
                    is_archived: false,
                    is_locked: true,
                },
                { id: 3, pages: [], is_archived: false, is_locked: false },
            ];

            wrapper = mount(AddToCollageButton, {
                props: {
                    pageId: 1,
                    collages,
                },
            });

            // Should show single collage behavior since only collage 3 is available
            expect(wrapper.find("select").exists()).toBe(false);
            expect(wrapper.text()).toContain("Add to Collage");
            expect(wrapper.text()).not.toMatch(/Add to Collage #/);
        });
    });

    describe("Add to collage functionality", () => {
        it("disables button when no collage is selected in multi-collage scenario", () => {
            const collages = createCollages();

            wrapper = mount(AddToCollageButton, {
                props: {
                    pageId: 1,
                    collages,
                },
            });

            const addButton = wrapper
                .findAll("button")
                .find((btn) => btn.text().includes("Add to Collage"));
            expect(addButton.attributes("disabled")).toBeDefined();
        });

        it("disables button when all collages are full", () => {
            const collages = [
                {
                    id: 1,
                    pages: Array(10).fill({ id: 2 }),
                    is_archived: false,
                    is_locked: false,
                },
                {
                    id: 2,
                    pages: Array(10).fill({ id: 2 }),
                    is_archived: false,
                    is_locked: false,
                },
            ];

            wrapper = mount(AddToCollageButton, {
                props: {
                    pageId: 1,
                    collages,
                },
            });

            const addButton = wrapper
                .findAll("button")
                .find((btn) => btn.text().includes("Add to Collage"));
            expect(addButton.attributes("disabled")).toBeDefined();
        });

        it("enables button when collage is selected and available", async () => {
            const collages = createCollages();

            wrapper = mount(AddToCollageButton, {
                props: {
                    pageId: 1,
                    collages,
                },
            });

            await wrapper.find("select").setValue(1);

            const addButton = wrapper
                .findAll("button")
                .find((btn) => btn.text().includes("Add to Collage"));
            expect(addButton.attributes("disabled")).toBeUndefined();
        });

        it("submits form when add button is clicked with selected collage", async () => {
            const collages = createCollages();

            wrapper = mount(AddToCollageButton, {
                props: {
                    pageId: 1,
                    collages,
                },
            });

            const select = wrapper.find("select");
            await select.setValue(1);
            await nextTick();

            const button = wrapper
                .findAll("button")
                .find((btn) => btn.text().includes("Add to Collage"));
            await button.trigger("click");

            expect(mockForm.post).toHaveBeenCalledWith("/collage-page.store", {
                preserveScroll: true,
                onSuccess: expect.any(Function),
            });
        });

        it("shows success message after successful submission", async () => {
            const collages = createCollages();

            wrapper = mount(AddToCollageButton, {
                props: {
                    pageId: 1,
                    collages,
                },
            });

            await wrapper.find("select").setValue(1);
            await nextTick();

            const button = wrapper
                .findAll("button")
                .find((btn) => btn.text().includes("Add to Collage"));
            await button.trigger("click");

            expect(mockForm.post).toHaveBeenCalled();
            const onSuccessCallback = mockForm.post.mock.calls[0][1].onSuccess;
            onSuccessCallback();
            await nextTick();

            expect(wrapper.text()).toContain(
                "Page successfully added to collage!"
            );
            expect(mockForm.reset).toHaveBeenCalled();
        });

        it("hides success message after 3 seconds", async () => {
            vi.useFakeTimers();

            const collages = createCollages();

            wrapper = mount(AddToCollageButton, {
                props: {
                    pageId: 1,
                    collages,
                },
            });

            await wrapper.find("select").setValue(1);
            await nextTick();
            const button = wrapper
                .findAll("button")
                .find((btn) => btn.text().includes("Add to Collage"));
            await button.trigger("click");

            expect(mockForm.post).toHaveBeenCalled();
            const onSuccessCallback = mockForm.post.mock.calls[0][1].onSuccess;
            onSuccessCallback();
            await nextTick();

            expect(wrapper.text()).toContain(
                "Page successfully added to collage!"
            );

            vi.advanceTimersByTime(3000);
            await nextTick();

            expect(wrapper.text()).not.toContain(
                "Page successfully added to collage!"
            );

            vi.useRealTimers();
        });

        it("resets success message when collage selection changes", async () => {
            const collages = createCollages();

            wrapper = mount(AddToCollageButton, {
                props: {
                    pageId: 1,
                    collages,
                },
            });

            await wrapper.find("select").setValue(1);
            await nextTick();
            const button = wrapper
                .findAll("button")
                .find((btn) => btn.text().includes("Add to Collage"));
            await button.trigger("click");

            expect(mockForm.post).toHaveBeenCalled();
            const onSuccessCallback = mockForm.post.mock.calls[0][1].onSuccess;
            onSuccessCallback();
            await nextTick();

            expect(wrapper.text()).toContain(
                "Page successfully added to collage!"
            );

            // Change selection
            await wrapper.find("select").setValue(2);
            await nextTick();

            expect(wrapper.text()).not.toContain(
                "Page successfully added to collage!"
            );
        });
    });

    describe("Confirm before add", () => {
        it("speaks confirmation phrase for single collage before posting", async () => {
            const collages = [
                { id: 1, pages: [], is_archived: false, is_locked: false },
            ];

            wrapper = mount(AddToCollageButton, {
                props: {
                    pageId: 1,
                    collages,
                },
            });

            const addButton = wrapper
                .findAll("button")
                .find((btn) => btn.text().includes("Add to Collage"));
            await addButton.trigger("click");
            await nextTick();

            expect(mockSpeak).toHaveBeenCalledWith(
                "Are you sure you want to add this page to collage:",
                expect.any(Function)
            );
            expect(mockForm.post).toHaveBeenCalled();
        });

        it("speaks confirmation with collage number when multiple collages", async () => {
            const collages = createCollages();

            wrapper = mount(AddToCollageButton, {
                props: {
                    pageId: 1,
                    collages,
                },
            });

            await wrapper.find("select").setValue(1);
            await nextTick();

            const addButton = wrapper
                .findAll("button")
                .find((btn) => btn.text().includes("Add to Collage"));
            await addButton.trigger("click");
            await nextTick();

            expect(mockSpeak).toHaveBeenCalledWith(
                "Are you sure you want to add this page to collage #1:",
                expect.any(Function)
            );
            expect(mockForm.post).toHaveBeenCalled();
        });
    });

    describe("Collage display number calculation", () => {
        it("calculates display numbers correctly based on array index", () => {
            const collages = [
                { id: 5, pages: [], is_archived: false, is_locked: false },
                { id: 3, pages: [], is_archived: false, is_locked: false },
                { id: 1, pages: [], is_archived: false, is_locked: false },
            ];

            wrapper = mount(AddToCollageButton, {
                props: {
                    pageId: 1,
                    collages,
                },
            });

            const options = wrapper.findAll("option");
            // First option is the placeholder, so check the actual collage options
            expect(options[1].text()).toContain("Collage #1"); // collage id 5, index 0
            expect(options[2].text()).toContain("Collage #2"); // collage id 3, index 1
            expect(options[3].text()).toContain("Collage #3"); // collage id 1, index 2
        });
    });
});
