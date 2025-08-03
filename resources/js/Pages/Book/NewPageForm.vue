<script setup>
/* eslint-disable no-undef */
import Button from "@/Components/Button.vue";
import InputError from "@/Components/InputError.vue";
import {
  default as BreezeLabel,
  default as InputLabel
} from "@/Components/InputLabel.vue";
import VideoIcon from "@/Components/svg/VideoIcon.vue";
import TextInput from "@/Components/TextInput.vue";
import VideoWrapper from "@/Components/VideoWrapper.vue";
import Wysiwyg from "@/Components/Wysiwyg.vue";
import { useVideoOptimization } from "@/composables/useVideoOptimization.js";
import {
  MAX_FILE_SIZE,
  needsVideoOptimization
} from "@/utils/fileValidation.js";
import { useForm, usePage } from "@inertiajs/vue3";
import { useVuelidate } from "@vuelidate/core";
import { computed, onMounted, ref, watch } from "vue";

const emit = defineEmits(["close-form"]);

const props = defineProps({
  book: { type: Object, required: true }
});

const isYouTubeEnabled = computed(
  () => usePage().props.settings["youtube_enabled"]
);

// Multi-file state management
const selectedFiles = ref([]);
const batchProcessing = ref(false);
const batchProgress = ref(0);
const currentFileIndex = ref(0);
const isDragOver = ref(false);
const autoSaveTimeout = ref(null);
const failedUploads = ref([]);
const retryCount = ref(0);
const maxRetries = ref(3);

// Unified preview data - single upload will use this too (as single-item array)
const previewFiles = computed(() => {
  if (
    mediaOption.value === "single" &&
    (form.image || singleFilePreview.value)
  ) {
    // Format single file like multiple upload fileObj for unified template
    return [
      {
        file: form.image ||
          singleFileOriginal.value || {
            name: "Loading...",
            size: 0,
            type: "unknown"
          }, // Use original file info during processing
        preview: singleFilePreview.value,
        processing: singleFileProcessing.value,
        processed: !singleFileProcessing.value,
        processedFile: form.image, // Add processedFile for consistency with multiple upload
        needsOptimization: singleFileOriginal.value
          ? needsVideoOptimization(singleFileOriginal.value)
          : false,
        uploaded: false
      }
    ];
  } else if (mediaOption.value === "multiple") {
    return selectedFiles.value;
  }
  return [];
});

// Single file preview (separate from selectedFiles array)
const singleFilePreview = ref(null);
const singleFileProcessing = ref(false);
const singleFileOriginal = ref(null); // Store original file during processing

const form = useForm({
  book_id: props.book.id,
  content: "",
  image: null,
  video_link: null
});

const imageInput = ref(null);
const dropZone = ref(null);
const mediaOption = ref("single"); // single, multiple, link

const { compressionProgress, optimizationProgress, processMediaFile } =
  useVideoOptimization();

// File size constant imported from shared utility

// Helper function to create file objects consistently
const createFileObject = (file) => ({
  file,
  preview: null,
  processed: false,
  processing: false,
  needsOptimization: needsVideoOptimization(file)
});

// Helper function to handle single file processing (eliminates duplicate validation logic)
const processSingleFile = async (file) => {
  // Store original file immediately for preview display during processing
  singleFileOriginal.value = file;

  // Generate preview FIRST (so user sees it immediately, even during video processing)
  try {
    // All files are images or videos, so always generate preview
    const reader = new FileReader();
    reader.onload = (e) => {
      singleFilePreview.value = e.target.result;
    };
    reader.readAsDataURL(file);
  } catch (error) {
    singleFilePreview.value = null; // Continue without preview
  }

  // Process video AFTER generating preview (so preview shows during processing)
  if (needsVideoOptimization(file)) {
    singleFileProcessing.value = true;
    try {
      const processedFile = await processMediaFile(file);
      form.image = processedFile;
    } catch (error) {
      // Fallback to original file if processing fails
      form.image = file;
    } finally {
      singleFileProcessing.value = false;
    }
  } else {
    // Direct assignment for images and smaller videos
    form.image = file;
  }

  return true;
};

