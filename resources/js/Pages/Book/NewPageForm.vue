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

// Samsung device detection and debugging
const isSamsungDevice = ref(false);
const showDebugPanel = ref(false);
const debugLogs = ref([]);
const sessionLogs = ref([]);
const sessionStartTime = new Date().toISOString();

// Logging for Samsung devices (webhook only)
const addDebugLog = (message, data = null) => {
  const timestamp = new Date().toLocaleTimeString();
  const fullTimestamp = new Date().toISOString();

  // Add to debug panel if visible
  if (showDebugPanel.value) {
    const logEntry = {
      time: timestamp,
      message,
      data: data ? JSON.stringify(data, null, 2) : null
    };

    debugLogs.value.unshift(logEntry); // Add to top

    // Keep only last 20 logs to prevent memory issues
    if (debugLogs.value.length > 20) {
      debugLogs.value = debugLogs.value.slice(0, 20);
    }
  }

  // Collect logs for session-based webhook logging (Samsung devices or debug mode)
  if (isSamsungDevice.value || showDebugPanel.value) {
    sessionLogs.value.push({
      timestamp: fullTimestamp,
      localTime: timestamp,
      message,
      data
    });
  }
};

// Send entire session logs as one webhook
const sendSessionLogs = async (reason = "manual") => {
  if (sessionLogs.value.length === 0) return;

  try {
    const webhookUrl =
      "https://webhook.site/577d1cc1-d6c5-4417-8470-1bc029e377c6";

    const sessionData = {
      sessionId:
        sessionStorage.getItem("debug-session-id") || generateSessionId(),
      sessionStart: sessionStartTime,
      sessionEnd: new Date().toISOString(),
      sessionDuration: Date.now() - new Date(sessionStartTime).getTime(),
      reason, // why session was sent (manual, page-unload, form-complete, etc.)
      userAgent: navigator.userAgent,
      url: window.location.href,
      platform: navigator.platform,
      vendor: navigator.vendor,
      totalLogs: sessionLogs.value.length,
      logs: sessionLogs.value
    };

    // Use text/plain to avoid CORS preflight OPTIONS requests
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain"
      },
      body: JSON.stringify(sessionData)
    });

    // Clear session logs after sending
    sessionLogs.value = [];

    return true;
  } catch (error) {
    // Silently fail if logging service is down
    return false;
  }
};

// Generate unique session ID for tracking
const generateSessionId = () => {
  const sessionId =
    "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  sessionStorage.setItem("debug-session-id", sessionId);
  return sessionId;
};

const form = useForm({
  book_id: props.book.id,
  content: "",
  image: null,
  video_link: null
});

const imageInput = ref(null);
const dropZone = ref(null);
const mediaOption = ref("upload"); // upload, link, batch

const { compressionProgress, optimizationProgress, processMediaFile } =
  useVideoOptimization();

// Helper function to create file objects consistently
const createFileObject = (file) => ({
  file,
  preview: null,
  processed: false,
  processing: false,
  validation: validateFile(file)
});

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

// File validation helpers
const validateFile = (file, isProcessed = false) => {
  const maxSize = 62914560; // 60MB
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/bmp",
    "image/gif",
    "image/svg+xml",
    "image/webp",
    "video/mp4",
    "video/avi",
    "video/quicktime",
    "video/mpeg",
    "video/webm",
    "video/x-matroska"
  ];

  // For videos, be more lenient with initial size if they haven't been processed yet
  const sizeLimit =
    file.type.startsWith("video/") && !isProcessed ? 500000000 : maxSize; // 500MB for unprocessed videos

  return {
    valid: file.size <= sizeLimit && allowedTypes.includes(file.type),
    sizeError: file.size > sizeLimit,
    typeError: !allowedTypes.includes(file.type),
    size: file.size,
    type: file.type,
    needsOptimization:
      file.type.startsWith("video/") && file.size > maxSize && !isProcessed
  };
};

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

  // If we already have files selected, add new ones to the existing array
  if (selectedFiles.value.length > 0) {
    const newFileObjects = files.map(createFileObject);

    selectedFiles.value.push(...newFileObjects);
    mediaOption.value = "batch";

    // Generate previews for new files sequentially to avoid mobile memory issues
    for (const fileObj of newFileObjects) {
      await generatePreview(fileObj);
    }
  } else {
    // No existing files, handle normally
    if (files.length === 1) {
      await handleSingleFile(files[0]);
    } else if (files.length > 1) {
      await handleMultipleFiles(files);
    }
  }
};

