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
            class="text-white hover:text-blue-300"
          >
            <i class="ri-archive-line mr-1"></i>
            View Archived Collages
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
        <p class="text-sm text-gray-400 mt-2">{{ text }}</p>
        <Button class="ml-2" :disabled="speaking" @click="speak(text)">
          <i class="ri-speak-fill text-lg"></i>
        </Button>
      </div>
    </template>

    <div v-if="collages.length === 0" class="flex flex-col items-center mt-10">
      <h2 class="mb-8 font-semibold text-2xl text-gray-100 leading-tight">
        No collages have been created yet.
      </h2>
      <ManEmptyCircle />
    </div>

    <CollageGrid :collages="collages">
      <template #image-actions="{ page, collage }">
        <button
          v-if="canAdmin"
          class="absolute top-1 right-1 bg-red-500 text-white rounded-full px-1 shadow"
          :class="{ 'opacity-50 cursor-not-allowed': isGenerating(collage) }"
          title="Remove image"
          :disabled="isGenerating(collage)"
          @click="removeImage(collage.id, page.id)"
        >
          <i class="ri-close-line text-lg"></i>
        </button>
      </template>

      <template #actions="{ collage }">
        <div class="flex flex-wrap justify-between items-center gap-2">
          <a
            v-if="collage.storage_path && canEditPages"
            class="text-center"
            :href="collage.storage_path"
            target="_blank"
          >
            View PDF
            <i class="ri-external-link-line mr-1"></i>
          </a>
          <Button
            v-if="canAdmin"
            class="btn btn-secondary"
            :disabled="
              printForm.processing ||
              !hasPages(collage) ||
              isGenerating(collage)
            "
            @click="generatePdf(collage.id)"
          >
            {{
              isGenerating(collage)
                ? "Generating PDF..."
                : collage.storage_path
                ? "Regenerate PDF"
                : "Generate PDF"
            }}
            <i class="ri-file-pdf-line ml-1"></i>
          </Button>

          <DangerButton
            v-if="canAdmin"
            class="btn btn-danger"
            :disabled="
              deleteForm.processing ||
              !hasPages(collage) ||
              isGenerating(collage)
            "
            @click="confirmDelete(collage.id)"
          >
            Archive Collage
            <i class="ri-archive-line ml-1"></i>
          </DangerButton>
        </div>
      </template>
    </CollageGrid>
  </AuthenticatedLayout>
</template>

<script setup>
import Button from "@/Components/Button.vue";
import DangerButton from "@/Components/DangerButton.vue";
import ManEmptyCircle from "@/Components/svg/ManEmptyCircle.vue";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { MAX_COLLAGE_PAGES } from "@/constants/collage";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { Head, Link, useForm } from "@inertiajs/vue3";
import { ref } from "vue";
import CollageGrid from "./CollageGrid.vue";

import { usePermissions } from "@/composables/permissions";
import { useCollageProcessing } from "@/composables/useCollageProcessing";

const { canAdmin, canEditPages } = usePermissions();
const { speak, speaking } = useSpeechSynthesis();
const { startProcessing, stopProcessing, isProcessing } =
  useCollageProcessing();

defineProps({
  collages: { type: Array, required: true }
});

const createCollageForm = useForm();
const printForm = useForm();
const deleteForm = useForm();

const text = ref(
  `You can build your own collages! Go to the picture you want to add to the collage and select the collage you want. ${MAX_COLLAGE_PAGES} pages per collage. Mom and Dad can print these collages for laminating once a month.`
);

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

const removeImage = (collageId, pageId) => {
  if (confirm("Remove this image from the collage?")) {
    // eslint-disable-next-line no-undef
    useForm().delete(route("collage-page.destroy", [collageId, pageId]), {
      preserveScroll: true
    });
  }
};

const confirmDelete = (collageId) => {
  if (
    confirm(
      `Are you sure you want to archive this collage? You will still be able to see the collage in the archive.`
    )
  ) {
    // eslint-disable-next-line no-undef
    deleteForm.patch(route("collages.archive", collageId), {
      preserveScroll: true
    });
  }
};

defineOptions({
  name: "CollagesIndex"
});
</script>
