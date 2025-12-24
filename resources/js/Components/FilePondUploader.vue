<script setup>
import { usePage } from "@inertiajs/vue3";
import FilePondPluginFilePoster from "filepond-plugin-file-poster";
import "filepond-plugin-file-poster/dist/filepond-plugin-file-poster.css";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";
import FilePondPluginMediaPreview from "filepond-plugin-media-preview";
import "filepond-plugin-media-preview/dist/filepond-plugin-media-preview.min.css";
import "filepond/dist/filepond.min.css";
import { computed, defineExpose, onMounted, ref, watch } from "vue";
import vueFilePond from "vue-filepond";

const emit = defineEmits([
  "error",
  "processed",
  "all-done",
  "queue-update",
  "processing-start",
  "optimizing-start",
  "optimizing-end"
]);

const MAX_UPLOAD_BYTES = 62914560;

const props = defineProps({
  uploadUrl: { type: String, required: true },
  allowMultiple: { type: Boolean, default: false },
  acceptedFileTypes: { type: Array, default: () => ["image/*", "video/*"] },
  extraData: { type: Object, default: () => ({}) },
  labelIdle: {
    type: String,
    default:
      'Drag & Drop your files or <span class="filepond--label-action">Browse</span>'
  },
  instantUpload: { type: Boolean, default: false },
  processVideo: { type: Function, default: null },
  videoThresholdBytes: { type: Number, default: 41943040 },
  maxFileSize: { type: [String, Number], default: null }
});

const FilePond = vueFilePond(
  FilePondPluginFileValidateType,
  FilePondPluginImagePreview,
  FilePondPluginFilePoster,
  FilePondPluginMediaPreview
);

const pond = ref(null);
const page = usePage();
const compressedFiles = new Map();
const MAX_RETRIES = 3;

const server = {
  process: (
    fieldName,
    originalFile,
    metadata,
    load,
    error,
    progress,
    abort
  ) => {
    let aborted = false;
    let currentXhr = null;

    const baseName =
      originalFile.name
        .replace(/_compressed\.[^/.]+$/, "")
        .replace(/\.[^/.]+$/, "") || originalFile.name;
    const fileKey1 = `${originalFile.name}-${originalFile.size}-${originalFile.lastModified}`;
    const fileKey2 = `${originalFile.name}-${originalFile.size}`;
    const fileKey3 = originalFile.name;
    const fileKey4 = `${baseName}-${originalFile.size}`;
    const fileKey5 = baseName;

    let compressedFile = null;

    if (originalFile.type?.startsWith("video/")) {
      compressedFile =
        compressedFiles.get(fileKey1) ||
        compressedFiles.get(fileKey2) ||
        compressedFiles.get(fileKey3) ||
        compressedFiles.get(fileKey4) ||
        compressedFiles.get(fileKey5);

      if (!compressedFile) {
        const keysToCheck = [originalFile.name, baseName];
        for (const checkName of keysToCheck) {
          for (const [key, value] of compressedFiles.entries()) {
            if (key.startsWith(checkName + "-") || key === checkName) {
              compressedFile = value;
              break;
            }
          }
          if (compressedFile) break;
        }
      }
    }

    const fileToUpload = compressedFile || metadata?.file || originalFile;

    if (compressedFile && originalFile.type?.startsWith("video/")) {
      compressedFiles.delete(fileKey1);
      compressedFiles.delete(fileKey2);
      compressedFiles.delete(fileKey3);
      compressedFiles.delete(fileKey4);
      compressedFiles.delete(fileKey5);
      const keysToDelete = [];
      const namesToCheck = [originalFile.name, baseName];
      for (const [key] of compressedFiles.entries()) {
        if (
          namesToCheck.some(
            (name) => key.startsWith(name + "-") || key === name
          )
        ) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach((key) => compressedFiles.delete(key));
    }

    const attemptUpload = (file, attempt = 0) => {
      if (aborted) return;

      if (
        file &&
        typeof file.size === "number" &&
        file.size > MAX_UPLOAD_BYTES
      ) {
        const fileSizeMB = file.size
          ? (file.size / (1024 * 1024)).toFixed(2)
          : "unknown";
        if (file.type?.startsWith("video/")) {
          const msg = `Video is still larger than 60MB after optimization (${fileSizeMB}MB). Please choose a shorter clip or compress further.`;
          emit("error", msg);
          error(msg);
          return;
        } else {
          const msg = `File is larger than 60MB (${fileSizeMB}MB) and cannot be uploaded.`;
          emit("error", msg);
          error(msg);
          return;
        }
      }

      const formData = new FormData();
      formData.append("image", file);

      Object.keys(props.extraData).forEach((key) => {
        formData.append(key, props.extraData[key]);
      });

      const xhr = new XMLHttpRequest();
      currentXhr = xhr;

      xhr.upload.addEventListener("progress", (e) => {
        if (!aborted && e.lengthComputable) {
          progress(true, e.loaded, e.total);
        }
      });

      xhr.addEventListener("load", () => {
        if (aborted) return;

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            const serverId = response?.id || `${Date.now()}`;
            load(serverId);
            emit("processed", {
              name: file.name,
              size: file.size,
              type: file.type
            });
          } catch (_e) {
            load(`${Date.now()}`);
          }
        } else {
          if (attempt < MAX_RETRIES) {
            const delay = attempt === 0 ? 0 : Math.pow(2, attempt - 1) * 1000;
            setTimeout(() => {
              if (!aborted) {
                attemptUpload(file, attempt + 1);
              }
            }, delay);
          } else {
            const errorMsg = `Upload failed (${xhr.status})`;
            emit("error", errorMsg);
            error(errorMsg);
          }
        }
      });

      xhr.addEventListener("error", () => {
        if (aborted) return;

        if (attempt < MAX_RETRIES) {
          const delay = attempt === 0 ? 0 : Math.pow(2, attempt - 1) * 1000;
          setTimeout(() => {
            if (!aborted) {
              attemptUpload(file, attempt + 1);
            }
          }, delay);
        } else {
          const errorMsg = "Upload failed due to network error";
          emit("error", errorMsg);
          error(errorMsg);
        }
      });

      xhr.addEventListener("abort", () => {
        if (!aborted) {
          abort();
        }
      });

      xhr.open("POST", props.uploadUrl);
      xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
      xhr.setRequestHeader("X-CSRF-TOKEN", page.props.csrf_token);
      xhr.send(formData);
    };

    attemptUpload(fileToUpload);

    return {
      abort: () => {
        aborted = true;
        if (currentXhr) {
          currentXhr.abort();
        }
        abort();
      }
    };
  },
  revert: null
};

