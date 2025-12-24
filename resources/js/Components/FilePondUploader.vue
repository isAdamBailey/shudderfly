<script setup>
import { usePage } from "@inertiajs/vue3";
import { defineExpose, onMounted, ref, watch } from "vue";
import vueFilePond from "vue-filepond";
// Import FilePond styles
import "filepond-plugin-file-poster/dist/filepond-plugin-file-poster.css";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";
import "filepond-plugin-media-preview/dist/filepond-plugin-media-preview.min.css";
import "filepond/dist/filepond.min.css";

// Import FilePond plugins
import FilePondPluginFilePoster from "filepond-plugin-file-poster";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import FilePondPluginMediaPreview from "filepond-plugin-media-preview";

const emit = defineEmits([
  "error",
  "processed",
  "all-done",
  "queue-update",
  "processing-start"
]);

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
  maxFileSize: { type: [String, Number], default: null } // e.g. '512MB' or 536870912
});

const FilePond = vueFilePond(
  FilePondPluginFileValidateType,
  FilePondPluginImagePreview,
  FilePondPluginFilePoster,
  FilePondPluginMediaPreview
);

const pond = ref(null);
const page = usePage();

const calculateUploadTimeout = (fileSizeBytes) => {
  const MIN_TIMEOUT_MS = 5 * 60 * 1000;
  const MAX_TIMEOUT_MS = 2 * 60 * 60 * 1000;
  const MIN_BANDWIDTH_BYTES_PER_SEC = 62500;
  const BUFFER_MULTIPLIER = 1.5;

  if (!fileSizeBytes || fileSizeBytes <= 0) {
    return MIN_TIMEOUT_MS;
  }

  const calculatedTimeout =
    (fileSizeBytes / MIN_BANDWIDTH_BYTES_PER_SEC) * BUFFER_MULTIPLIER * 1000;

  return Math.max(MIN_TIMEOUT_MS, Math.min(MAX_TIMEOUT_MS, calculatedTimeout));
};

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
    let xhr = null;

    const send = async () => {
      const file = originalFile;

      const formData = new FormData();
      formData.append("image", file);

      Object.keys(props.extraData).forEach((key) => {
        formData.append(key, props.extraData[key]);
      });

      xhr = new XMLHttpRequest();

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
          const errorMsg = `Upload failed (${xhr.status})`;
          emit("error", errorMsg);
          error(errorMsg);
        }
      });

      xhr.addEventListener("error", () => {
        if (aborted) return;
        const errorMsg = "Upload failed due to network error";
        emit("error", errorMsg);
        error(errorMsg);
      });

      xhr.addEventListener("timeout", () => {
        if (aborted) return;
        const errorMsg =
          "Upload timed out. The file may be too large or your connection is slow.";
        emit("error", errorMsg);
        error(errorMsg);
      });

      xhr.open("POST", props.uploadUrl);
      xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
      xhr.setRequestHeader("X-CSRF-TOKEN", page.props.csrf_token);
      xhr.timeout = calculateUploadTimeout(file.size);

      xhr.send(formData);

      xhr.send(formData);
    };

    // initial send
    send();

    return {
      abort: () => {
        aborted = true;
        if (xhr) {
          xhr.abort();
        }
        abort();
      }
    };
  },
  revert: null
};

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

defineExpose({ process, getFileCount, removeFiles, getPond: () => pond.value });

onMounted(() => {});

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

const onUpdateFiles = (newFileList) => {
  emit("queue-update", newFileList.length);
};
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
    :oninit="oninit"
    credits="false"
    @processfilestart="$emit('processing-start')"
    @processfiles="$emit('all-done')"
    @updatefiles="onUpdateFiles"
  />
</template>
