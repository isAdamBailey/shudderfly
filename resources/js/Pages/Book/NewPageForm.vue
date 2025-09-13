<script setup>
/* eslint-disable no-undef */
import Button from "@/Components/Button.vue";
import InputError from "@/Components/InputError.vue";
import {
  default as BreezeLabel,
  default as InputLabel
} from "@/Components/InputLabel.vue";

import TextInput from "@/Components/TextInput.vue";
import VideoWrapper from "@/Components/VideoWrapper.vue";
import Wysiwyg from "@/Components/Wysiwyg.vue";
import { useVideoOptimization } from "@/composables/useVideoOptimization.js";
import {
  isAllowedFileType,
  isFileSizeValid,
  MAX_FILE_SIZE,
  needsVideoOptimization
} from "@/utils/fileValidation.js";
import { useForm, usePage } from "@inertiajs/vue3";
import { useVuelidate } from "@vuelidate/core";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import PreviewsGrid from "./PreviewsGrid.vue";

const emit = defineEmits(["close-form"]);

const props = defineProps({
  book: { type: Object, required: true }
});

const isYouTubeEnabled = computed(
  () => usePage().props.settings["youtube_enabled"]
);

const selectedFiles = ref([]);
const batchProcessing = ref(false);
const batchProgress = ref(0);
const currentFileIndex = ref(0);
const autoSaveTimeout = ref(null);
const failedUploads = ref([]);
const isSubmitting = ref(false);
const batchError = ref(null);

const previewFiles = computed(() => {
  if (
    mediaOption.value === "single" &&
    (form.image || singleFilePreview.value)
  ) {
    return [
      {
        file: form.image ||
          singleFileOriginal.value || {
            name: "Loading...",
            size: 0,
            type: "unknown"
          },
        preview: singleFilePreview.value,
        processing: singleFileProcessing.value,
        processed: !singleFileProcessing.value,
        processedFile: form.image,
        needsOptimization:
          singleFileOriginal.value?.type?.startsWith("video/") &&
          singleFileOriginal.value?.size > MAX_FILE_SIZE,
        uploaded: false
      }
    ];
  } else if (mediaOption.value === "multiple") {
    return selectedFiles.value;
  }
  return [];
});

const singleFilePreview = ref(null);
const singleFileProcessing = ref(false);
const singleFileOriginal = ref(null); // Store original file during processing`

const form = useForm({
  book_id: props.book.id,
  content: "",
  image: null,
  video_link: null
});

const imageInput = ref(null);
const addMoreInput = ref(null);
const mediaOption = ref("single"); // single, multiple, link

const { compressionProgress, optimizationProgress, processMediaFile } =
  useVideoOptimization();

// Global optimizing state: true if any optimization is happening
// Removed mobile detection - using consistent behavior across all devices

const isOptimizing = computed(() => {
  // Single-file optimization
  if (singleFileProcessing.value) return true;
  // Multiple selection: any file currently processing
  if (selectedFiles.value && selectedFiles.value.some((f) => f?.processing)) {
    return true;
  }
  // Composable progress signal (1..99 means active)
  const prog = Number(optimizationProgress?.value ?? optimizationProgress);
  return prog > 0 && prog < 100;
});

const createFileObject = (file) => ({
  file,
  preview: null,
  processed: false,
  processing: false,
  needsOptimization: needsVideoOptimization(file)
});

const processSingleFile = async (file) => {
  singleFileOriginal.value = file;

  form.image = file;

  // Revoke any prior object URL preview
  revokeObjectURLIfNeeded(singleFilePreview.value);

  try {
    if (file.type.startsWith("video/")) {
      // Use object URL for video preview (lighter than DataURL)
      singleFilePreview.value = URL.createObjectURL(file);
    } else {
      // Use DataURL for images for crisp thumbnails
      const reader = new FileReader();

      // Add timeout for FileReader operations
      const timeoutDuration = 30000; // 30s timeout

      const timeout = setTimeout(() => {
        reader.abort();
        singleFilePreview.value = null;
      }, timeoutDuration);

      reader.onload = (e) => {
        clearTimeout(timeout);
        singleFilePreview.value = e.target.result;
      };

      reader.onerror = () => {
        clearTimeout(timeout);
        singleFilePreview.value = null;
      };

      reader.readAsDataURL(file);
    }
  } catch (error) {
    singleFilePreview.value = null;
  }

  if (needsVideoOptimization(file)) {
    singleFileProcessing.value = true;
    try {
      const processedFile = await processMediaFile(file);
      form.image = processedFile;
    } catch (error) {
      form.image = file;
    } finally {
      singleFileProcessing.value = false;
    }
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
  }
};

