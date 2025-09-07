<script setup>
import Button from "@/Components/Button.vue";
import BreezeLabel from "@/Components/InputLabel.vue";
import { useForm } from "@inertiajs/vue3";
import Multiselect from "@vueform/multiselect";
import { computed, watch } from "vue";

const props = defineProps({
  book: { type: Object, default: null },
  books: { type: Array, default: null },
  selectedPages: { type: Array, default: () => [] }
});

const emit = defineEmits(["close-form", "selection-changed"]);

const form = useForm({
  page_ids: [],
  action: "",
  target_book_id: null
});

const actionOptions = [
  { value: "delete", label: "Delete Selected Pages" },
  { value: "move_to_top", label: "Move All to Top" },
  { value: "move_to_book", label: "Move to Different Book" }
];

const booksOptions = computed(() => {
  return props.books
    ? props.books
        .filter((book) => book.id !== props.book.id)
        .map((book) => {
          return { value: book.id, label: book.title };
        })
    : [];
});

const selectedCount = computed(() => props.selectedPages.length);

const canSubmit = computed(() => {
  if (selectedCount.value === 0) return false;
  if (form.action === "move_to_book") {
    return form.target_book_id !== null;
  }
  return form.action !== "";
});

const submit = () => {
  if (!canSubmit.value) return;

  // Set the form data
  form.page_ids = props.selectedPages;

  form.post(route("pages.bulk-action"), {
    preserveState: false,
    preserveScroll: false,
    onSuccess: () => {
      form.reset();
      emit("close-form");
    }
  });
};

// Watch for action changes to reset target book
watch(
  () => form.action,
  (newAction) => {
    if (newAction !== "move_to_book") {
      form.target_book_id = null;
    }
  }
);
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded m-5 md:w-full p-10">
    <h3 class="text-2xl dark:text-gray-100 w-full border-b mb-7">
      Bulk Actions
      <span v-if="selectedCount > 0" class="text-sm text-gray-500">
        ({{ selectedCount }} page{{ selectedCount === 1 ? "" : "s" }} selected)
      </span>
    </h3>

    <div v-if="selectedCount === 0" class="text-center py-8">
      <div class="text-gray-500 dark:text-gray-400 mb-4">
        <i class="ri-checkbox-blank-line text-4xl"></i>
      </div>
      <p class="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
        No pages selected
      </p>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Select pages from the grid above to perform bulk actions
      </p>
    </div>

    <form v-else @submit.prevent="submit">
      <div class="space-y-6">
        <!-- Action Selection -->
        <div>
          <BreezeLabel for="action" value="Action" />
          <Multiselect
            id="action"
            v-model="form.action"
            :options="actionOptions"
            track-by="value"
            label="label"
            placeholder="Select an action"
            class="mt-1"
          />
        </div>

        <!-- Target Book Selection (only for move to book action) -->
        <div v-if="form.action === 'move_to_book'">
          <BreezeLabel for="target_book" value="Target Book" />
          <Multiselect
            id="target_book"
            v-model="form.target_book_id"
            :options="booksOptions"
            track-by="value"
            label="label"
            placeholder="Select target book"
            class="mt-1"
          />
        </div>

        <!-- Action Description -->
        <div
          v-if="form.action"
          class="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded"
        >
          <div class="flex items-start space-x-2">
            <i class="ri-information-line text-blue-500 mt-0.5"></i>
            <div class="text-sm text-blue-700 dark:text-blue-300">
              <p v-if="form.action === 'delete'" class="font-medium">
                ⚠️ This will permanently delete {{ selectedCount }} page{{
                  selectedCount === 1 ? "" : "s"
                }}.
              </p>
              <p v-else-if="form.action === 'move_to_top'" class="font-medium">
                📌 This will move all {{ selectedCount }} selected page{{
                  selectedCount === 1 ? "" : "s"
                }}
                to the top of the book.
              </p>
              <p v-else-if="form.action === 'move_to_book'" class="font-medium">
                📚 This will move all {{ selectedCount }} selected page{{
                  selectedCount === 1 ? "" : "s"
                }}
                to the target book.
              </p>
              <p class="mt-1 text-blue-600 dark:text-blue-400">
                This action cannot be undone.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Submit Section -->
      <div class="flex justify-center mt-8">
        <Button
          type="submit"
          class="w-3/4 flex justify-center py-3"
          :class="{
            'opacity-25': form.processing
          }"
          :disabled="!canSubmit || form.processing"
        >
          <span class="text-xl">
            {{
              form.action === "delete"
                ? `Delete ${selectedCount} Page${
                    selectedCount === 1 ? "" : "s"
                  }`
                : form.action === "move_to_top"
                ? `Move ${selectedCount} Page${
                    selectedCount === 1 ? "" : "s"
                  } to Top`
                : form.action === "move_to_book"
                ? `Move ${selectedCount} Page${
                    selectedCount === 1 ? "" : "s"
                  } to Book`
                : "Select Action"
            }}
          </span>
        </Button>
      </div>
    </form>
  </div>
</template>
