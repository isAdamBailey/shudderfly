<script setup>
import ConfirmDialog from "@/Components/ConfirmDialog.vue";
import { useTranslations } from "@/composables/useTranslations";
import { useForm } from "@inertiajs/vue3";
import { computed, ref } from "vue";

/* global route */

const props = defineProps({
    book: { type: Object, default: null },
    books: { type: Array, default: null },
    selectedPages: { type: Array, default: () => [] },
    // Every page currently loaded in the grid, for "Select all".
    pageIds: { type: Array, default: () => [] },
});

const emit = defineEmits(["close-form", "selection-changed"]);

const { t } = useTranslations();

const form = useForm({
    page_ids: [],
    action: "",
    target_book_id: null,
});

// Which confirm dialog is open: "delete" | "move_to_top" | "move_to_book".
const pendingAction = ref(null);
const bookSearch = ref("");

const selectedCount = computed(() => props.selectedPages.length);
const hasSelection = computed(() => selectedCount.value > 0);
const allSelected = computed(
    () =>
        props.pageIds.length > 0 &&
        props.pageIds.every((id) => props.selectedPages.includes(id))
);

const bookOptions = computed(() => {
    const query = bookSearch.value.trim().toLowerCase();
    return (props.books ?? [])
        .filter((book) => book.id !== props.book?.id)
        .filter((book) => !query || book.title.toLowerCase().includes(query));
});

const dialogCopy = computed(() => {
    switch (pendingAction.value) {
        case "delete":
            return {
                title: t("book.bulk.confirm_delete_title"),
                message: t("book.bulk.confirm_delete_message"),
                confirm: t("book.bulk.delete"),
            };
        case "move_to_top":
            return {
                title: t("book.bulk.confirm_move_top_title"),
                message: t("book.bulk.confirm_move_top_message"),
                confirm: t("book.bulk.move_to_top"),
            };
        case "move_to_book":
            return {
                title: t("book.bulk.confirm_move_book_title"),
                message: t("book.bulk.confirm_move_book_message"),
                confirm: t("book.bulk.move_to_book"),
            };
        default:
            return { title: "", message: "", confirm: "" };
    }
});

const toggleSelectAll = () => {
    emit("selection-changed", allSelected.value ? [] : [...props.pageIds]);
};

const openAction = (action) => {
    if (!hasSelection.value || form.processing) return;
    form.clearErrors?.();
    form.target_book_id = null;
    bookSearch.value = "";
    pendingAction.value = action;
};

const cancelAction = () => {
    pendingAction.value = null;
};

const submit = () => {
    const action = pendingAction.value;
    pendingAction.value = null;
    if (!action || !hasSelection.value) return;
    if (action === "move_to_book" && form.target_book_id === null) return;

    form.action = action;
    form.page_ids = [...props.selectedPages];
    if (action !== "move_to_book") {
        form.target_book_id = null;
    }

    form.post(route("pages.bulk-action"), {
        // Keep the selection if the server rejects the request so the
        // error can be shown; otherwise reload the grid from scratch.
        preserveState: "errors",
        preserveScroll: false,
        onSuccess: () => {
            form.reset();
            emit("close-form");
        },
    });
};

const actionButtonClasses =
    "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-row sm:gap-2 sm:text-sm";
</script>

