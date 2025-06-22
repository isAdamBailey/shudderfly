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
            :href="route('collages.deleted')"
            class="text-white hover:text-blue-300"
          >
            <i class="ri-archive-line mr-1"></i>
            View Archived Collages
          </Link>

          <Button
            v-if="canAdmin"
            :disabled="createCollageForm.processing || collages.length >= 4"
            @click="createCollageForm.post(route('collages.store'))"
            ><i class="ri-add-line text-xl mr-3"></i>
            Create New Collage
          </Button>
        </div>
      </div>
      <p class="text-sm text-gray-400 mt-2">
        You can build your own collages! Go to the page you want to add to the
        collage and select the collage you want to use. Only 4 collages can be
        added at a time, with maximum {{ MAX_COLLAGE_PAGES }} pages per collage.
        Mom and Dad can print these collages for laminating once a month.
      </p>
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
          class="absolute top-1 right-1 bg-white bg-opacity-80 hover:bg-red-500 hover:text-white text-gray-700 rounded-full px-1 shadow"
          title="Remove image"
          @click="removeImage(collage.id, page.id)"
        >
          <i class="ri-close-line text-lg"></i>
        </button>
      </template>

      <template #actions="{ collage }">
        <div class="flex flex-wrap justify-between items-center gap-2">
          <a
            v-if="collage.storage_path"
            class="text-center"
            :href="collage.storage_path"
            target="_blank"
          >
            View
            <i class="ri-external-link-line mr-1"></i>
          </a>
          <Button
            v-if="canAdmin"
            class="btn btn-secondary"
            :disabled="printForm.processing || !hasPages(collage)"
            @click="printForm.post(route('collages.generate-pdf', collage.id))"
          >
            {{ collage.storage_path ? "Regenerate" : "Generate PDF" }}
          </Button>

          <DangerButton
            v-if="canAdmin"
            class="btn btn-danger"
            :disabled="deleteForm.processing || !hasPages(collage)"
            @click="confirmDelete(collage.id)"
          >
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
import { MAX_COLLAGE_PAGES } from "@/constants/collage";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { Head, Link, useForm } from "@inertiajs/vue3";
import CollageGrid from "./CollageGrid.vue";

import { usePermissions } from "@/composables/permissions";

const { canAdmin } = usePermissions();

defineProps({
  collages: { type: Array, required: true }
});

const createCollageForm = useForm();
const printForm = useForm();
const deleteForm = useForm();

const hasPages = (collage) => {
  return collage.pages.length > 0;
};

const removeImage = (collageId, pageId) => {
  if (confirm("Remove this image from the collage?")) {
    useForm().delete(route("collage-page.destroy", [collageId, pageId]), {
      preserveScroll: true
    });
  }
};

const confirmDelete = (collageId) => {
  if (
    confirm(
      `Are you sure you want to archive this collage? You will still be able to see the collage in the archive, but this action cannot be undone.`
    )
  ) {
    deleteForm.delete(route("collages.destroy", collageId), {
      preserveScroll: true
    });
  }
};

defineOptions({
  name: "CollagesIndex"
});
</script>
