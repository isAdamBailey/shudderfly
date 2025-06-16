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
    </template>

    <div v-if="collages.length === 0" class="flex flex-col items-center mt-10">
      <h2 class="mb-8 font-semibold text-2xl text-gray-100 leading-tight">
        No archived collages found.
      </h2>
      <ManEmptyCircle />
    </div>

    <CollageGrid :collages="collages" :show-index="false">
      <template #actions="{ collage }">
        <a
          v-if="canEditPages && collage.storage_path"
          class="text-center text-blue-600 hover:text-blue-800"
          :href="collage.storage_path"
          target="_blank"
        >
          View PDF
          <i class="ri-external-link-line mr-1"></i>
        </a>
      </template>
    </CollageGrid>
  </AuthenticatedLayout>
</template>

<script setup>
import ManEmptyCircle from "@/Components/svg/ManEmptyCircle.vue";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { Head, Link } from "@inertiajs/vue3";
import CollageGrid from "./CollageGrid.vue";

import { usePermissions } from "@/composables/permissions";

const { canEditPages } = usePermissions();

defineProps({
  collages: { type: Array, required: true }
});

defineOptions({
  name: "DeletedCollages"
});
</script>
