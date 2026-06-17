<template>
  <Head title="Collages" />

  <AuthenticatedLayout>
    <template #header>
      <div class="flex justify-between flex-wrap items-center mb-3">
        <h2 class="font-heading text-2xl text-theme-title leading-tight">
          Collages
        </h2>

        <div class="flex items-center gap-4">
          <Link
            :href="route('collages.archived')"
            class="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            <i class="ri-archive-line"></i>
            Archived
          </Link>

          <Button
            v-if="canAdmin"
            :disabled="createCollageForm.processing || collages.length >= 2"
            @click="createCollageForm.post(route('collages.store'))"
            ><i class="ri-add-line text-xl mr-3"></i>
            Create New Collage
          </Button>
        </div>
      </div>
      <div class="flex justify-between items-center">
        <p class="text-gray-400 mt-2">{{ collageMessage }}</p>
        <SpeakButton
          class="ml-2"
          :disabled="speaking"
          aria-label="Speak collage summary"
          icon-class="ri-speak-fill text-lg"
          @click="speak(collageMessage)"
        />
      </div>
      <p v-if="canAdmin" class="mt-3 text-sm text-gray-500">
        Each collage holds up to {{ maxCollagePages }} pictures that automatically arrange to fill the space.
        <strong class="text-gray-400 font-medium">Lock</strong> to prevent new additions;
        <strong class="text-gray-400 font-medium">Generate PDF</strong> takes a few minutes — you'll receive an email when ready;
        <strong class="text-gray-400 font-medium">Archive</strong> to preserve while preventing edits.
      </p>
    </template>

    <div v-if="collages.length === 0" class="flex flex-col items-center mt-10">
      <h2 class="mb-8 font-semibold text-2xl text-gray-100 leading-tight">
        No collages have been created yet.
      </h2>
      <ManEmptyCircle />
    </div>

    <CollageGrid :collages="collages" :message="collageMessage">
      <template #image-actions="{ page, collage }">
        <button
          v-if="canAdmin && !collage.is_locked"
          class="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg transition-all duration-200 z-10"
          :class="{
            'opacity-50 cursor-not-allowed': isGenerating(collage)
          }"
          title="Remove image"
          :disabled="isGenerating(collage)"
          @click="removeImage(collage.id, page.id)"
        >
          <i class="ri-close-line text-sm"></i>
        </button>
      </template>

      <template #actions="{ collage }">
        <div class="w-full flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            v-if="canAdmin"
            class="flex items-center gap-1.5 text-sm transition-colors"
            :class="[
              collage.is_locked ? 'text-amber-400 hover:text-amber-300' : 'text-gray-500 hover:text-gray-300',
              updateForm.processing ? 'opacity-50 cursor-not-allowed' : ''
            ]"
            :disabled="updateForm.processing"
            @click="toggleLock(collage)"
          >
            <i :class="collage.is_locked ? 'ri-lock-fill' : 'ri-lock-unlock-line'"></i>
            {{ collage.is_locked ? 'Locked' : 'Lock' }}
          </button>

          <a
            v-if="collage.storage_path && canEditPages"
            :href="collage.storage_path"
            target="_blank"
            class="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            <i class="ri-file-pdf-line"></i>
            View PDF
          </a>

          <div v-if="canAdmin" class="flex items-center gap-4 ml-auto">
            <button
              class="flex items-center gap-1.5 text-sm transition-colors"
              :class="[
                isGenerating(collage) ? 'text-amber-400' : (!hasPages(collage) ? 'text-gray-600 cursor-not-allowed' : 'text-teal-400 hover:text-teal-300'),
                (printForm.processing || !hasPages(collage) || isGenerating(collage)) ? 'opacity-50 cursor-not-allowed' : ''
              ]"
              :disabled="printForm.processing || !hasPages(collage) || isGenerating(collage)"
              @click="generatePdf(collage.id)"
            >
              <i :class="isGenerating(collage) ? 'ri-loader-4-line animate-spin' : 'ri-file-pdf-line'"></i>
              {{ isGenerating(collage) ? 'Generating…' : collage.storage_path ? 'Regenerate PDF' : 'Generate PDF' }}
            </button>

            <button
              class="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-colors"
              :class="{ 'opacity-40 cursor-not-allowed': deleteForm.processing || !hasPages(collage) || isGenerating(collage) }"
              :disabled="deleteForm.processing || !hasPages(collage) || isGenerating(collage)"
              @click="confirmDelete(collage.id)"
            >
              <i class="ri-archive-line"></i>
              Archive
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
  </AuthenticatedLayout>