// Auto-save draft functionality
const draftKey = computed(() => `page-draft-${props.book.id}`);
const hasDraft = ref(false);
const draftSaved = ref(false);

const saveDraft = () => {
  // Only save if there's meaningful content
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
      // Ignoring errors related to localStorage (e.g., quota exceeded or unavailable)
      // as they do not impact the core functionality of the application.
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

      // Only load if less than 24 hours old
      if (Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) {
        form.content = draft.content || "";
        form.video_link = draft.video_link || null;
        hasDraft.value = true;

        // Set media option based on what was loaded
        if (draft.video_link) {
          mediaOption.value = "link";
        }
      } else {
        clearDraft();
      }
    } catch (error) {
      clearDraft();
    }
  } else {
    // No draft found in localStorage; nothing to load.
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
    // Only trigger if values actually changed
    if (JSON.stringify(newValues) !== JSON.stringify(oldValues)) {
      clearTimeout(autoSaveTimeout.value);

      // Show auto-saving indicator
      autoSaveTimeout.value = setTimeout(() => {
        saveDraft();
      }, 1000);
    }
  },
  { deep: true }
);

// Simple helper to check if video needs optimization (imported from shared utility)

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Drag and drop functionality
const handleDragOver = (e) => {
  e.preventDefault();
  isDragOver.value = true;
};

const handleDragLeave = (e) => {
  e.preventDefault();
  if (!dropZone.value.contains(e.relatedTarget)) {
    isDragOver.value = false;
  }
};

const handleDrop = async (e) => {
  e.preventDefault();
  isDragOver.value = false;

  const files = Array.from(e.dataTransfer.files);
  if (files.length === 0) return;

  // Handle based on selected mode
  if (mediaOption.value === "single") {
    // Simple single upload: Use centralized processing
    const file = files[0];
    await processSingleFile(file);
    selectedFiles.value = []; // Clear any previous selections
    return;
  } else if (mediaOption.value === "multiple") {
    // Multiple upload mode: Handle all files with full processing
    if (selectedFiles.value.length > 0) {
      // Add new files to existing array
      const newFileObjects = files.map(createFileObject);
      selectedFiles.value.push(...newFileObjects);

      // Generate previews for new files sequentially to avoid mobile memory issues
      for (const fileObj of newFileObjects) {
        await generatePreview(fileObj);
      }
    } else {
      // No existing files, handle as batch
      await handleMultipleFiles(files);
    }
  }
};

// handleSingleFile removed - single mode now uses direct assignment for simplicity

const handleMultipleFiles = async (files) => {
  // Keep current mode (should be "multiple"), don't change it automatically
  selectedFiles.value = files.map(createFileObject);

  // Generate previews for all files (sequentially to avoid mobile memory issues)
  await generatePreviewsSequentially();
};

// Sequential processing to avoid mobile memory issues
const generatePreviewsSequentially = async () => {
  for (let i = 0; i < selectedFiles.value.length; i++) {
    await generatePreview(selectedFiles.value[i]);

    // Add delay between files to prevent memory issues
    if (i < selectedFiles.value.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 300)); // 300ms between files
    }
  }
};

