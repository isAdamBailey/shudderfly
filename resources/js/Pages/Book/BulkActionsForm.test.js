import BulkActionsForm from "@/Pages/Book/BulkActionsForm.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { reactive } from "vue";

const mockPost = vi.fn();

vi.mock("@inertiajs/vue3", () => ({
    useForm: (initialData) =>
        reactive({
            ...initialData,
            processing: false,
            hasErrors: false,
            post: mockPost,
            reset: vi.fn(),
            clearErrors: vi.fn(),
        }),
}));

vi.mock("@/composables/useTranslations", () => ({
    useTranslations: () => ({
        t: (key, params = {}) =>
            Object.keys(params).length
                ? `${key}|${JSON.stringify(params)}`
                : key,
    }),
}));

// Render the dialog body inline (no teleport) so it can be asserted on.
vi.mock("@/Components/ConfirmDialog.vue", () => ({
    default: {
        name: "ConfirmDialog",
        props: [
            "show",
            "title",
            "confirmLabel",
            "confirmVariant",
            "confirmDisabled",
        ],
        emits: ["confirm", "cancel"],
        template: `<div v-if="show" class="confirm-dialog">
            <h2>{{ title }}</h2>
            <slot />
            <button class="confirm" :disabled="confirmDisabled" @click="$emit('confirm')">{{ confirmLabel }}</button>
            <button class="cancel" @click="$emit('cancel')">cancel</button>
        </div>`,
    },
}));

global.route = vi.fn((name) => `/${name}`);

describe("BulkActionsForm.vue", () => {
    const book = { id: 1, title: "Test Book" };
    const books = [
        { id: 1, title: "Test Book" },
        { id: 2, title: "Another Book" },
        { id: 3, title: "Third Book" },
    ];

    const mountBar = (props = {}) =>
        mount(BulkActionsForm, {
            props: {
                book,
                books,
                selectedPages: [1, 2, 3],
                pageIds: [1, 2, 3, 4],
                ...props,
            },
        });

    let wrapper;

    beforeEach(() => {
        mockPost.mockReset();
        wrapper = mountBar();
    });

    describe("rendering", () => {
        it("renders as a fixed toolbar pinned to the bottom of the screen", () => {
            const bar = wrapper.get('[data-test="bulk-actions-bar"]');
            expect(bar.attributes("role")).toBe("toolbar");
            expect(bar.classes()).toEqual(
                expect.arrayContaining(["fixed", "bottom-0"])
            );
        });

        it("shows the selected count", () => {
            expect(wrapper.get('[data-test="bulk-count"]').text()).toBe(
                'book.bulk.selected_count|{"count":3}'
            );
        });

        it("shows a hint and disables actions when nothing is selected", async () => {
            await wrapper.setProps({ selectedPages: [] });

            expect(wrapper.text()).toContain("book.bulk.hint");
            for (const action of ["move-top", "move-book", "delete"]) {
                expect(
                    wrapper
                        .get(`[data-test="bulk-${action}"]`)
                        .attributes("disabled")
                ).toBeDefined();
            }
        });

        it("enables actions when pages are selected", () => {
            expect(
                wrapper.get('[data-test="bulk-delete"]').attributes("disabled")
            ).toBeUndefined();
        });
    });

    describe("selection controls", () => {
        it("selects every loaded page", async () => {
            await wrapper.get('[data-test="bulk-select-all"]').trigger("click");
            expect(wrapper.emitted("selection-changed")[0]).toEqual([
                [1, 2, 3, 4],
            ]);
        });

        it("clears the selection when everything is already selected", async () => {
            await wrapper.setProps({ selectedPages: [1, 2, 3, 4] });
            const toggle = wrapper.get('[data-test="bulk-select-all"]');
            expect(toggle.text()).toBe("book.bulk.clear");

            await toggle.trigger("click");
            expect(wrapper.emitted("selection-changed")[0]).toEqual([[]]);
        });

        it("emits close-form from the close button", async () => {
            await wrapper.get('[data-test="bulk-close"]').trigger("click");
            expect(wrapper.emitted("close-form")).toHaveLength(1);
        });
    });

    describe("actions", () => {
        it("asks for confirmation before deleting", async () => {
            await wrapper.get('[data-test="bulk-delete"]').trigger("click");

            expect(mockPost).not.toHaveBeenCalled();
            const dialog = wrapper.get(".confirm-dialog");
            expect(dialog.text()).toContain("book.bulk.confirm_delete_title");

            await dialog.get("button.confirm").trigger("click");

            expect(mockPost).toHaveBeenCalledWith(
                "/pages.bulk-action",
                expect.objectContaining({ preserveState: "errors" })
            );
            expect(wrapper.vm.form.action).toBe("delete");
            expect(wrapper.vm.form.page_ids).toEqual([1, 2, 3]);
        });

        it("does nothing when the confirmation is cancelled", async () => {
            await wrapper.get('[data-test="bulk-move-top"]').trigger("click");
            await wrapper.get(".confirm-dialog button.cancel").trigger("click");

            expect(mockPost).not.toHaveBeenCalled();
            expect(wrapper.find(".confirm-dialog").exists()).toBe(false);
        });

        it("moves pages to the top", async () => {
            await wrapper.get('[data-test="bulk-move-top"]').trigger("click");
            await wrapper
                .get(".confirm-dialog button.confirm")
                .trigger("click");

            expect(mockPost).toHaveBeenCalledTimes(1);
            expect(wrapper.vm.form.action).toBe("move_to_top");
            expect(wrapper.vm.form.target_book_id).toBe(null);
        });

        it("requires a target book and excludes the current one", async () => {
            await wrapper.get('[data-test="bulk-move-book"]').trigger("click");

            const radios = wrapper.findAll('input[type="radio"]');
            expect(radios.map((r) => r.element.value)).toEqual(["2", "3"]);
            expect(
                wrapper
                    .get(".confirm-dialog button.confirm")
                    .attributes("disabled")
            ).toBeDefined();

            await radios[1].setValue(true);
            await wrapper
                .get(".confirm-dialog button.confirm")
                .trigger("click");

            expect(mockPost).toHaveBeenCalledTimes(1);
            expect(wrapper.vm.form.action).toBe("move_to_book");
            expect(wrapper.vm.form.target_book_id).toBe(3);
        });

        it("filters target books by search text", async () => {
            await wrapper.get('[data-test="bulk-move-book"]').trigger("click");
            await wrapper
                .get('[data-test="bulk-book-search"]')
                .setValue("third");

            const labels = wrapper
                .findAll(".confirm-dialog label")
                .map((l) => l.text());
            expect(labels).toEqual(["Third Book"]);
        });
    });
});