const isOptimizing = ref(false);
const files = ref([]);
watch(files, (newFiles) => {
  try {
    emit("queue-update", Array.isArray(newFiles) ? newFiles.length : 0);
  } catch (_e) {
    // ignore
  }
  const stillProcessing = newFiles.some((f) => f.status && f.status < 5);
  if (!stillProcessing && newFiles.length > 0) {
    emit("all-done");
  }
});

const process = () => pond.value?.processFiles();
const getFileCount = () => (pond.value?.getFiles?.() || []).length;
const removeFiles = () => pond.value?.removeFiles?.();
const getIsOptimizing = () => isOptimizing.value;

defineExpose({
  process,
  getFileCount,
  removeFiles,
  getPond: () => pond.value,
  getIsOptimizing
});

onMounted(() => {});

const beforeAddFile = async (item) => {
  try {
    const f = item?.file;
    if (
      props.processVideo &&
      f?.type?.startsWith("video/") &&
      typeof f.size === "number" &&
      f.size > props.videoThresholdBytes
    ) {
      isOptimizing.value = true;
      emit("optimizing-start");

      try {
        const transformed = await props.processVideo(f);
        if (transformed instanceof Blob || transformed instanceof File) {
          const name = f.name || "video.mp4";
          const type = transformed.type || f.type || "video/mp4";
          const compressedFile = new File([transformed], name, { type });

          const originalFileKey = `${f.name}-${f.size}-${f.lastModified}`;
          const nameSizeKey = `${f.name}-${f.size}`;
          const compressedFileKey = `${compressedFile.name}-${compressedFile.size}`;
          const nameOnlyKey = f.name;
          compressedFiles.set(originalFileKey, compressedFile);
          compressedFiles.set(nameSizeKey, compressedFile);
          compressedFiles.set(compressedFileKey, compressedFile);
          compressedFiles.set(nameOnlyKey, compressedFile);

          isOptimizing.value = false;
          emit("optimizing-end");
          return compressedFile;
        } else {
          isOptimizing.value = false;
          emit("optimizing-end");
          return item;
        }
      } catch (err) {
        isOptimizing.value = false;
        emit("optimizing-end");
        return item;
      }
    }
  } catch (_e) {
    isOptimizing.value = false;
    emit("optimizing-end");
  }
  return item;
};

const oninit = () => {
  try {
    const instance = pond.value;
    if (instance && typeof instance.on === "function") {
      instance.on("processfiles", () => {
        emit("all-done");
      });
    }
  } catch (_e) {
    // ignore
  }
};

watch(isOptimizing, (optimizing) => {
  try {
    const instance = pond.value;
    if (instance && typeof instance.setOptions === "function") {
      instance.setOptions({
        labelFileLoading: optimizing ? "Optimizing..." : "Loading...",
        labelFileProcessing: optimizing ? "Optimizing..." : "Processing..."
      });
    }
  } catch (_e) {
    // ignore
  }
});

const onUpdateFiles = (newFileList) => {
  emit("queue-update", newFileList.length);
};

const labelFileLoading = computed(() => {
  return isOptimizing.value ? "Optimizing..." : "Loading...";
});

const labelFileProcessing = computed(() => {
  return isOptimizing.value ? "Optimizing..." : "Processing...";
});
</script>

<template>
  <FilePond
    ref="pond"
    v-model="files"
    :allow-multiple="allowMultiple"
    :accepted-file-types="acceptedFileTypes"
    :server="server"
    :instant-upload="instantUpload"
    :label-idle="labelIdle"
    :label-file-loading="labelFileLoading"
    :label-file-processing="labelFileProcessing"
    :before-add-file="beforeAddFile"
    :oninit="oninit"
    :max-file-size="maxFileSize || '500MB'"
    credits="false"
    @processfilestart="$emit('processing-start')"
    @processfiles="$emit('all-done')"
    @updatefiles="onUpdateFiles"
  />
</template>
