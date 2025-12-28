<script setup>
/* eslint-disable no-undef */
import Button from "@/Components/Button.vue";
import InputError from "@/Components/InputError.vue";
import {
  default as BreezeLabel,
  default as InputLabel
} from "@/Components/InputLabel.vue";

import FilePondUploader from "@/Components/FilePondUploader.vue";
import MapPicker from "@/Components/Map/MapPicker.vue";
import TextInput from "@/Components/TextInput.vue";
import VideoWrapper from "@/Components/VideoWrapper.vue";
import Wysiwyg from "@/Components/Wysiwyg.vue";
import Accordion from "@/Components/Accordion.vue";
import { useForm, usePage } from "@inertiajs/vue3";
import { useVuelidate } from "@vuelidate/core";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

const isLocationOpen = ref(false);

const emit = defineEmits(["close-form"]);

const props = defineProps({
  book: { type: Object, required: true }
});

const isYouTubeEnabled = computed(
  () => usePage().props.settings["youtube_enabled"]
);

const form = useForm({
  book_id: props.book.id,
  content: "",
  image: null,
  video_link: null,
  latitude: null,
  longitude: null
});

const mediaOption = ref("upload"); // upload, link

const getPagesStoreUrl = () => {
  return route("pages.store");
};

// Auto-save draft functionality
const draftKey = computed(() => `page-draft-${props.book.id}`);
const hasDraft = ref(false);
const draftSaved = ref(false);
const autoSaveTimeout = ref(null);

const saveDraft = () => {
  const hasContent =
    form.content && form.content !== "<p></p>" && form.content.trim() !== "";
  const hasVideoLink = form.video_link && form.video_link.trim();

  if (hasContent || hasVideoLink) {
    try {
      localStorage.setItem(
        draftKey.value,
        JSON.stringify({
          content: form.content,
          video_link: form.video_link,
          timestamp: Date.now()
        })
      );
      draftSaved.value = true;
      setTimeout(() => {
        draftSaved.value = false;
      }, 2000);
    } catch (error) {
      // ignore
    }
  } else {
    clearDraft();
  }

  autoSaveTimeout.value = null;
};

const loadDraft = () => {
  const saved = localStorage.getItem(draftKey.value);
  if (saved) {
    try {
      const draft = JSON.parse(saved);
      if (Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) {
        form.content = draft.content || "";
        form.video_link = draft.video_link || null;
        hasDraft.value = true;
        mediaOption.value = draft.video_link ? "link" : "upload";
      } else {
        clearDraft();
      }
    } catch (error) {
      clearDraft();
    }
  }
};

const clearDraft = (resetForm = false) => {
  localStorage.removeItem(draftKey.value);
  hasDraft.value = false;
  draftSaved.value = false;

  if (resetForm) {
    form.content = "";
    form.video_link = null;
    mediaOption.value = "upload";
  }
};

// Watch for changes and auto-save
watch(
  [() => form.content, () => form.video_link],
  (newValues, oldValues) => {
    if (JSON.stringify(newValues) !== JSON.stringify(oldValues)) {
      clearTimeout(autoSaveTimeout.value);
      autoSaveTimeout.value = setTimeout(() => {
        saveDraft();
      }, 1000);
    }
  },
  { deep: true }
);

// FilePond integration
const uploaderRef = ref(null);
const pondQueueCount = ref(0);
const isUploading = ref(false);

const pondUploadUrl = computed(() => getPagesStoreUrl());
const pondExtraData = computed(() => {
  const data = {
    book_id: form.book_id,
    content: form.content || ""
    // Don't pass video_link to file uploads since that's for text-only submissions
  };

  // Only include latitude/longitude if they have values (not null)
  if (form.latitude != null) {
    data.latitude = form.latitude;
  }
  if (form.longitude != null) {
    data.longitude = form.longitude;
  }

  return data;
});

const hasQueuedFiles = computed(() => {
  const count = Number(pondQueueCount.value) || 0;
  const refCount = Number(uploaderRef.value?.getFileCount?.() || 0);
  return count > 0 || refCount > 0;
});

const onPondQueueUpdate = (count) => {
  pondQueueCount.value = Number(count) || 0;
};

const onPondProcessingStart = () => {
  isUploading.value = true;
};

const onPondProcessed = () => {
  // no-op per file; FilePond handles progress
};

const onPondAllDone = () => {
  try {
    uploaderRef.value?.removeFiles?.();
  } catch (e) {
    // ignore remove files error
  }
  clearDraft();
  form.reset();
  isUploading.value = false;
  emit("close-form");
};