const generatePreview = async (fileObj) => {
  const file = fileObj.file;

  // Initial validation - only return early for truly invalid files
  // Files that need optimization but aren't processed yet are valid and should continue

  // Create preview with Promise-based FileReader for better mobile compatibility
  await new Promise((resolve, reject) => {
    const reader = new FileReader();

    // Add timeout for mobile browsers that might hang
    const timeout = setTimeout(() => {
      reader.abort();
      reject(new Error("FileReader timeout"));
    }, 10000);

    reader.onload = (e) => {
      clearTimeout(timeout);
      fileObj.preview = e.target.result;
      resolve();
    };

    reader.onerror = () => {
      clearTimeout(timeout);
      reject(reader.error);
    };

    reader.readAsDataURL(file);
  }).catch(() => {
    // Continue without preview
  });

  // Process video files with timeout
  if (file.type.startsWith("video/")) {
    fileObj.processing = true;

    // Add timeout to prevent infinite processing
    const processingTimeout = setTimeout(() => {
      fileObj.processing = false;
      fileObj.processedFile = file;
      fileObj.processed = false;
      // Keep original validation if processing times out
    }, 60000); // 60 second timeout

    try {
      fileObj.processedFile = await processMediaFile(file);

      // Clear timeout since processing completed
      clearTimeout(processingTimeout);

      // Re-validate the processed file
      fileObj.validation = validateFile(fileObj.processedFile, true);
      fileObj.processed = true;

      if (fileObj.processedFile.size > MAX_FILE_SIZE) {
        // Video still too large after processing
      }
    } catch (error) {
      clearTimeout(processingTimeout);
      fileObj.processedFile = file;
      fileObj.processed = false;
      // Keep original validation if processing fails
    } finally {
      fileObj.processing = false;
    }
  } else {
    fileObj.processedFile = file;
    fileObj.processed = true;
  }
};

const removeFile = (index) => {
  if (mediaOption.value === "single") {
    // Single upload mode: Clear all single file data
    form.image = null;
    singleFilePreview.value = null;
    singleFileOriginal.value = null;
    singleFileProcessing.value = false;
  } else {
    // Multiple upload mode: Remove specific file from array
    selectedFiles.value.splice(index, 1);

    if (selectedFiles.value.length === 0) {
      // Keep the current mode but clear files
      form.image = null;
    } else if (
      selectedFiles.value.length === 1 &&
      mediaOption.value === "single"
    ) {
      // In single mode with one file remaining, set form.image
      const targetFile =
        selectedFiles.value[0].processedFile || selectedFiles.value[0].file;
      form.image = targetFile;
    }
    // For multiple files remaining, keep current mode and don't set form.image
  }
};

const selectSingle = () => {
  mediaOption.value = "single";
  form.video_link = null;
  selectedFiles.value = [];
  form.image = null; // Clear any existing image when switching modes
  singleFilePreview.value = null; // Clear preview
  singleFileProcessing.value = false; // Clear processing state
  singleFileOriginal.value = null; // Clear original file
};

const selectMultiple = () => {
  mediaOption.value = "multiple";
  form.video_link = null;
  selectedFiles.value = [];
  form.image = null; // Clear any existing image when switching modes
  singleFilePreview.value = null; // Clear preview
  singleFileProcessing.value = false; // Clear processing state
  singleFileOriginal.value = null; // Clear original file
};

const selectLink = () => {
  mediaOption.value = "link";
  selectedFiles.value = [];
  form.image = null;
  singleFilePreview.value = null; // Clear preview
  singleFileProcessing.value = false; // Clear processing state
  singleFileOriginal.value = null; // Clear original file
};

const selectNewImage = () => {
  imageInput.value.click();
};

const updateImagePreview = async (event) => {
  const files = Array.from(event.target.files);

  if (files.length === 0) return;

  // Handle based on selected mode
  if (mediaOption.value === "single") {
    // Simple single upload: Use centralized processing
    const file = files[0];
    await processSingleFile(file);
    selectedFiles.value = []; // Clear any previous selections
    return;
  } else if (mediaOption.value === "multiple") {
    // Multiple upload mode: Handle all files with full processing
    if (selectedFiles.value.length > 0) {
      // Add new files to existing array
      const newFileObjects = files.map(createFileObject);
      selectedFiles.value.push(...newFileObjects);

      // Generate previews for new files sequentially to avoid mobile memory issues
      for (const fileObj of newFileObjects) {
        await generatePreview(fileObj);
      }
    } else {
      // No existing files, handle as batch
      await handleMultipleFiles(files);
    }
  }

  // Clear the input so the same files can be selected again if needed
  event.target.value = "";
};

// Use longer timeouts for reliable batch uploads
const getDeviceUploadTimeout = () => {
  return 90000; // 90 seconds for all devices (increased from 30s)
};

