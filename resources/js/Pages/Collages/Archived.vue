<template>
    <Head title="Archived Collages" />

    <AuthenticatedLayout>
        <template #header>
            <div class="flex justify-between flex-wrap items-center mb-3">
                <h2
                    class="font-heading text-2xl text-theme-title leading-tight"
                >
                    Archived Collages
                </h2>

                <Link
                    :href="route('collages.index')"
                    class="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                >
                    <i class="ri-arrow-left-line"></i>
                    Collages
                </Link>
            </div>
            <div class="flex justify-between items-center">
                <p class="text-gray-400 mt-2">{{ archivedText }}</p>
                <SpeakButton
                    class="ml-2"
                    :disabled="speaking"
                    aria-label="Speak archived collages summary"
                    icon-class="ri-speak-fill text-lg"
                    @click="speak(archivedText)"
                />
            </div>
            <p v-if="canAdmin" class="mt-3 text-sm text-gray-500">
                Archived collages are preserved but cannot be edited.
                <strong class="text-gray-400 font-medium">View PDF</strong> anytime.
                <strong class="text-gray-400 font-medium">Restore</strong> to make editable again.
                <strong class="text-gray-400 font-medium">Delete Permanently</strong> removes all data forever — this cannot be undone.
            </p>
        </template>

        <div
            v-if="collages.length === 0"
            class="flex flex-col items-center mt-10"
        >
            <h2 class="mb-8 font-semibold text-2xl text-gray-100 leading-tight">
                No archived collages found.
            </h2>
            <ManEmptyCircle />
        </div>

        <CollageGrid
            :collages="collages"
            :show-index="false"
            :show-screenshots="true"
        >
            <template #actions="{ collage }">
                <div class="w-full flex flex-wrap items-center gap-x-4 gap-y-2">
                    <a
                        v-if="canEditPages && collage.storage_path"
                        :href="collage.storage_path"
                        target="_blank"
                        class="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                    >
                        <i class="ri-file-pdf-line"></i>
                        View PDF
                    </a>

                    <div v-if="canAdmin" class="flex items-center gap-4 ml-auto">
                        <button
                            class="flex items-center gap-1.5 text-sm text-teal-400 hover:text-teal-300 transition-colors"
                            :class="{ 'opacity-50 cursor-not-allowed': restoreForm.processing }"
                            :disabled="restoreForm.processing"
                            @click="restoreForm.patch(route('collages.restore', collage.id))"
                        >
                            <i class="ri-arrow-go-back-line"></i>
                            Restore
                        </button>

                        <button
                            class="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-colors"
                            :class="{ 'opacity-50 cursor-not-allowed': deleteForm.processing }"
                            :disabled="deleteForm.processing"
                            @click="confirmDelete(collage.id)"
                        >
                            <i class="ri-delete-bin-line"></i>
                            Delete
                        </button>
                    </div>
                </div>
            </template>
        </CollageGrid>

        <ConfirmDialog
            v-model:show="confirmShow"
            :title="confirmTitle"
            :message="confirmMessage"
            :confirm-label="confirmOkLabel || t('common.ok')"
            :cancel-label="confirmCancelLabel || t('common.cancel')"
            :confirm-variant="confirmVariant"
            @confirm="confirmOnOk"
            @cancel="confirmOnCancel"
        />

        <ScrollTop />
    </AuthenticatedLayout>
</template>

<script setup>
/* global route */
import SpeakButton from "@/Components/SpeakButton.vue";
import ConfirmDialog from "@/Components/ConfirmDialog.vue";
import ScrollTop from "@/Components/ScrollTop.vue";
import ManEmptyCircle from "@/Components/svg/ManEmptyCircle.vue";
import { useConfirmDialog } from "@/composables/useConfirmDialog";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { Head, Link, useForm } from "@inertiajs/vue3";
import { computed } from "vue";
import CollageGrid from "./CollageGrid.vue";

import { usePermissions } from "@/composables/permissions";

const { t } = useTranslations();
const {
    show: confirmShow,
    message: confirmMessage,
    title: confirmTitle,
    confirmLabel: confirmOkLabel,
    cancelLabel: confirmCancelLabel,
    confirmVariant,
    ask: askConfirm,
    onConfirmed: confirmOnOk,
    onCancelled: confirmOnCancel,
} = useConfirmDialog();

const { canEditPages, canAdmin } = usePermissions();
const { speak, speaking } = useSpeechSynthesis();

defineProps({
    collages: { type: Array, required: true },
});

const restoreForm = useForm();
const deleteForm = useForm();

const archivedText = computed(() => t("collage.archived_description"));

const confirmDelete = async (collageId) => {
    const ok = await askConfirm(
        `Are you sure you want to permanently delete this collage? This action cannot be undone and will remove all associated data.`
    );
    if (!ok) {
        return;
    }
    deleteForm.delete(route("collages.destroy", collageId), {
        preserveScroll: true,
    });
};

defineOptions({
    name: "ArchivedCollages",
});
</script>