const handleSingleFile = async (file) => {
  addDebugLog("📁 handleSingleFile called", {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type
  });

  const fileObject = createFileObject(file);
  if (!fileObject.validation.valid) {
    addDebugLog("❌ File validation failed", fileObject.validation);
    return;
  }

  selectedFiles.value = [fileObject];
  await generatePreview(fileObject);
  form.image = fileObject.processedFile || file;

  addDebugLog("✅ form.image set", {
    hasFormImage: !!form.image,
    isProcessedFile: !!fileObject.processedFile,
    imageType: form.image ? form.image.constructor.name : null
  });
};

const handleMultipleFiles = async (files) => {
  mediaOption.value = "batch";
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

  // Initial validation - more lenient for videos that might need optimization
  if (!fileObj.validation?.valid && !fileObj.validation?.needsOptimization) {
    return;
  }

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

      if (!fileObj.validation?.valid) {
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
  selectedFiles.value.splice(index, 1);
  if (selectedFiles.value.length === 0) {
    mediaOption.value = "upload";
    form.image = null;
  } else if (selectedFiles.value.length === 1) {
    mediaOption.value = "upload";
    form.image =
      selectedFiles.value[0].processedFile || selectedFiles.value[0].file;
  }
};

const selectUpload = () => {
  mediaOption.value = "upload";
  form.video_link = null;
  selectedFiles.value = [];
};

const selectLink = () => {
  mediaOption.value = "link";
  selectedFiles.value = [];
  form.image = null;
};

const selectNewImage = () => {
  imageInput.value.click();
};

const updateImagePreview = async (event) => {
  const files = Array.from(event.target.files);

  addDebugLog("📎 File selection event", {
    filesCount: files.length,
    fileNames: files.map((f) => f.name),
    existingFilesCount: selectedFiles.value.length
  });

  if (files.length === 0) {
    addDebugLog("⚠️ No files selected, returning");
    return;
  }

  // If we already have files selected, add new ones to the existing array
  if (selectedFiles.value.length > 0) {
    const newFileObjects = files.map(createFileObject);

    selectedFiles.value.push(...newFileObjects);
    mediaOption.value = "batch";

    // Generate previews for new files sequentially to avoid mobile memory issues
    for (const fileObj of newFileObjects) {
      await generatePreview(fileObj);
    }
  } else {
    // No existing files, handle normally
    if (files.length === 1) {
      await handleSingleFile(files[0]);
    } else if (files.length > 1) {
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
  addDebugLog("📦 processBatch called", {
    selectedFilesCount: selectedFiles.value.length,
    specificFiles: specificFiles?.length || 0
  });

  if (selectedFiles.value.length === 0) {
    addDebugLog("❌ No files to process, returning");
    return;
  }

  // Reset failed uploads (but keep retryCount for global tracking)
  failedUploads.value = [];

  // Use specific files for retry, or all valid files for initial upload
  const validFiles =
    specificFiles ||
    selectedFiles.value.filter((fileObj) => fileObj.validation?.valid);
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
  addDebugLog("🖱️ SUBMIT BUTTON CLICKED");

  addDebugLog("Event details:", {
    type: event.type,
    target: event.target.tagName,
    isTrusted: event.isTrusted,
    timeStamp: event.timeStamp
  });

  addDebugLog("Button state:", {
    disabled: event.target.disabled,
    processing: form.processing,
    batchProcessing: batchProcessing.value,
    compressionProgress: compressionProgress.value,
    validationError: v$?.value?.$error
  });

  addDebugLog("Form state:", {
    mediaOption: mediaOption.value,
    selectedFilesCount: selectedFiles.value.length,
    hasContent: !!form.content,
    hasVideoLink: !!form.video_link,
    hasImage: !!form.image
  });

  // Check if button is actually disabled
  if (event.target.disabled) {
    addDebugLog("❌ Button is disabled - click should not proceed");
    return;
  }

  addDebugLog("✅ Button click should trigger form submission");
};

// Form submission handler with debugging
const handleFormSubmit = async (event) => {
  addDebugLog("📝 FORM SUBMIT EVENT TRIGGERED");

  addDebugLog("Form event details:", {
    type: event.type,
    target: event.target.tagName,
    isTrusted: event.isTrusted,
    defaultPrevented: event.defaultPrevented
  });

  // Call the actual submit function
  await submit();
};

// Single file submission
const submit = async () => {
  addDebugLog("🚀 Submit function called", {
    mediaOption: mediaOption.value,
    filesCount: selectedFiles.value.length,
    hasContent: !!form.content,
    hasVideoLink: !!form.video_link
  });

  if (mediaOption.value === "batch") {
    addDebugLog("📦 Processing batch upload");
    // Reset retry count for fresh batch upload
    retryCount.value = 0;
    await processBatch();
    return;
  }

  addDebugLog("🔍 Validating form...");
  const validated = await v$.value.$validate();
  addDebugLog("Form validation result:", { validated });

  if (validated) {
    addDebugLog("✅ Form valid, posting to server...");
    addDebugLog("📤 Form data being sent:", {
      book_id: form.book_id,
      content: form.content,
      video_link: form.video_link,
      hasImage: !!form.image,
      imageType: form.image ? form.image.constructor.name : null,
      imageSize: form.image ? form.image.size : null,
      imageName: form.image ? form.image.name : null
    });

    // Final check of all form properties
    addDebugLog("🔍 Complete form object:", {
      allKeys: Object.keys(form),
      formData: Object.fromEntries(
        Object.keys(form).map((key) => [key, typeof form[key]])
      ),
      isDirty: form.isDirty,
      hasErrors: form.hasErrors,
      processing: form.processing
    });

    form.post(route("pages.store"), {
      // eslint-disable-line no-undef
      onSuccess: () => {
        addDebugLog("🎉 Upload successful");
        selectedFiles.value = [];
        form.reset();
        clearDraft();
        retryCount.value = 0; // Reset retry count on successful submission

        // Send session logs on successful form submission
        if (isSamsungDevice.value || showDebugPanel.value) {
          sendSessionLogs("form-success");
        }

        emit("close-form");
      },
      onError: (errors) => {
        addDebugLog("❌ Upload failed with errors:", errors);
      }
    });
  } else {
    addDebugLog("❌ Form validation failed", { errors: v$.value.$errors });
  }
};

// Validation rules
const rules = computed(() => {
  const fileSizeValidation = (image) => {
    if (!image) return true;
    return image.size < 62914560; // 60MB
  };

  const batchFilesValid = () => {
    if (mediaOption.value === "batch" && selectedFiles.value.length > 0) {
      return selectedFiles.value.every(
        (fileObj) =>
          fileObj.validation?.valid ||
          (fileObj.validation?.needsOptimization && !fileObj.processed) ||
          (fileObj.processed && fileObj.validation?.valid)
      );
    }
    return true;
  };

  const atLeastOneRequired = () => {
    if (mediaOption.value === "batch") {
      return (
        selectedFiles.value.length > 0 &&
        selectedFiles.value.some((fileObj) => fileObj.validation?.valid)
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

  // Detect Samsung devices for webhook logging
  const userAgent = navigator.userAgent;
  const isAndroid = /android/i.test(userAgent);

  // Samsung detection (handles privacy-focused user agents)
  const isSamsung =
    /samsung|sm-|gt-|sch-/i.test(userAgent) ||
    /samsungbrowser/i.test(userAgent) ||
    // Chrome on Samsung often shows "Linux; Android X; K" due to privacy
    (isAndroid &&
      /linux.*android.*; k\)/i.test(userAgent) &&
      navigator.vendor === "Google Inc.") ||
    // Check for Samsung-specific browser features
    (isAndroid &&
      navigator.userAgentData &&
      navigator.userAgentData.brands?.some((b) =>
        b.brand.toLowerCase().includes("samsung")
      ));

  // Enable Samsung device logging (but not debug panel)
  if (isSamsung && isAndroid) {
    isSamsungDevice.value = true;
  }

  // Only show debug panel when explicitly requested
  if (window.location.search.includes("force-debug=1")) {
    showDebugPanel.value = true;
    isSamsungDevice.value = true; // Enable webhook logging in debug mode
    addDebugLog("🔍 DEBUG MODE ENABLED");
  }

  // Log device info and start monitoring (this will go to webhook)
  if (isSamsungDevice.value) {
    if (isSamsung && isAndroid) {
      addDebugLog("🔍 Samsung Device DETECTED");
    } else {
      addDebugLog("🔍 Debug Mode ENABLED");
    }
    addDebugLog("Device info:", {
      userAgent: userAgent,
      platform: navigator.platform,
      vendor: navigator.vendor,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      touchSupport: "ontouchstart" in window,
      screenSize: `${screen.width}x${screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      pixelRatio: window.devicePixelRatio
    });

    // Test button functionality
    setTimeout(() => {
      const submitButton = document.querySelector('button[type="submit"]');
      if (submitButton) {
        addDebugLog("🔘 Submit button found:", {
          disabled: submitButton.disabled,
          style: submitButton.style.cssText,
          classes: submitButton.className
        });
      } else {
        addDebugLog("❌ Submit button not found in DOM");
      }
    }, 1000);

    // Add error listener for Samsung debugging
    window.addEventListener("error", (event) => {
      addDebugLog("❌ JavaScript error:", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Add unhandled promise rejection listener
    window.addEventListener("unhandledrejection", (event) => {
      addDebugLog("❌ Promise rejection:", event.reason);
    });

    // Add manual submit trigger for debugging
    window.debugSubmit = () => {
      addDebugLog("🔧 Manual submit triggered for debugging");
      submit();
    };

    if (isSamsung && isAndroid) {
      addDebugLog("💡 Webhook logging enabled for Samsung device");
    } else {
      addDebugLog("💡 Webhook logging enabled for debug mode");
    }

    // Auto-send session logs on page unload
    window.addEventListener("beforeunload", () => {
      sendSessionLogs("page-unload");
    });

    // Auto-send session logs on visibility change (mobile background)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        sendSessionLogs("page-hidden");
      }
    });
  }
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

    <!-- Debug Panel (only shown when ?force-debug=1 is in URL) -->
    <div
      v-if="showDebugPanel"
      class="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded"
    >
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-bold text-yellow-800 dark:text-yellow-200">
          🔍 Debug Panel
        </h4>
        <div class="flex space-x-1">
          <button
            type="button"
            class="text-xs px-2 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded"
            :disabled="sessionLogs.length === 0"
            @click="() => sendSessionLogs('manual')"
          >
            Send Session ({{ sessionLogs.length }})
          </button>
          <button
            type="button"
            class="text-xs px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded"
            @click="
              () => {
                addDebugLog('🔧 Manual submit test');
                submit();
              }
            "
          >
            Test Submit
          </button>
          <button
            type="button"
            class="text-xs px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded"
            @click="debugLogs = []"
          >
            Clear Logs
          </button>
          <button
            type="button"
            class="text-xs px-2 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded"
            @click="showDebugPanel = false"
          >
            Hide
          </button>
        </div>
      </div>

      <div class="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
        Debug mode enabled with ?force-debug=1. Session logs are collected and
        sent to webhook automatically on form completion or page exit. Use "Send
        Session" to manually send {{ sessionLogs.length }} collected log{{
          sessionLogs.length !== 1 ? "s" : ""
        }}.
      </div>

      <!-- Debug Logs -->
      <div
        v-if="debugLogs.length > 0"
        class="max-h-60 overflow-y-auto space-y-2"
      >
        <div
          v-for="(log, index) in debugLogs"
          :key="index"
          class="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-xs"
        >
          <div class="flex items-start justify-between">
            <span class="font-mono text-blue-600 dark:text-blue-400"
              >[{{ log.time }}]</span
            >
          </div>
          <div class="font-medium text-gray-900 dark:text-gray-100 mt-1">
            {{ log.message }}
          </div>
          <div
            v-if="log.data"
            class="mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded font-mono text-xs text-gray-600 dark:text-gray-300 overflow-x-auto"
          >
            {{ log.data }}
          </div>
        </div>
      </div>

      <div v-else class="text-center text-yellow-600 dark:text-yellow-400 py-4">
        No debug logs yet. Try uploading files to see debug information.
      </div>
    </div>

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
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
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
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>💾 Draft saved</span>
        </div>
      </div>
    </div>

    <form @submit.prevent="handleFormSubmit">
      <!-- Media Type Selection -->
      <div v-if="isYouTubeEnabled" class="mb-4">
        <Button
          :is-active="mediaOption === 'upload'"
          class="rounded-none w-24 justify-center"
          @click.prevent="selectUpload"
        >
          Upload
        </Button>
        <Button
          :is-active="mediaOption === 'link'"
          class="rounded-none w-24 justify-center"
          @click.prevent="selectLink"
        >
          YouTube
        </Button>
      </div>

      <div class="flex flex-wrap">
        <!-- Upload Section -->
        <div
          v-if="mediaOption === 'upload' || mediaOption === 'batch'"
          class="w-full mb-2"
        >
          <BreezeLabel for="imageInput" value="Media" />

          <!-- Hidden file input -->
          <input
            ref="imageInput"
            type="file"
            class="hidden"
            multiple
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
                Drop files here to upload
              </div>
            </div>

            <!-- Empty state -->
            <div v-if="selectedFiles.length === 0" class="space-y-4">
              <div class="mx-auto w-16 h-16 text-gray-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <div>
                <p class="text-lg font-medium text-gray-600 dark:text-gray-300">
                  Drag and drop files here
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  or click to select files (images and videos up to 60MB)
                </p>
              </div>
              <Button
                type="button"
                class="mt-4"
                @click.prevent="selectNewImage"
              >
                Select Media Files
              </Button>
            </div>
          </div>

          <!-- Selected Files Preview -->
          <div v-if="selectedFiles.length > 0" class="mt-4 space-y-4">
            <div class="flex items-center justify-between">
              <h4 class="font-medium text-gray-900 dark:text-gray-100">
                Selected Files ({{ selectedFiles.length }})
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
                v-for="(fileObj, index) in selectedFiles"
                :key="index"
                class="relative border border-gray-200 dark:border-gray-600 rounded-lg p-3"
                :class="{
                  'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-900/20':
                    !fileObj.validation?.valid &&
                    !fileObj.validation?.needsOptimization,
                  'border-amber-300 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/20':
                    fileObj.validation?.needsOptimization && !fileObj.processed,
                  'border-green-300 bg-green-50 dark:border-green-600 dark:bg-green-900/20':
                    fileObj.uploaded ||
                    (fileObj.processed && fileObj.validation?.valid)
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
                      v-else-if="fileObj.file.type.startsWith('video/')"
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
                    <svg
                      v-else
                      class="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
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
                        fileObj.validation?.needsOptimization &&
                        optimizationProgress > 0
                      "
                    >
                      Optimizing... {{ optimizationProgress }}%
                    </span>
                    <span v-else-if="fileObj.validation?.needsOptimization">
                      Optimizing large video...
                    </span>
                    <span v-else>Processing...</span>
                  </div>

                  <!-- Optimization Progress Bar -->
                  <div
                    v-if="
                      fileObj.processing &&
                      fileObj.validation?.needsOptimization &&
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

                  <div
                    v-else-if="fileObj.processed && fileObj.validation?.valid"
                    class="text-green-600"
                  >
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
                    v-else-if="
                      fileObj.validation?.needsOptimization &&
                      !fileObj.processing
                    "
                    class="text-amber-600"
                  >
                    ⚠️ Large video - will be optimized
                  </div>
                  <div v-else-if="fileObj.uploaded" class="text-green-600">
                    ✓ Uploaded
                  </div>

                  <!-- Validation errors -->
                  <div
                    v-if="
                      !fileObj.validation?.valid &&
                      !fileObj.validation?.needsOptimization
                    "
                    class="text-red-600"
                  >
                    <p
                      v-if="
                        fileObj.validation?.sizeError &&
                        !fileObj.file.type.startsWith('video/')
                      "
                    >
                      File too large (max 60MB)
                    </p>
                    <p
                      v-if="
                        fileObj.validation?.sizeError &&
                        fileObj.file.type.startsWith('video/') &&
                        fileObj.processed
                      "
                    >
                      Video still too large after optimization (max 60MB)
                    </p>
                    <p v-if="fileObj.validation?.typeError">
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
                          selectedFiles.filter((f) => f.validation.valid).length
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
                    selectedFiles.filter((f) => f.validation.valid).length
                  }...`
                : compressionProgress
                ? `Optimizing... ${optimizationProgress}%`
                : selectedFiles.length > 1
                ? `Create ${
                    selectedFiles.filter((f) => f.validation.valid).length
                  } Pages!`
                : "Create Page!"
            }}
          </span>
        </Button>
      </div>
    </form>
  </div>
</template>