// Simple UI error helpers
const singleError = ref(null);
const scrollToSingleError = () => {
  try {
    const el = document.querySelector("[data-single-error]");
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  } catch (e) {
    // ignore scroll errors
  }
};

// Validation rules (rely on FilePond for file type/size)
const rules = computed(() => {
  const atLeastOneRequired = () => {
    if (hasQueuedFiles.value) return true;
    return (
      form.video_link || (form.content !== "" && form.content !== "<p></p>")
    );
  };

  return {
    form: {
      video_link: { required: atLeastOneRequired },
      image: { required: atLeastOneRequired },
      content: { required: atLeastOneRequired }
    }
  };
});

let v$ = useVuelidate(rules, form);

// Submit handlers
const handleFormSubmit = async (event) => {
  if (event) event.preventDefault();

  if (mediaOption.value === "upload") {
    const queued =
      hasQueuedFiles.value || uploaderRef.value?.getFileCount?.() > 0;
    if (queued) {
      singleError.value = null;
      try {
        // Immediately reflect uploading state in the UI
        isUploading.value = true;
        uploaderRef.value?.process?.();
      } catch (e) {
        isUploading.value = false; // reset on sync failure
        singleError.value = e?.message || "Upload failed.";
        scrollToSingleError();
      }
      return;
    }
  }

  // Otherwise submit text / youtube link only
  try {
    await submitTextOrLinkOnly();
  } catch (e) {
    singleError.value = e?.message || "Submission failed.";
    scrollToSingleError();
  }
};

// Handle "Upload All" button - uses FilePond's native processFiles() method
const handleUploadAll = () => {
  singleError.value = null;
  try {
    isUploading.value = true;
    uploaderRef.value?.process?.();
  } catch (e) {
    isUploading.value = false;
    singleError.value = e?.message || "Upload failed.";
    scrollToSingleError();
  }
};

const submitTextOrLinkOnly = async () => {
  // Guard: require content or video_link
  const hasText =
    form.content && form.content.trim() && form.content !== "<p></p>";
  if (!hasText && !form.video_link) {
    throw new Error("Please add some words or a YouTube link.");
  }

  // Use Inertia form to submit - it handles CSRF automatically
  form.post(route("pages.store"), {
    preserveScroll: true,
    preserveState: true,
    onSuccess: () => {
      clearDraft();
      form.reset();
      emit("close-form");
    },
    onError: (errors) => {
      const errorMessage =
        errors?.message || Object.values(errors)[0] || "Submission failed.";
      throw new Error(errorMessage);
    }
  });
};

// FilePond event handlers
const onPondError = (msg) => {
  singleError.value = msg || "Upload error.";
  scrollToSingleError();
};

// Lifecycle
onMounted(() => {
  loadDraft();
});

onUnmounted(() => {
  // no-op (FilePond cleans itself)
});

