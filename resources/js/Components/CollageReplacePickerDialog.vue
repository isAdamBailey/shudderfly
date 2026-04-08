<script setup>
import Modal from "@/Components/Modal.vue";
import SecondaryButton from "@/Components/SecondaryButton.vue";

const props = defineProps({
    show: {
        type: Boolean,
        default: false,
    },
    pages: {
        type: Array,
        default: () => [],
    },
    title: {
        type: String,
        default: "",
    },
    cancelLabel: {
        type: String,
        default: "",
    },
    maxWidth: {
        type: String,
        default: "lg",
    },
});

const emit = defineEmits(["update:show", "close", "pick"]);

function onClose() {
    emit("update:show", false);
    emit("close");
}

function onPick(page) {
    emit("pick", page);
}

const thumbSrc = (page) => {
    if (page.media_path) {
        return page.media_path;
    }
    if (page.media_poster) {
        return page.media_poster;
    }
    return "";
};

const stripHtml = (html) => {
    if (!html) return "";
    return String(html).replace(/<\/?[^>]+(>|$)/g, "");
};

const pageListLabel = (page) => {
    const text = stripHtml(page.content ?? "").trim();
    if (text.length > 0) {
        return text.length > 80 ? `${text.slice(0, 80)}…` : text;
    }
    return `Page #${page.id}`;
};
</script>

<template>
    <Modal
        :show="show"
        :max-width="maxWidth"
        @close="onClose"
    >
        <div class="p-6">
            <h2
                class="text-lg font-medium text-gray-900 dark:text-gray-100"
            >
                <slot name="title">{{ title }}</slot>
            </h2>
            <div
                class="mt-4 max-h-[min(70vh,32rem)] overflow-y-auto space-y-2 pr-1"
            >
                <slot
                    name="items"
                    :pages="pages"
                    :thumb-src="thumbSrc"
                    :page-list-label="pageListLabel"
                    :pick="onPick"
                >
                    <button
                        v-for="p in pages"
                        :key="p.id"
                        type="button"
                        class="flex w-full items-center gap-3 rounded border border-gray-200 dark:border-gray-600 p-2 text-left transition hover:bg-gray-50 dark:hover:bg-gray-700"
                        @click="onPick(p)"
                    >
                        <img
                            v-if="thumbSrc(p)"
                            :src="thumbSrc(p)"
                            alt=""
                            class="h-16 w-16 shrink-0 rounded object-cover bg-gray-100 dark:bg-gray-600"
                        />
                        <div
                            v-else
                            class="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-gray-100 text-gray-500 dark:bg-gray-600"
                        >
                            <i class="ri-image-line text-2xl"></i>
                        </div>
                        <span
                            class="min-w-0 truncate text-sm text-gray-700 dark:text-gray-200"
                        >
                            {{ pageListLabel(p) }}
                        </span>
                    </button>
                </slot>
            </div>
            <div class="mt-6 flex justify-end">
                <SecondaryButton type="button" @click="onClose">
                    <slot name="cancel">{{ cancelLabel }}</slot>
                </SecondaryButton>
            </div>
        </div>
    </Modal>
</template>