// Batch processing with retry logic
const processBatch = async (specificFiles = null) => {
  if (selectedFiles.value.length === 0) {
    return;
  }

  // Reset failed uploads (but keep retryCount for global tracking)
  failedUploads.value = [];

  // Use specific files for retry, or all valid files for initial upload
  const validFiles =
    specificFiles ||
    selectedFiles.value.filter(
      (fileObj) => !fileObj.needsOptimization || fileObj.processed
    );
  if (validFiles.length === 0) {
    return;
  }

  batchProcessing.value = true;
  currentFileIndex.value = 0;

  // Store original content for first page
  const originalContent = form.content;
  const uploadTimeout = getDeviceUploadTimeout();

  for (let i = 0; i < validFiles.length; i++) {
    const fileObj = validFiles[i];

    // Update display to show which file is currently being uploaded
    currentFileIndex.value = i;
    batchProgress.value = Math.round((i / validFiles.length) * 100);

    let uploadSuccess = false;
    let attemptCount = 0;

    // Retry logic for individual files
    while (!uploadSuccess && attemptCount < maxRetries.value) {
      try {
        // Add longer delay between attempts on retry
        if (attemptCount > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, 2000 * attemptCount)
          ); // 2s, 4s, 6s delays
        }

        // Update the form with current file data
        form.content = i === 0 ? originalContent : ""; // Only add content to first page
        form.image = fileObj.processedFile || fileObj.file;
        form.video_link = null;

        await new Promise((resolve, reject) => {
          // Use dynamic timeout based on device
          const timeout = setTimeout(() => {
            reject(
              new Error(
                `Upload timeout after ${
                  uploadTimeout / 1000
                }s - try reducing file size or check connection`
              )
            );
          }, uploadTimeout);

          form.post(route("pages.store"), {
            // eslint-disable-line no-undef
            onSuccess: () => {
              clearTimeout(timeout);
              resolve();
            },
            onError: (errors) => {
              clearTimeout(timeout);
              reject(errors);
            },
            preserveState: false
          });
        });

        fileObj.uploaded = true;
        uploadSuccess = true;

        // Add longer delay between successful uploads for mobile stability
        if (i < validFiles.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms between uploads
        }
      } catch (error) {
        attemptCount++;
        fileObj.error = error;

        if (attemptCount >= maxRetries.value) {
          // Mark as failed after max retries
          failedUploads.value.push({
            index: i,
            fileName: fileObj.file.name,
            error: error.message || "Upload failed"
          });
        }
      }
    }

    // Update progress to show completed uploads
    batchProgress.value = Math.round(((i + 1) / validFiles.length) * 100);
  }

  batchProgress.value = 100;
  batchProcessing.value = false;

  // Show results summary
  const failedCount = failedUploads.value.length;

  if (failedCount === 0) {
    // All uploads successful
    setTimeout(() => {
      clearDraft();
      retryCount.value = 0; // Reset retry count on successful completion
      emit("close-form");
    }, 1000);
  } else {
    // Some uploads failed
  }
};

// Retry failed uploads
const retryFailedUploads = async () => {
  if (failedUploads.value.length === 0) return;

  retryCount.value++;
  const originalFailedUploads = [...failedUploads.value];

  // Get the actual file objects that failed
  const failedFileObjects = originalFailedUploads
    .map((failed) => selectedFiles.value[failed.index])
    .filter((fileObj) => fileObj && !fileObj.uploaded);

  // Clear previous errors
  failedFileObjects.forEach((fileObj) => {
    fileObj.error = null;
  });

  // Process only the failed files
  await processBatch(failedFileObjects);
};

// Debug function to track Samsung-specific button click issues
const handleSubmitClick = (event) => {
  // Check if button is actually disabled
  if (event.target.disabled) {
    return;
  }
};

// Form submission handler
const handleFormSubmit = async () => {
  // Call the actual submit function
  await submit();
};

