import AddToCollageButton from "@/Components/AddToCollageButton.vue";
import { useForm } from "@inertiajs/vue3";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, nextTick } from "vue";

global.route = (name) => `/${name}`;

vi.mock("@/composables/useCollageMaxPages", () => ({
    useCollageMaxPages: () => computed(() => 10),
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
                "common.cancel": "Cancel",
                "common.ok": "OK",
                "page.collage_select_placeholder": "Select collage",
                "page.collage_option_label": "Collage #:number:",
                "page.collage_full_suffix": " (Full)",
                "page.collage_locked_suffix": " (Locked)",
                "page.collage_add_button": "Add to Collage",
                "page.collage_add_success":
                    "Page successfully added to collage!",
                "page.collage_replace_modal_title": "Choose a picture to replace",
                "page.collage_replace_pick_speak":
                    "What picture do you want to remove?",
                "page.collage_replace_confirm_speak":
                    "Are you sure you want to change pictures?",
                "page.collage_replace_confirm_dialog":
                    "Are you sure you want to change pictures?",
                "page.collage_confirm_speak_single": "Add this to the collage?",
                "page.collage_confirm_speak_choice":
                    "Add this to collage :number?",
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
        replace_page_id: null,
        data: { collage_id: null, page_id: 1, replace_page_id: null },
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
    });

    async function clickConfirmDialogOk() {
        await nextTick();
        const okBtn = Array.from(document.querySelectorAll("button")).find(
            (b) => b.textContent.trim() === "OK"
        );
        expect(okBtn).toBeDefined();
        await okBtn.click();
        await nextTick();
    }

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
            await clickConfirmDialogOk();

            expect(mockForm.post).toHaveBeenCalledWith("/collage-page.store", {
                preserveScroll: true,
                onSuccess: expect.any(Function),
            });
            expect(mockForm.collage_id).toBe(3);
        });

        it("opens replace modal when single collage is full instead of posting", async () => {
            const attachEl = document.createElement("div");
            document.body.appendChild(attachEl);

            const pages = Array(10)
                .fill(null)
                .map((_, i) => ({
                    id: 50 + i,
                    media_path: "https://example.com/a.webp",
                    content: "",
                }));
            const collages = [
                { id: 3, pages, is_archived: false, is_locked: false },
            ];

            wrapper = mount(AddToCollageButton, {
                props: {
                    pageId: 1,
                    collages,
                },
                attachTo: attachEl,
            });

            const addButton = wrapper
                .findAll("button")
                .find((btn) => btn.text().includes("Add to Collage"));
            await addButton.trigger("click");
            await nextTick();

            expect(mockForm.post).not.toHaveBeenCalled();
            expect(document.body.textContent).toContain(
                "Choose a picture to replace"
            );

            wrapper.unmount();
            attachEl.remove();
        });

        it("shows select when locked and unlocked collages are both available", () => {
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

            expect(wrapper.find("select").exists()).toBe(true);
            expect(wrapper.text()).toContain("Add to Collage");
            expect(wrapper.text()).toContain("(Locked)");
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

        it("allows selecting full collages in dropdown", () => {
            const collages = [
                {
                    id: 1,
                    pages: Array(10)
                        .fill(null)
                        .map((_, i) => ({ id: 200 + i })),
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
            expect(options[1].attributes("disabled")).toBeUndefined();
            expect(options[1].text()).toContain("(Full)");
            expect(options[2].attributes("disabled")).toBeUndefined();
        });

        it("keeps select enabled when all collages are full", () => {
            const collages = [
                {
                    id: 1,
                    pages: Array(10)
                        .fill(null)
                        .map((_, i) => ({ id: 200 + i })),
                    is_archived: false,
                    is_locked: false,
                },
                {
                    id: 2,
                    pages: Array(10)
                        .fill(null)
                        .map((_, i) => ({ id: 300 + i })),
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
            expect(select.attributes("disabled")).toBeUndefined();
            expect(wrapper.find("option[value='null']").text()).toBe(
                "Select collage"
            );
        });

        it("excludes archived collages but includes locked collages in the dropdown", () => {
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

            expect(wrapper.find("select").exists()).toBe(true);
            expect(wrapper.text()).toContain("Add to Collage");
            expect(wrapper.text()).toContain("(Locked)");
            expect(wrapper.text()).toContain("(Full)");
        });
    });

    describe("Add to collage functionality", () => {
        it("uses first collage when add is clicked without selecting in multi-collage scenario", async () => {
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
            expect(addButton.attributes("disabled")).toBeUndefined();
            await addButton.trigger("click");
            await nextTick();
            await clickConfirmDialogOk();
            expect(mockForm.post).toHaveBeenCalled();
            expect(mockForm.collage_id).toBe(1);
        });

        it("resolves collage when select value is string and id is number (locked full)", async () => {
            const pages = Array(10)
                .fill(null)
                .map((_, i) => ({ id: 50 + i, content: "" }));
            const collages = [
                {
                    id: 1,
                    pages,
                    is_archived: false,
                    is_locked: true,
                },
                { id: 2, pages: [], is_archived: false, is_locked: false },
            ];

            wrapper = mount(AddToCollageButton, {
                props: {
                    pageId: 99,
                    collages,
                },
            });

            const select = wrapper.find("select");
            await select.setValue("1");
            await nextTick();

            const addButton = wrapper
                .findAll("button")
                .find((btn) => btn.text().includes("Add to Collage"));
            expect(addButton.attributes("disabled")).toBeUndefined();
        });

        it("enables add button when a full collage is selected", async () => {
            const collages = [
                {
                    id: 1,
                    pages: Array(10)
                        .fill(null)
                        .map((_, i) => ({ id: 200 + i })),
                    is_archived: false,
                    is_locked: false,
                },
                {
                    id: 2,
                    pages: Array(10)
                        .fill(null)
                        .map((_, i) => ({ id: 300 + i })),
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

            await wrapper.find("select").setValue(1);
            await nextTick();

            const addButton = wrapper
                .findAll("button")
                .find((btn) => btn.text().includes("Add to Collage"));
            expect(addButton.attributes("disabled")).toBeUndefined();
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
            await clickConfirmDialogOk();

            expect(mockForm.post).toHaveBeenCalledWith("/collage-page.store", {
                preserveScroll: true,
                onSuccess: expect.any(Function),
            });
        });

        it("calls reset on successful submission", async () => {
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
            await clickConfirmDialogOk();

            expect(mockForm.post).toHaveBeenCalled();
            const onSuccessCallback = mockForm.post.mock.calls[0][1].onSuccess;
            onSuccessCallback();
            await nextTick();

            expect(mockForm.reset).toHaveBeenCalled();
        });
    });

    describe("Replace when collage is full", () => {
        it("posts with replace_page_id after picking a page from the modal", async () => {
            const attachEl = document.createElement("div");
            document.body.appendChild(attachEl);

            const pages = Array(10)
                .fill(null)
                .map((_, i) => ({
                    id: 50 + i,
                    media_path: "https://example.com/a.webp",
                    content: "Hello",
                }));
            const collages = [
                { id: 3, pages, is_archived: false, is_locked: false },
            ];

            wrapper = mount(AddToCollageButton, {
                props: {
                    pageId: 1,
                    collages,
                },
                attachTo: attachEl,
            });

            await wrapper
                .findAll("button")
                .find((btn) => btn.text().includes("Add to Collage"))
                .trigger("click");
            await nextTick();

            const pickFirst = Array.from(
                document.body.querySelectorAll("button")
            ).find((b) => b.textContent.includes("Hello"));
            expect(pickFirst).toBeDefined();
            await pickFirst.click();
            await nextTick();
            await clickConfirmDialogOk();

            expect(mockForm.post).toHaveBeenCalledWith("/collage-page.store", {
                preserveScroll: true,
                onSuccess: expect.any(Function),
            });
            expect(mockForm.replace_page_id).toBe(50);

            wrapper.unmount();
            attachEl.remove();
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

            expect(mockSpeak).toHaveBeenCalledWith("Add this to the collage?");
            expect(mockForm.post).not.toHaveBeenCalled();
            await clickConfirmDialogOk();
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

            expect(mockSpeak).toHaveBeenCalledWith("Add this to collage 1?");
            expect(mockForm.post).not.toHaveBeenCalled();
            await clickConfirmDialogOk();
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