const handleAddressFocus = () => {
  isLocationOpen.value = true;
};
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded m-5 md:w-full p-10">
    <h3 class="text-2xl dark:text-gray-100 w-full border-b mb-7">
      Add New Page
    </h3>

    <!-- Draft Status Indicators -->
    <div v-if="hasDraft || draftSaved" class="mb-4">
      <div
        v-if="hasDraft"
        class="mb-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm"
      >
        <div class="flex items-center justify-between">
          <div
            class="flex items-center space-x-2 text-blue-700 dark:text-blue-300"
          >
            <i class="ri-file-text-line w-4 h-4"></i>
            <span
              >📝 Draft restored (text & YouTube links only - files need to be
              re-selected)</span
            >
          </div>
          <button
            type="button"
            class="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-800 dark:hover:bg-blue-700 rounded text-blue-700 dark:text-blue-300"
            @click="clearDraft(true)"
          >
            Clear Draft
          </button>
        </div>
      </div>
      <div
        v-if="draftSaved"
        class="mb-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-sm"
      >
        <div
          class="flex items-center space-x-2 text-green-700 dark:text-green-300"
        >
          <i class="ri-check-line w-4 h-4"></i>
          <span>💾 Draft saved</span>
        </div>
      </div>
    </div>

    <!-- General Upload Error -->
    <div
      v-if="singleError"
      data-single-error
      class="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm"
    >
      <div
        class="flex items-center justify-between text-red-700 dark:text-red-300"
      >
        <div class="flex items-center space-x-2">
          <i class="ri-error-warning-line w-4 h-4"></i>
          <span class="font-medium">Upload Error</span>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-200"
            @click="handleFormSubmit"
          >
            Retry
          </button>
          <button
            type="button"
            class="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 rounded text-red-700 dark:text-red-300"
            @click="singleError = null"
          >
            Dismiss
          </button>
        </div>
      </div>
      <div class="mt-2 text-red-700 dark:text-red-300">
        {{ singleError }}
      </div>
    </div>

    <form enctype="multipart/form-data" @submit.prevent>
      <!-- Media Type Selection -->
      <div v-if="isYouTubeEnabled" class="mb-4">
        <div class="flex flex-wrap gap-2 mb-2">
          <Button
            :is-active="mediaOption === 'upload'"
            class="rounded-none w-24 justify-center text-sm"
            @click.prevent="mediaOption = 'upload'"
          >
            Upload
          </Button>
          <Button
            :is-active="mediaOption === 'link'"
            class="rounded-none w-24 justify-center text-sm"
            @click.prevent="mediaOption = 'link'"
          >
            YouTube
          </Button>
        </div>
      </div>

      <!-- Media Type Selection (when YouTube is disabled) -->
      <div v-else class="mb-4">
        <div class="flex flex-wrap gap-2 mb-2">
          <Button
            :is-active="mediaOption === 'upload'"
            class="rounded-none w-24 justify-center text-sm"
            @click.prevent="mediaOption = 'upload'"
          >
            Upload
          </Button>
        </div>
      </div>

      <div class="flex flex-wrap">
        <!-- Upload Section -->
        <div v-if="mediaOption === 'upload'" class="w-full mb-2">
          <BreezeLabel for="imageInput" value="Media" />

          <!-- FilePond Uploader -->
          <div>
            <FilePondUploader
              ref="uploaderRef"
              :upload-url="pondUploadUrl"
              :allow-multiple="true"
              :accepted-file-types="['image/*', 'video/*']"
              :instant-upload="false"
              :extra-data="pondExtraData"
              @queue-update="onPondQueueUpdate"
              @processing-start="onPondProcessingStart"
              @error="onPondError"
              @processed="onPondProcessed"
              @all-done="onPondAllDone"
            />
          </div>
        </div>

        <!-- YouTube Link Section -->
        <div v-if="mediaOption === 'link'" class="w-full mr-2">
          <InputLabel for="media-link" value="YouTube Link" />
          <TextInput
            id="media-link"
            v-model="form.video_link"
            class="mt-1 mb-3 block w-full"
            placeholder="https://youtube.com/watch?v=..."
          />
          <InputError
            v-if="v$.$errors.length && v$.form.video_link.required.$invalid"
            class="mt-2"
            message="A link to a video is required without any text or upload."
          />

          <div v-if="form.video_link" class="w-1/2">
            <VideoWrapper :url="form.video_link" :controls="false" />
          </div>
        </div>

        <!-- Content Section -->
        <div class="w-full">
          <BreezeLabel for="content" :value="'Words'" />
          <div class="relative">
            <Wysiwyg
              id="content"
              v-model="form.content"
              class="mt-1 block w-full"
            />
            <!-- Auto-save indicator -->
            <div
              v-if="autoSaveTimeout"
              class="absolute top-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded border"
            >
              ⏱️ Auto-saving in 1s...
            </div>
          </div>
        </div>
      </div>

      <!-- Location Section -->
      <div class="w-full mt-4">
        <MapPicker
          v-model:latitude="form.latitude"
          v-model:longitude="form.longitude"
          :open-map="isLocationOpen"
          @address-focus="handleAddressFocus"
        />
      </div>

      <!-- Error Messages -->
      <div class="mt-4 space-y-2">
        <p
          v-if="v$.$errors.length && v$.form.image.required.$invalid"
          class="text-red-600"
        >
          Upload is required without any text on the page.
        </p>
        <p
          v-if="v$.$errors.length && v$.form.content.required.$invalid"
          class="text-red-600"
        >
          Some words are required without an upload.
        </p>
        <p
          v-if="v$.$errors.length && v$.form.video_link.required.$invalid"
          class="text-red-600"
        >
          A link to a video is required without any text or upload.
        </p>
      </div>

      <!-- Submit Section -->
      <div class="flex justify-center mt-5 md:mt-20">
        <Button
          type="button"
          class="w-3/4 flex justify-center py-3"
          :disabled="isUploading || form.processing"
          @click.prevent="
            hasQueuedFiles ? handleUploadAll() : handleFormSubmit()
          "
        >
          <span class="text-xl">
            {{
              isUploading
                ? "Uploading..."
                : hasQueuedFiles
                ? "Upload All Files!"
                : "Create Page!"
            }}
          </span>
        </Button>
      </div>
    </form>
  </div>
</template>