<template>
    <div
        class="fixed inset-x-0 bottom-0 z-50 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4 sm:pb-4"
        role="toolbar"
        :aria-label="t('book.bulk.toolbar_label')"
        data-test="bulk-actions-bar"
    >
        <div
            class="mx-auto max-w-3xl rounded-2xl bg-gray-900/95 p-3 text-white shadow-2xl ring-1 ring-white/15 backdrop-blur-md"
        >
            <div class="flex items-center gap-2">
                <button
                    type="button"
                    class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    :aria-label="t('book.bulk.close')"
                    :title="t('book.bulk.close')"
                    data-test="bulk-close"
                    @click="emit('close-form')"
                >
                    <i class="ri-close-line" aria-hidden="true"></i>
                </button>

                <p class="min-w-0 flex-1 truncate" aria-live="polite">
                    <span
                        v-if="hasSelection"
                        class="text-lg font-bold"
                        data-test="bulk-count"
                    >
                        {{
                            t("book.bulk.selected_count", {
                                count: selectedCount,
                            })
                        }}
                    </span>
                    <span v-else class="text-sm text-gray-300">
                        {{ t("book.bulk.hint") }}
                    </span>
                </p>

                <button
                    v-if="pageIds.length > 0"
                    type="button"
                    class="shrink-0 rounded-full px-3 py-2 text-sm font-semibold text-amber-300 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    data-test="bulk-select-all"
                    @click="toggleSelectAll"
                >
                    {{
                        allSelected
                            ? t("book.bulk.clear")
                            : t("book.bulk.select_all")
                    }}
                </button>
            </div>

            <p
                v-if="form.hasErrors"
                class="mt-2 rounded-lg bg-red-900/60 px-3 py-2 text-sm text-red-100"
                role="alert"
            >
                {{ t("book.bulk.error") }}
            </p>

            <div class="mt-3 grid grid-cols-3 gap-2">
                <button
                    type="button"
                    :class="[
                        actionButtonClasses,
                        'bg-white/10 hover:bg-white/20',
                    ]"
                    :disabled="!hasSelection || form.processing"
                    data-test="bulk-move-top"
                    @click="openAction('move_to_top')"
                >
                    <i
                        class="ri-arrow-up-double-line text-xl"
                        aria-hidden="true"
                    ></i>
                    <span>{{ t("book.bulk.move_to_top") }}</span>
                </button>
                <button
                    type="button"
                    :class="[
                        actionButtonClasses,
                        'bg-white/10 hover:bg-white/20',
                    ]"
                    :disabled="!hasSelection || form.processing"
                    data-test="bulk-move-book"
                    @click="openAction('move_to_book')"
                >
                    <i class="ri-book-2-line text-xl" aria-hidden="true"></i>
                    <span>{{ t("book.bulk.move_to_book") }}</span>
                </button>
                <button
                    type="button"
                    :class="[
                        actionButtonClasses,
                        'bg-red-600 hover:bg-red-500',
                    ]"
                    :disabled="!hasSelection || form.processing"
                    data-test="bulk-delete"
                    @click="openAction('delete')"
                >
                    <i
                        class="ri-delete-bin-line text-xl"
                        aria-hidden="true"
                    ></i>
                    <span>{{ t("book.bulk.delete") }}</span>
                </button>
            </div>
        </div>

        <ConfirmDialog
            :show="pendingAction !== null"
            :title="dialogCopy.title"
            :confirm-label="dialogCopy.confirm"
            :confirm-variant="pendingAction === 'delete' ? 'danger' : 'primary'"
            :confirm-disabled="
                pendingAction === 'move_to_book' && form.target_book_id === null
            "
            @confirm="submit"
            @cancel="cancelAction"
        >
            <p>{{ dialogCopy.message }}</p>
            <p class="mt-1 font-semibold text-gray-800 dark:text-gray-200">
                {{ t("book.bulk.selected_count", { count: selectedCount }) }}
            </p>

            <div v-if="pendingAction === 'move_to_book'" class="mt-4">
                <input
                    v-model="bookSearch"
                    type="search"
                    class="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                    :placeholder="t('book.bulk.search_books')"
                    :aria-label="t('book.bulk.search_books')"
                    data-test="bulk-book-search"
                />
                <ul
                    class="mt-2 max-h-64 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700"
                    role="radiogroup"
                    :aria-label="t('book.bulk.search_books')"
                >
                    <li v-for="option in bookOptions" :key="option.id">
                        <label
                            class="flex cursor-pointer items-center gap-3 px-3 py-2 text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                            :class="{
                                'bg-blue-50 dark:bg-blue-900/40':
                                    form.target_book_id === option.id,
                            }"
                        >
                            <input
                                v-model="form.target_book_id"
                                type="radio"
                                name="bulk-target-book"
                                :value="option.id"
                                class="text-blue-600 focus:ring-blue-500"
                            />
                            <span class="truncate">{{ option.title }}</span>
                        </label>
                    </li>
                    <li
                        v-if="bookOptions.length === 0"
                        class="px-3 py-4 text-center text-gray-500"
                    >
                        {{ t("book.bulk.no_books") }}
                    </li>
                </ul>
            </div>
        </ConfirmDialog>
    </div>
</template>