</template>

<script setup>
/* global route */
import Button from "@/Components/Button.vue";
import SpeakButton from "@/Components/SpeakButton.vue";
import ConfirmDialog from "@/Components/ConfirmDialog.vue";
import ManEmptyCircle from "@/Components/svg/ManEmptyCircle.vue";
import { useConfirmDialog } from "@/composables/useConfirmDialog";
import { usePermissions } from "@/composables/permissions";
import { useCollageMaxPages } from "@/composables/useCollageMaxPages";
import { useCollageProcessing } from "@/composables/useCollageProcessing";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { Head, Link, useForm } from "@inertiajs/vue3";
import { computed } from "vue";
import CollageGrid from "./CollageGrid.vue";

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

const { canAdmin, canEditPages } = usePermissions();
const maxCollagePages = useCollageMaxPages();
const { speak, speaking } = useSpeechSynthesis();
const { startProcessing, stopProcessing, isProcessing } =
  useCollageProcessing();

const props = defineProps({
  collages: { type: Array, required: true }
});

const createCollageForm = useForm();
const printForm = useForm();
const deleteForm = useForm();
const updateForm = useForm({
  is_locked: false
});

const collageMessage = computed(() => {
  if (props.collages.length === 0) {
    return t("collage.none_created");
  }
  const now = new Date();
  const nextMonthName = new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleString('en-US', { month: 'long' });
  const key = props.collages.length === 1 ? "collage.single_for_month" : "collage.multiple_for_month";
  return t(key, { month: nextMonthName });
});

const hasPages = (collage) => {
  return collage.pages.length > 0;
};

const generatePdf = (collageId) => {
  startProcessing(collageId);

  // eslint-disable-next-line no-undef
  printForm.post(route("collages.generate-pdf", collageId), {
    onSuccess: () => {
      // Keep it in processing state until manually cleared or job completes
    },
    onError: () => {
      // Remove from processing state if there's an error
      stopProcessing(collageId);
    }
  });
};

const isGenerating = (collage) => {
  // Check if it's currently being processed (localStorage state)
  const processing = isProcessing(collage.id);

  // If it's in processing state AND has is_archived set to true,
  // the job completed successfully, so clear the processing state
  if (processing && collage.is_archived) {
    stopProcessing(collage.id);
    return false;
  }

  // If it's in processing state, it's generating (regardless of storage_path)
  if (processing) {
    return true;
  }

  // If it's not in processing state, it's not generating
  return false;
};

const removeImage = async (collageId, pageId) => {
  const ok = await askConfirm("Remove this image from the collage?");
  if (!ok) {
    return;
  }
  // eslint-disable-next-line no-undef
  useForm().delete(route("collage-page.destroy", [collageId, pageId]), {
    preserveScroll: true
  });
};

const confirmDelete = async (collageId) => {
  const ok = await askConfirm(
    `Are you sure you want to archive this collage? You will still be able to see the collage in the archive.`
  );
  if (!ok) {
    return;
  }
  // eslint-disable-next-line no-undef
  deleteForm.patch(route("collages.archive", collageId), {
    preserveScroll: true
  });
};

const toggleLock = (collage) => {
  updateForm.is_locked = !collage.is_locked;

  // eslint-disable-next-line no-undef
  updateForm.put(route("collages.update", collage.id), {
    preserveScroll: true,
    onError: (errors) => {
      console.error("Lock toggle failed:", errors);
    }
  });
};

defineOptions({
  name: "CollagesIndex"
});
</script>