// Single or multiple file submission
const submit = async () => {
  if (mediaOption.value === "multiple") {
    // Reset retry count for fresh batch upload
    retryCount.value = 0;
    await processBatch();
    return;
  }

  // For single mode: form.image should already be set directly
  // No complex processing needed - ultra-simple path

  const validated = await v$.value.$validate();

  if (validated) {
    // Universal submission using Inertia.js
    form.post(route("pages.store"), {
      // eslint-disable-line no-undef
      preserveScroll: true,
      onSuccess: () => {
        selectedFiles.value = [];
        form.reset();
        clearDraft();
        retryCount.value = 0;
        emit("close-form");
      },
      onError: () => {
        // Handle upload errors
      }
    });
  }
};

// Validation rules
const rules = computed(() => {
  const fileSizeValidation = (image) => {
    if (!image) return true;
    return image.size < 62914560; // 60MB
  };

  const batchFilesValid = () => {
    if (mediaOption.value === "multiple" && selectedFiles.value.length > 0) {
      return selectedFiles.value.every(
        (fileObj) =>
          !fileObj.needsOptimization ||
          (fileObj.needsOptimization && !fileObj.processed) ||
          fileObj.processed
      );
    }
    return true;
  };

  const atLeastOneRequired = () => {
    if (mediaOption.value === "multiple") {
      return (
        selectedFiles.value.length > 0 &&
        selectedFiles.value.some(
          (fileObj) => !fileObj.needsOptimization || fileObj.processed
        )
      );
    }
    return (
      form.video_link ||
      form.image ||
      (form.content !== "" && form.content !== "<p></p>")
    );
  };

  return {
    form: {
      video_link: { required: atLeastOneRequired },
      image: {
        required: atLeastOneRequired,
        file_size_validation: () => fileSizeValidation(form.image),
        batch_files_valid: batchFilesValid
      },
      content: { required: atLeastOneRequired }
    }
  };
});

let v$ = useVuelidate(rules, form);