const clearDraft = (resetForm = false) => {
  localStorage.removeItem(draftKey.value);
  hasDraft.value = false;
  draftSaved.value = false;

  if (resetForm) {
    form.content = "";
    form.video_link = null;
    mediaOption.value = "single";
  }
};

// Watch for changes and auto-save
watch(
  [() => form.content, () => form.video_link],
  (newValues, oldValues) => {
    // Only trigger if values actually changed
    if (JSON.stringify(newValues) !== JSON.stringify(oldValues)) {
      clearTimeout(autoSaveTimeout.value);

      autoSaveTimeout.value = setTimeout(() => {
        saveDraft();
      }, 1000);
    }
  },
  { deep: true }
);

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Safely revoke object URLs to avoid memory leaks
const revokeObjectURLIfNeeded = (url) => {
  try {
    if (url && typeof url === "string" && url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  } catch (e) {
    // no-op
  }
};

// Cleanup helper to revoke any previews we created via object URLs
const cleanupPreviews = () => {
  try {
    // Single-file preview
    revokeObjectURLIfNeeded(singleFilePreview.value);
    // Multiple-file previews
    if (selectedFiles.value && selectedFiles.value.length) {
      selectedFiles.value.forEach((f) => revokeObjectURLIfNeeded(f?.preview));
    }
  } catch (e) {
    // no-op
  }
};

const handleMultipleFiles = async (files) => {
  selectedFiles.value = files.map(createFileObject);

  // Generate previews for all files (sequentially to avoid mobile memory issues)
  await generatePreviewsSequentially();

  // Mirror single-file processing: ensure processedFile is set for images
  for (const fileObj of selectedFiles.value) {
    if (!fileObj.file.type.startsWith("video/")) {
      fileObj.processedFile = fileObj.file;
      fileObj.processed = true;
    }
  }
};

// Sequential processing to avoid mobile memory issues
const generatePreviewsSequentially = async () => {
  for (let i = 0; i < selectedFiles.value.length; i++) {
    await generatePreview(selectedFiles.value[i]);

    if (i < selectedFiles.value.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200)); // 300ms between files
    }
  }
};

