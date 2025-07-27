<template>
  <div class="ml-10">
    <div v-if="isPageInAnyCollage" class="text-yellow-400 text-sm">
      <i class="ri-information-line mr-1 text-2xl"></i>
      This picture is in collage
      <span
        v-for="(existingCollage, index) in pageExistingCollages"
        :key="existingCollage.id"
      >
        #{{ getCollageDisplayNumber(existingCollage.id)
        }}<span v-if="index < pageExistingCollages.length - 1">, </span>
      </span>
      <Button
        class="ml-3 py-0.5 px-0.5"
        :disabled="speaking"
        @click="
          speak(
            `This picture is in collage #${getCollageDisplayNumber(
              pageExistingCollages[0].id
            )}`
          )
        "
      >
        <i class="ri-speak-fill text-2xl"></i>
      </Button>
    </div>

    <div v-else>
      <label class="block mb-3 font-medium text-white"
        >Add to collage:
        <Button
          class="ml-3 py-0.5"
          :disabled="speaking"
          @click="
            speak(
              `${
                !hasAvailableCollages
                  ? 'All collages are full'
                  : 'Select a collage and click the add button'
              }`
            )
          "
        >
          <i class="ri-speak-fill text-2xl"></i>
        </Button>
      </label>
      <div class="flex items-center gap-2">
        <select
          v-model="selectedCollageId"
          class="rounded"
          :disabled="!hasAvailableCollages"
        >
          <option :value="null" disabled>
            {{
              hasAvailableCollages ? "Select collage" : "All collages are full"
            }}
          </option>
          <option
            v-for="collage in availableCollages"
            :key="collage.id"
            :value="collage.id"
            :disabled="collage.pages.length >= MAX_COLLAGE_PAGES"
          >
            Collage #{{ getCollageDisplayNumber(collage.id) }}
            <span v-if="collage.pages.length >= MAX_COLLAGE_PAGES">
              (Full)</span
            >
          </option>
        </select>
        <div v-if="showSuccess" class="p-3 bg-green-100 text-green-700 rounded">
          <i class="ri-check-circle-line mr-1"></i>
          Page successfully added to collage!
        </div>
        <Button
          v-else
          :disabled="
            form.processing || !selectedCollageId || !hasAvailableCollages
          "
          @click="addToCollage"
        >
          <i class="ri-add-line text-xl mr-1"></i> Add to Collage
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup>
import Button from "@/Components/Button.vue";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { MAX_COLLAGE_PAGES } from "@/constants/collage";
import { useForm } from "@inertiajs/vue3";
import { computed, ref, watch } from "vue";

const { speak, speaking } = useSpeechSynthesis();

const props = defineProps({
  pageId: { type: Number, required: true },
  collages: { type: Array, required: true }
});

const selectedCollageId = ref(null);
const showSuccess = ref(false);

const form = useForm({
  collage_id: null,
  page_id: props.pageId
});

watch(selectedCollageId, (newCollageId) => {
  form.collage_id = newCollageId;
  showSuccess.value = false;
});

const pageExistingCollages = computed(() => {
  return props.collages.filter((collage) =>
    collage.pages.some(
      (page) => page.id === props.pageId && !collage.is_archived
    )
  );
});

const isPageInAnyCollage = computed(() => {
  return pageExistingCollages.value.length > 0;
});

const addToCollage = () => {
  // eslint-disable-next-line no-undef
  form.post(route("collage-page.store"), {
    preserveScroll: true,
    onSuccess: () => {
      speak("Picture successfully added to collage!");
      form.reset();
      showSuccess.value = true;
      setTimeout(() => {
        showSuccess.value = false;
      }, 3000);
    }
  });
};

const getCollageDisplayNumber = (collageId) => {
  const index = props.collages?.findIndex(
    (collage) => collage.id === collageId
  );
  return index !== -1 ? index + 1 : collageId;
};

const availableCollages = computed(() => {
  return props.collages.filter((collage) => !collage.is_archived);
});

const hasAvailableCollages = computed(() => {
  return availableCollages.value.some(
    (collage) => collage.pages.length < MAX_COLLAGE_PAGES
  );
});
</script>