onMounted(() => {
  loadDraft();
});
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded m-5 md:w-full p-10">
    <h3 class="text-2xl dark:text-gray-100 w-full border-b mb-7">
      Add New Page{{ selectedFiles.length > 1 ? "s" : "" }}
      <span v-if="selectedFiles.length > 1" class="text-sm text-gray-500">
        ({{ selectedFiles.length }} files selected)
      </span>
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

    <form @submit.prevent="handleFormSubmit">
      <!-- Media Type Selection -->
      <div v-if="isYouTubeEnabled" class="mb-4">
        <div class="flex flex-wrap gap-2 mb-2">
          <Button
            :is-active="mediaOption === 'single'"
            class="rounded-none w-28 justify-center text-sm"
            @click.prevent="selectSingle"
          >
            Single Upload
          </Button>
          <Button
            :is-active="mediaOption === 'multiple'"
            class="rounded-none w-28 justify-center text-sm"
            @click.prevent="selectMultiple"
          >
            Multiple Upload
          </Button>
          <Button
            :is-active="mediaOption === 'link'"
            class="rounded-none w-24 justify-center"
            @click.prevent="selectLink"
          >
            YouTube
          </Button>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          <span v-if="mediaOption === 'single'" class="block">
            📱 Single upload mode
          </span>
          <span v-else-if="mediaOption === 'multiple'" class="block">
            📚 Multiple upload mode (batch processing)
          </span>
          <span v-else-if="mediaOption === 'link'" class="block">
            🎥 YouTube video embedding
          </span>
        </div>
      </div>

      <!-- Media Type Selection (when YouTube is disabled) -->
      <div v-else class="mb-4">
        <div class="flex flex-wrap gap-2 mb-2">
          <Button
            :is-active="mediaOption === 'single'"
            class="rounded-none w-28 justify-center text-sm"
            @click.prevent="selectSingle"
          >
            Single Upload
          </Button>
          <Button
            :is-active="mediaOption === 'multiple'"
            class="rounded-none w-28 justify-center text-sm"
            @click.prevent="selectMultiple"
          >
            Multiple Upload
          </Button>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          <span v-if="mediaOption === 'single'" class="block">
            📱 Single upload mode
          </span>
          <span v-else-if="mediaOption === 'multiple'" class="block">
            📚 Multiple upload mode (batch processing)
          </span>
        </div>
      </div>

      <div class="flex flex-wrap">
        <!-- Upload Section -->
        <div
          v-if="mediaOption === 'single' || mediaOption === 'multiple'"
          class="w-full mb-2"
        >
          <BreezeLabel for="imageInput" value="Media" />

          <!-- Hidden file input -->
          <input
            ref="imageInput"
            type="file"
            class="hidden"
            :multiple="mediaOption === 'multiple'"
            accept="image/*,video/*"
            @change="updateImagePreview"
          />

          <!-- Drag & Drop Zone -->
          <div
            ref="dropZone"
            data-test="drop-zone"
            class="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-500"
            :class="{
              'border-blue-500 bg-blue-50 dark:bg-blue-900/20': isDragOver,
              'border-green-500 bg-green-50 dark:bg-green-900/20':
                selectedFiles.length > 0 && !isDragOver
            }"
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
            @drop="handleDrop"
          >
            <!-- Drag overlay -->
            <div
              v-if="isDragOver"
              class="absolute inset-0 bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 rounded-lg flex items-center justify-center"
            >
              <div class="text-blue-600 dark:text-blue-400 text-lg font-medium">
                <i class="ri-cloud-upload-line"></i>
                <span v-if="mediaOption === 'single'"
                  >Drop file here to upload</span
                >
                <span v-else>Drop files here to upload</span>
              </div>
            </div>

            <!-- Empty state -->
            <div v-if="selectedFiles.length === 0" class="space-y-4">
              <div class="mx-auto w-16 h-16 text-gray-400">
                <i class="ri-cloud-upload-line text-6xl"></i>
              </div>
              <div>
                <p class="text-lg font-medium text-gray-600 dark:text-gray-300">
                  <span v-if="mediaOption === 'single'"
                    >Drag and drop file here</span
                  >
                  <span v-else>Drag and drop files here</span>
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  <span v-if="mediaOption === 'single'"
                    >or click to select a file (images and videos up to
                    60MB)</span
                  >
                  <span v-else
                    >or click to select files (images and videos up to
                    60MB)</span
                  >
                </p>
              </div>
              <Button
                type="button"
                class="mt-4"
                @click.prevent="selectNewImage"
              >
                <span v-if="mediaOption === 'single'">Select Media File</span>
                <span v-else>Select Media Files</span>
              </Button>
            </div>
          </div>

          <!-- Unified File Preview (Single & Multiple) -->
          <div v-if="previewFiles.length > 0" class="mt-4 space-y-4">
            <div
              v-if="mediaOption === 'multiple'"
              class="flex items-center justify-between"
            >
              <h4 class="font-medium text-gray-900 dark:text-gray-100">
                Selected Files ({{ previewFiles.length }})
              </h4>
              <Button
                type="button"
                class="text-sm"
                @click.prevent="selectNewImage"
              >
                Add More Files
              </Button>
            </div>

            <!-- Files Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                v-for="(fileObj, index) in previewFiles"
                :key="index"
                class="relative border border-gray-200 dark:border-gray-600 rounded-lg p-3"
                :class="{
                  'border-amber-300 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/20':
                    fileObj.needsOptimization && !fileObj.processed,
                  'border-green-300 bg-green-50 dark:border-green-600 dark:bg-green-900/20':
                    fileObj.uploaded || fileObj.processed
                }"
              >
                <!-- Remove button -->
                <button
                  type="button"
                  class="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs"
                  @click="removeFile(index)"
                >
                  ×
                </button>

                <!-- File preview -->
                <div class="mb-2">
                  <div v-if="fileObj.preview">
                    <img
                      v-if="fileObj.file.type.startsWith('image/')"
                      :src="fileObj.preview"
                      class="w-full h-24 object-cover rounded"
                      :alt="fileObj.file.name"
                    />
                    <video
                      v-else
                      :src="fileObj.preview"
                      class="w-full h-24 object-cover rounded"
                      muted
                    />
                  </div>
                  <div
                    v-else
                    class="w-full h-24 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center"
                  >
                    <VideoIcon
                      v-if="fileObj.file.type.startsWith('video/')"
                      class="w-8 h-8 text-gray-400"
                    />
                    <i v-else class="ri-image-line text-2xl text-gray-400"></i>
                  </div>
                </div>

                <!-- File info -->
                <div class="text-xs space-y-1">
                  <p class="font-medium truncate" :title="fileObj.file.name">
                    {{ fileObj.file.name }}
                  </p>
                  <p class="text-gray-500">
                    {{ formatFileSize(fileObj.file.size) }}
                  </p>

                  <!-- Processing status -->
                  <div
                    v-if="fileObj.processing"
                    class="flex items-center space-x-1 text-blue-600"
                  >
                    <div
                      class="animate-spin w-3 h-3 border border-blue-600 border-t-transparent rounded-full"
                    ></div>
                    <span
                      v-if="
                        fileObj.needsOptimization && optimizationProgress > 0
                      "
                    >
                      Optimizing... {{ optimizationProgress }}%
                    </span>
                    <span v-else-if="fileObj.needsOptimization">
                      Optimizing large video...
                    </span>
                    <span v-else>Processing...</span>
                  </div>

                  <!-- Optimization Progress Bar -->
                  <div
                    v-if="
                      fileObj.processing &&
                      fileObj.needsOptimization &&
                      optimizationProgress > 0
                    "
                    class="mt-1"
                  >
                    <div
                      class="w-full bg-blue-100 dark:bg-blue-800 rounded-full h-1.5"
                    >
                      <div
                        class="bg-blue-500 h-1.5 rounded-full transition-all duration-300 ease-out"
                        :style="`width: ${optimizationProgress}%`"
                      ></div>
                    </div>
                  </div>

                  <div v-else-if="fileObj.processed" class="text-green-600">
                    <span
                      v-if="
                        fileObj.file.type.startsWith('video/') &&
                        fileObj.file.size !== fileObj.processedFile?.size
                      "
                    >
                      ✓ Optimized ({{ formatFileSize(fileObj.file.size) }} →
                      {{ formatFileSize(fileObj.processedFile.size) }})
                    </span>
                    <span v-else>✓ Ready</span>
                  </div>
                  <div
                    v-else-if="fileObj.needsOptimization && !fileObj.processing"
                    class="text-amber-600"
                  >
                    ⚠️ Large video - will be optimized
                  </div>
                  <div v-else-if="fileObj.uploaded" class="text-green-600">
                    ✓ Uploaded
                  </div>

                  <!-- Validation errors -->
                  <div
                    v-if="fileObj.needsOptimization && !fileObj.processed"
                    class="text-red-600"
                  >
                    <p
                      v-if="
                        fileObj.file.size > MAX_FILE_SIZE &&
                        !fileObj.file.type.startsWith('video/')
                      "
                    >
                      File too large (max 60MB)
                    </p>
                    <p
                      v-if="
                        fileObj.file.size > MAX_FILE_SIZE &&
                        fileObj.file.type.startsWith('video/') &&
                        fileObj.processed
                      "
                    >
                      Video still too large after optimization (max 60MB)
                    </p>
                    <p
                      v-if="
                        ![
                          'image/jpeg',
                          'image/jpg',
                          'image/png',
                          'image/bmp',
                          'image/gif',
                          'image/svg+xml',
                          'image/webp',
                          'video/mp4',
                          'video/avi',
                          'video/quicktime',
                          'video/mpeg',
                          'video/webm',
                          'video/x-matroska'
                        ].includes(fileObj.file.type)
                      "
                    >
                      Unsupported file type
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Batch Processing Progress -->
          <div
            v-if="batchProcessing"
            class="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded"
          >
            <div
              class="flex items-center justify-between text-sm text-blue-700 dark:text-blue-300 mb-2"
            >
              <div class="flex items-center space-x-2">
                <div
                  class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"
                ></div>
                <span
                  v-if="optimizationProgress > 0 && optimizationProgress < 100"
                >
                  Optimizing video {{ currentFileIndex + 1 }}...
                  {{ optimizationProgress }}%
                </span>
                <span v-else>
                  {{
                    retryCount > 0
                      ? "Retrying failed uploads..."
                      : `Uploading files... (${currentFileIndex + 1}/${
                          selectedFiles.filter(
                            (f) => !f.needsOptimization || f.processed
                          ).length
                        })`
                  }}
                </span>
              </div>
              <span class="font-medium">{{ batchProgress }}%</span>
            </div>
            <div class="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
              <div
                class="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                :style="`width: ${batchProgress}%`"
              ></div>
            </div>
            <div
              v-if="retryCount > 0"
              class="mt-2 text-xs text-blue-600 dark:text-blue-400"
            >
              🔄 Using extended timeouts (attempt {{ retryCount + 1 }})
            </div>
          </div>

          <!-- Failed Uploads Display -->
          <div
            v-if="failedUploads.length > 0 && !batchProcessing"
            class="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded"
          >
            <div class="flex items-center justify-between mb-3">
              <h4 class="font-medium text-red-700 dark:text-red-300">
                {{ failedUploads.length }} Upload{{
                  failedUploads.length > 1 ? "s" : ""
                }}
                Failed
              </h4>
              <Button
                type="button"
                class="text-sm bg-red-600 hover:bg-red-700 text-white"
                :disabled="retryCount >= maxRetries"
                @click="retryFailedUploads"
              >
                {{
                  retryCount >= maxRetries
                    ? "Max Retries Reached"
                    : "Retry Failed"
                }}
              </Button>
            </div>
            <div class="space-y-2">
              <div
                v-for="failed in failedUploads"
                :key="failed.index"
                class="text-sm text-red-600 dark:text-red-400 flex items-start space-x-2"
              >
                <span class="font-mono">•</span>
                <div>
                  <div class="font-medium">{{ failed.fileName }}</div>
                  <div class="text-xs opacity-75">{{ failed.error }}</div>
                </div>
              </div>
            </div>
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
          <BreezeLabel for="content" value="Words" />
          <div class="relative">
            <Wysiwyg
              id="content"
              v-model="form.content"
              class="mt-1 block w-full"
            />
            <!-- Auto-save indicator -->
            <div
              v-if="autoSaveTimeout"
              class="absolute top-2 right-2 text-xs text-gray-500 bg-white dark:bg-gray-800 px-2 py-1 rounded border"
            >
              ⏱️ Auto-saving in 1s...
            </div>
          </div>
        </div>
      </div>

      <!-- Error Messages -->
      <div class="mt-4 space-y-2">
        <p
          v-if="
            v$.$errors.length && v$.form.image.file_size_validation.$invalid
          "
          class="text-red-600"
        >
          That video should be less than 60 MB.
        </p>
        <p
          v-if="v$.$errors.length && v$.form.image.batch_files_valid.$invalid"
          class="text-red-600"
        >
          Some files have issues. Red files are invalid and must be removed.
          Amber files are large videos that will be optimized automatically.
        </p>
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
          type="submit"
          class="w-3/4 flex justify-center py-3"
          :class="{ 'opacity-25': form.processing || batchProcessing }"
          :disabled="
            compressionProgress ||
            form.processing ||
            batchProcessing ||
            v$.$error
          "
          @click="handleSubmitClick"
        >
          <span class="text-xl">
            {{
              batchProcessing
                ? `Uploading ${currentFileIndex + 1}/${
                    selectedFiles.filter(
                      (f) => !f.needsOptimization || f.processed
                    ).length
                  }...`
                : compressionProgress
                ? `Optimizing... ${optimizationProgress}%`
                : previewFiles.length > 1
                ? `Create ${
                    previewFiles.filter(
                      (f) => !f.needsOptimization || f.processed
                    ).length
                  } Pages!`
                : "Create Page!"
            }}
          </span>
        </Button>
      </div>
    </form>
  </div>
</template>