const generatePreview = async (fileObj) => {
  const file = fileObj.file;

  // Generate preview for images
  if (!file.type.startsWith("video/")) {
    // Image: use DataURL for crisp thumbnails
    try {
      await new Promise((resolve, reject) => {
        const reader = new FileReader();

        const timeout = setTimeout(() => {
          reader.abort();
          reject(new Error("FileReader timeout"));
        }, 30000); // 30s for slower devices

        reader.onload = (e) => {
          clearTimeout(timeout);
          revokeObjectURLIfNeeded(fileObj.preview);
          fileObj.preview = e.target.result;
          resolve();
        };

        reader.onerror = () => {
          clearTimeout(timeout);
          reject(reader.error);
        };

        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.warn("Preview generation failed:", error);
    }
  } else {
    // Video: use object URL preview
    try {
      revokeObjectURLIfNeeded(fileObj.preview);
      fileObj.preview = URL.createObjectURL(file);
    } catch (e) {
      fileObj.preview = null;
    }
  }

  if (file.type.startsWith("video/")) {
    fileObj.processing = true;

    const processingTimeout = setTimeout(() => {
      fileObj.processing = false;
      fileObj.processedFile = file;
      fileObj.processed = false;
    }, 60000); // 60 second timeout

    try {
      fileObj.processedFile = await processMediaFile(file);

      clearTimeout(processingTimeout);

      fileObj.processed = true;
    } catch (error) {
      clearTimeout(processingTimeout);
      fileObj.processedFile = file;
      fileObj.processed = false;
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
    revokeObjectURLIfNeeded(singleFilePreview.value);
    form.image = null;
    singleFilePreview.value = null;
    singleFileOriginal.value = null;
    singleFileProcessing.value = false;
  } else {
    // Multiple upload mode: Remove specific file from array
    const fileObj = selectedFiles.value[index];
    if (fileObj) {
      revokeObjectURLIfNeeded(fileObj.preview);
    }
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
  }
};

const selectSingle = () => {
  cleanupPreviews();
  mediaOption.value = "single";
  form.video_link = null;
  selectedFiles.value = [];
  form.image = null; // Clear any existing image when switching modes
  singleFilePreview.value = null; // Clear preview
  singleFileProcessing.value = false; // Clear processing state
  singleFileOriginal.value = null; // Clear original file
};

const selectMultiple = () => {
  cleanupPreviews();
  mediaOption.value = "multiple";
  form.video_link = null;
  selectedFiles.value = [];
  form.image = null; // Clear any existing image when switching modes
  singleFilePreview.value = null; // Clear preview
  singleFileProcessing.value = false; // Clear processing state
  singleFileOriginal.value = null; // Clear original file
};

const selectLink = () => {
  cleanupPreviews();
  mediaOption.value = "link";
  selectedFiles.value = [];
  form.image = null;
  singleFilePreview.value = null; // Clear preview
  singleFileProcessing.value = false; // Clear processing state
  singleFileOriginal.value = null; // Clear original file
};

const updateImagePreview = async (event) => {
  const files = Array.from(event.target.files);

  if (files.length === 0) return;

  // Add a small delay to ensure the file input is fully processed
  await new Promise((resolve) => setTimeout(resolve, 50));

  // Handle based on selected mode
  if (mediaOption.value === "single") {
    const file = files[0];
    await processSingleFile(file);
    selectedFiles.value = [];
    return;
  } else if (mediaOption.value === "multiple") {
    // Multiple upload mode: Handle all files with full processing
    if (selectedFiles.value.length > 0) {
      const newFileObjects = files.map(createFileObject);
      selectedFiles.value.push(...newFileObjects);

      for (const fileObj of newFileObjects) {
        await generatePreview(fileObj);
      }

      selectedFiles.value = [...selectedFiles.value];
    } else {
      await handleMultipleFiles(files);
    }
  }

  // Reset the input value after processing to allow re-selecting the same files
  if (event.target === imageInput.value) {
    imageInput.value.value = "";
  } else if (event.target === addMoreInput.value) {
    addMoreInput.value.value = "";
  }
};

const processBatch = async (specificFiles = null) => {
  if (selectedFiles.value.length === 0) {
    return;
  }

  failedUploads.value = [];
  batchError.value = null;

  try {
    const filesToUpload = [...(specificFiles || selectedFiles.value)];
    if (filesToUpload.length === 0) {
      return;
    }

    if (isSubmitting.value) return;
    batchProcessing.value = true;
    isSubmitting.value = true;
    currentFileIndex.value = 0;

    const originalContent = form.content;

    for (let i = 0; i < filesToUpload.length; i++) {
      const fileObj = filesToUpload[i];

      currentFileIndex.value = i;
      batchProgress.value = Math.round((i / filesToUpload.length) * 100);

      try {
        const file = fileObj.file;
        let fileForUpload = fileObj.processedFile || file;

        if (
          file.type.startsWith("video/") &&
          needsVideoOptimization(file) &&
          !fileObj.processed
        ) {
          fileObj.processing = true;
          const processingTimeout = setTimeout(() => {
            fileObj.processing = false;
          }, 60000); // 60s timeout
          try {
            fileForUpload = await processMediaFile(file);
            fileObj.processedFile = fileForUpload;
            fileObj.processed = true;
          } catch (e) {
            fileForUpload = file;
            fileObj.processedFile = file;
            fileObj.processed = false;
          } finally {
            clearTimeout(processingTimeout);
            fileObj.processing = false;
          }
        }
        form.content = originalContent;
        form.image = fileForUpload;
        form.video_link = null;

        let uploadSuccessful = false;
        let uploadError = null;

        try {
          // Track if form.post() was actually called
          let formPostCalled = false;
          let formPostStarted = false;

          // Add timeout to prevent hanging uploads
          await Promise.race([
            new Promise((resolve, reject) => {
              try {
                formPostCalled = true;

                form.post(route("pages.store"), {
                  forceFormData: true,
                  preserveState: true,
                  preserveScroll: true,
                  replace: false,
                  onStart: () => {
                    formPostStarted = true;
                  },
                  onSuccess: () => {
                    uploadSuccessful = true;
                    resolve();
                  },
                  onError: (errors) => {
                    uploadError = errors;
                    reject(errors);
                  },
                  onFinish: () => {
                    // Ensure we always resolve/reject
                    if (!uploadSuccessful && !uploadError) {
                      uploadError = new Error(
                        "Upload completed but status unclear"
                      );
                      reject(uploadError);
                    }
                  }
                });
              } catch (e) {
                reject(
                  new Error(`form.post() failed to execute: ${e.message}`)
                );
              }
            }),
            // 30 second timeout to prevent hanging
            new Promise((_, reject) => {
              setTimeout(() => {
                if (!formPostCalled) {
                  reject(
                    new Error(`form.post() was never called for file ${i + 1}`)
                  );
                } else if (!formPostStarted) {
                  reject(
                    new Error(
                      `form.post() called but never started for file ${i + 1}`
                    )
                  );
                } else {
                  reject(new Error(`Upload timeout for file ${i + 1}`));
                }
              }, 30000);
            })
          ]);
        } catch (error) {
          uploadError = error;
        }

        if (uploadSuccessful) {
          fileObj.uploaded = true;

          // Remove the uploaded file from the selectedFiles array
          const liveIndex = selectedFiles.value.findIndex(
            (f) => f.file === fileObj.file
          );
          if (liveIndex !== -1) {
            selectedFiles.value.splice(liveIndex, 1);
          }

          // Clean up preview
          try {
            revokeObjectURLIfNeeded(fileObj.preview);
          } catch (e) {
            // no-op
          }
          fileObj.preview = null;

          if (i < filesToUpload.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } else {
          // If upload was not successful, try a more direct approach for mobile
          if (
            uploadError &&
            uploadError.message &&
            uploadError.message.includes("form.post() was never called")
          ) {
            // Mobile browsers might be blocking form.post() - try manual FormData approach
            try {
              const formData = new FormData();
              formData.append("book_id", form.book_id);
              formData.append("content", form.content);
              formData.append("image", fileForUpload);
              formData.append(
                "_token",
                document
                  .querySelector('meta[name="csrf-token"]')
                  ?.getAttribute("content") || ""
              );

              const response = await fetch(route("pages.store"), {
                method: "POST",
                body: formData,
                headers: {
                  "X-Requested-With": "XMLHttpRequest"
                }
              });

              if (response.ok) {
                uploadSuccessful = true;
                fileObj.uploaded = true;
              } else {
                throw new Error(`Manual upload failed: ${response.status}`);
              }
            } catch (fetchError) {
              const errorMsg = `Fallback upload failed: ${fetchError.message}`;
              throw new Error(`File ${i + 1}: ${errorMsg}`);
            }
          } else {
            // If upload was not successful, provide clear error info
            const errorMsg = uploadError
              ? uploadError.message || "Upload failed"
              : "Upload failed - no response received";
            throw new Error(`File ${i + 1}: ${errorMsg}`);
          }
        }
      } catch (error) {
        fileObj.error = error;
        fileObj.errorMessage =
          (error && error.message) ||
          (typeof error === "string" ? error : "Upload failed");
        failedUploads.value.push({
          index: i,
          fileName: fileObj.file.name,
          error: fileObj.errorMessage
        });

        // Ensure the error is also set in the original selectedFiles array
        const liveIndex = selectedFiles.value.findIndex(
          (f) => f.file === fileObj.file
        );
        if (liveIndex !== -1) {
          selectedFiles.value[liveIndex].error = error;
          selectedFiles.value[liveIndex].errorMessage = fileObj.errorMessage;
        }
      }

      // Update progress to show completed uploads (regardless of success/failure)
      const progressPercent = Math.round(
        ((i + 1) / filesToUpload.length) * 100
      );
      batchProgress.value = progressPercent;
    }

    // Ensure progress shows 100% and processing stops
    batchProgress.value = 100;
    batchProcessing.value = false;
    isSubmitting.value = false;

    // Always show results for a moment, then close if successful
    setTimeout(() => {
      if (failedUploads.value.length === 0) {
        // All successful - clean up and close
        cleanupPreviews();
        clearDraft();
        emit("close-form");
      } else {
        // Some failed - stay open to show errors
        // User can manually close or retry failed uploads
      }
    }, 1500); // Longer delay to show final state
  } catch (error) {
    batchError.value =
      error.message || "An unexpected error occurred during batch processing";
    batchProcessing.value = false;
    isSubmitting.value = false;
  }
};

const handleFormSubmit = async (event) => {
  if (isSubmitting.value || batchProcessing.value) {
    if (event) event.preventDefault();
    return;
  }

  try {
    await submit();
  } catch (error) {
    isSubmitting.value = false;
    batchProcessing.value = false;
  }
};

const submit = async () => {
  if (mediaOption.value === "multiple") {
    await processBatch();
    return;
  }

  if (isSubmitting.value) return;
  isSubmitting.value = true;

  try {
    // Track if form.post() was called for single uploads too
    let formPostStarted = false;

    await Promise.race([
      new Promise((resolve, reject) => {
        form.post(route("pages.store"), {
          forceFormData: true,
          preserveScroll: true,
          onStart: () => {
            formPostStarted = true;
          },
          onSuccess: () => {
            // Revoke any object URL previews before clearing state
            cleanupPreviews();
            selectedFiles.value = [];
            form.reset();
            clearDraft();
            emit("close-form");
            resolve();
          },
          onError: (errors) => {
            reject(errors);
          },
          onFinish: () => {
            isSubmitting.value = false;
          }
        });
      }),
      // 30 second timeout for single uploads too
      new Promise((_, reject) => {
        setTimeout(() => {
          if (!formPostStarted) {
            reject(new Error("Single upload: form.post() never started"));
          } else {
            reject(new Error("Single upload timeout"));
          }
        }, 30000);
      })
    ]);
  } catch (error) {
    isSubmitting.value = false;
    // Let errors be handled naturally by Inertia
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
      return selectedFiles.value.every((fileObj) => {
        const file = fileObj.file;
        if (!isAllowedFileType(file)) return false;
        if (file.type.startsWith("image/")) {
          return isFileSizeValid(file);
        }
        if (file.type.startsWith("video/")) {
          return true;
        }
        return false;
      });
    }
    return true;
  };

  const atLeastOneRequired = () => {
    if (mediaOption.value === "multiple") {
      return (
        selectedFiles.value.length > 0 &&
        selectedFiles.value.some((fileObj) => {
          const file = fileObj.file;
          if (!isAllowedFileType(file)) return false;
          if (file.type.startsWith("image/")) {
            return isFileSizeValid(file);
          }
          if (file.type.startsWith("video/")) {
            return true;
          }
          return false;
        })
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

  // Reset any stuck submission states on mount (mobile recovery)
  isSubmitting.value = false;
  batchProcessing.value = false;
});

onUnmounted(() => {
  cleanupPreviews();
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

    <form enctype="multipart/form-data" @submit.prevent>
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

          <div
            v-if="previewFiles.length === 0"
            data-test="drop-zone"
            class="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-500"
          >
            <!-- File input overlay for mobile compatibility -->
            <input
              ref="imageInput"
              type="file"
              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              :multiple="mediaOption === 'multiple'"
              accept="image/*,video/*"
              @change="updateImagePreview"
            />

            <!-- Empty state -->
            <div class="space-y-3">
              <div class="mx-auto w-12 h-12 text-gray-400">
                <i class="ri-cloud-line text-4xl"></i>
              </div>
              <div>
                <p
                  class="text-base font-medium text-gray-600 dark:text-gray-300"
                >
                  <span v-if="mediaOption === 'single'"
                    >Select a file to upload</span
                  >
                  <span v-else>Select files to upload</span>
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  <span v-if="mediaOption === 'single'"
                    >Tap to select a file</span
                  >
                  <span v-else>Tap to select files</span>
                </p>
              </div>
              <Button type="button" class="mt-2 pointer-events-none">
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
              <div class="relative">
                <input
                  ref="addMoreInput"
                  type="file"
                  class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  multiple
                  accept="image/*,video/*"
                  @change="updateImagePreview"
                />
                <Button type="button" class="text-sm pointer-events-none">
                  Add More Files
                </Button>
              </div>
            </div>

            <PreviewsGrid
              :files="previewFiles"
              :format-file-size="formatFileSize"
              :is-allowed-file-type="isAllowedFileType"
              :is-file-size-valid="isFileSizeValid"
              :optimization-progress="optimizationProgress"
              @remove-file="removeFile"
            />
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
                <span v-else>Uploading files...</span>
              </div>
              <span class="font-medium">{{ batchProgress }}%</span>
            </div>
            <div class="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
              <div
                class="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                :style="`width: ${batchProgress}%`"
              ></div>
            </div>
          </div>

          <!-- Individual Upload Failures -->
          <div
            v-if="failedUploads.length > 0"
            class="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded"
          >
            <div
              class="flex items-center justify-between text-sm text-red-700 dark:text-red-300 mb-3"
            >
              <div class="flex items-center space-x-2">
                <i class="ri-error-warning-line w-4 h-4"></i>
                <span class="font-medium">
                  {{ failedUploads.length }} file(s) failed to upload
                </span>
              </div>
              <button
                type="button"
                class="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 rounded text-red-700 dark:text-red-300"
                @click="failedUploads = []"
              >
                Dismiss
              </button>
            </div>
            <div class="space-y-2">
              <div
                v-for="failure in failedUploads"
                :key="failure.index"
                class="text-sm text-red-600 dark:text-red-400 p-2 bg-red-100 dark:bg-red-800/20 rounded"
              >
                <div class="font-medium">{{ failure.fileName }}</div>
                <div class="text-xs text-red-500 dark:text-red-400">
                  {{ failure.error }}
                </div>
              </div>
            </div>
          </div>

          <!-- General Batch Error -->
          <div
            v-if="batchError"
            class="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded"
          >
            <div
              class="flex items-center justify-between text-sm text-red-700 dark:text-red-300 mb-2"
            >
              <div class="flex items-center space-x-2">
                <i class="ri-error-warning-line w-4 h-4"></i>
                <span class="font-medium">
                  {{
                    batchError.includes("timed out")
                      ? "Upload Timeout Error"
                      : "Batch Processing Error"
                  }}
                </span>
              </div>
              <button
                type="button"
                class="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 rounded text-red-700 dark:text-red-300"
                @click="batchError = null"
              >
                Dismiss
              </button>
            </div>
            <div class="text-sm text-red-600 dark:text-red-400">
              {{ batchError }}
            </div>
            <div
              v-if="batchError.includes('timed out')"
              class="text-xs mt-2 text-amber-600 dark:text-amber-400"
            >
              💡 This usually means the upload is taking too long. Try again or
              check your connection.
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
          <BreezeLabel
            for="content"
            :value="
              mediaOption === 'multiple'
                ? 'Words (will be applied to all images in this batch)'
                : 'Words'
            "
          />
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

      <!-- Error Messages -->
      <div class="mt-4 space-y-2">
        <p
          v-if="
            v$.$errors.length && v$.form.image.file_size_validation.$invalid
          "
          class="text-red-600"
        >
          That file should be less than 60 MB.
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
          type="button"
          class="w-3/4 flex justify-center py-3"
          :class="{
            'opacity-25': form.processing || batchProcessing || isOptimizing
          }"
          :disabled="
            form.processing ||
            isSubmitting ||
            batchProcessing ||
            singleFileProcessing ||
            isOptimizing ||
            v$.$error
          "
          @click.prevent="handleFormSubmit"
        >
          <span class="text-xl">
            {{
              batchProcessing
                ? `Uploading...`
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
