<template>
  <div class="bg-white shadow p-4 flex flex-col space-y-2">
    <div class="flex justify-between items-center mb-2">
      <h3 class="text-lg font-semibold text-gray-800">
        Collage #{{ collageNumber }}
      </h3>
      <span class="text-sm text-gray-500"
        >{{ collage.pages.length }}/{{ MAX_COLLAGE_PAGES }} image{{
          collage.pages.length !== 1 ? "s" : ""
        }}</span
      >
    </div>
    <!-- 8.5 x 11 aspect ratio container -->
    <div class="relative w-full" style="padding-bottom: 129.4%">
      <!-- 11/8.5 = 1.294 -->
      <div class="absolute inset-0 grid grid-cols-4 grid-rows-4 gap-1">
        <div
          v-for="page in collage.pages.slice(0, MAX_COLLAGE_PAGES)"
          :key="page.id"
          class="relative group"
        >
          <img
            :src="page.media_path"
            class="w-full h-full object-cover"
            :alt="`Collage image ${page.id}`"
          />
          <button
            v-if="canEditPages"
            class="absolute top-1 right-1 bg-white bg-opacity-80 hover:bg-red-500 hover:text-white text-gray-700 rounded-full px-1 shadow"
            title="Remove image"
            @click="removeImage(page.id)"
          >
            <i class="ri-close-line text-lg"></i>
          </button>
        </div>
      </div>
    </div>
    <div
      v-if="canEditPages"
      class="flex flex-wrap justify-between items-center mt-2"
    >
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
        class="btn btn-secondary"
        :disabled="printForm.processing"
        @click="printForm.post(route('collages.generate-pdf', collage.id))"
      >
        {{ collage.storage_path ? "Regenerate" : "Generate PDF" }}
      </Button>

      <DangerButton
        class="btn btn-danger"
        :disabled="deleteForm.processing"
        @click="confirmDelete"
      >
        <i class="ri-delete-bin-line mr-1"></i>
      </DangerButton>
    </div>
    <div v-if="canEditPages" class="flex flex-wrap gap-1 mt-2">
      <slot name="add-to-collage" :collage="collage" />
    </div>
  </div>
</template>

<script setup>
import Button from "@/Components/Button.vue";
import DangerButton from "@/Components/DangerButton.vue";
import { usePermissions } from "@/composables/permissions";
import { MAX_COLLAGE_PAGES } from "@/constants/collage";
import { useForm } from "@inertiajs/vue3";

const { canEditPages } = usePermissions();

const props = defineProps({
  collage: { type: Object, required: true },
  collageNumber: { type: Number, required: true }
});

const printForm = useForm();
const deleteForm = useForm();

const removeImage = (pageId) => {
  if (confirm("Remove this image from the collage?")) {
    useForm().delete(
      route("collage-page.destroy", [props.collage.id, pageId]),
      {
        preserveScroll: true
      }
    );
  }
};

const confirmDelete = () => {
  if (
    confirm(
      `Are you sure you want to delete Collage #${props.collageNumber}? This action cannot be undone.`
    )
  ) {
    deleteForm.delete(route("collages.destroy", props.collage.id), {
      preserveScroll: true
    });
  }
};
</script>
