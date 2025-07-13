<template>
  <Head title="Archived Collages" />

  <AuthenticatedLayout>
    <template #header>
      <div class="flex justify-between flex-wrap items-center mb-3">
        <h2 class="font-heading text-2xl text-theme-title leading-tight">
          Archived Collages
        </h2>

        <Link
          :href="route('collages.index')"
          class="text-white hover:text-blue-300"
        >
          <i class="ri-arrow-left-line mr-1"></i>
          Back to Collages
        </Link>
      </div>
      <p class="text-sm text-gray-400 mt-2">
        Archived collages can no longer be edited, but you may still view and
        print them.
      </p>
    </template>

    <div v-if="collages.length === 0" class="flex flex-col items-center mt-10">
      <h2 class="mb-8 font-semibold text-2xl text-gray-100 leading-tight">
        No archived collages found.
      </h2>
      <ManEmptyCircle />
    </div>

    <CollageGrid :collages="collages" :show-index="false">
      <template #actions="{ collage }">
        <div class="flex flex-wrap justify-between items-center gap-2">
          <a
            v-if="canEditPages && collage.storage_path"
            class="text-center text-blue-600 hover:text-blue-800"
            :href="collage.storage_path"
            target="_blank"
          >
            View PDF
            <i class="ri-external-link-line mr-1"></i>
          </a>

          <Button
            v-if="canAdmin"
            class="btn btn-secondary"
            :disabled="restoreForm.processing"
            @click="restoreForm.patch(route('collages.restore', collage.id))"
          >
            Restore Collage
            <i class="ri-arrow-go-back-line ml-1"></i>
          </Button>

          <DangerButton
            v-if="canAdmin"
            class="btn btn-danger"
            :disabled="deleteForm.processing"
            @click="confirmDelete(collage.id)"
          >
            Delete Permanently
            <i class="ri-delete-bin-line ml-1"></i>
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
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { Head, Link, useForm } from "@inertiajs/vue3";
import CollageGrid from "./CollageGrid.vue";

import { usePermissions } from "@/composables/permissions";

const { canEditPages, canAdmin } = usePermissions();

const restoreForm = useForm();
const deleteForm = useForm();

const confirmDelete = (collageId) => {
  if (
    confirm(
      `Are you sure you want to permanently delete this collage? This action cannot be undone and will remove all associated data.`
    )
  ) {
    deleteForm.delete(route("collages.destroy", collageId), {
      preserveScroll: true
    });
  }
};

defineProps({
  collages: { type: Array, required: true }
});

defineOptions({
  name: "ArchivedCollages"
});
</script>
