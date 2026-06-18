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

    // Mobile connections sometimes drop mid-handshake or mid-transfer,
    // surfacing as an XHR "error" event. The upload-progress event can
    // report a few KB "sent" before the drop (data queued into the OS
    // socket buffer, not necessarily delivered), so gating retries on
    // bytesSent === 0 missed almost every real-world case and only caught
    // failures in the first few milliseconds. Retrying is safe as long as
    // the transfer wasn't complete: an incomplete multipart body can't have
    // been processed server-side, so there's no risk of creating a
    // duplicate page. Only skip the retry once the full file was handed off
    // and the response itself is what's missing, since the request may have
    // already succeeded server-side.
    const MAX_NETWORK_ERROR_RETRIES = 2;
    const RETRY_BACKOFF_MS = 800;

    const send = async (attempt = 0) => {
      const file = originalFile;
      const startedAt = Date.now();
      let bytesSent = 0;
      const diagnostics = () => {
        const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
        const sizeMb = file.size ? (file.size / (1024 * 1024)).toFixed(2) : "?";
        return (
          `[readyState=${xhr ? xhr.readyState : "?"} ` +
          `online=${typeof navigator !== "undefined" ? navigator.onLine : "?"} ` +
          `elapsed=${elapsedSec}s size=${sizeMb}MB type=${file.type || "?"}]`
        );
      };

      const formData = new FormData();
      formData.append("image", file);

      Object.keys(props.extraData).forEach((key) => {
        formData.append(key, props.extraData[key]);
      });

      xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (!aborted && e.lengthComputable) {
          bytesSent = e.loaded;
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
          let serverMsg = "";
          try {
            serverMsg = JSON.parse(xhr.responseText)?.message || "";
          } catch (_e) {
            // response wasn't JSON (e.g. an HTML error page)
          }
          const errorMsg = serverMsg
            ? `Upload failed (${xhr.status}): ${serverMsg}`
            : `Upload failed (${xhr.status})`;
          emit("error", errorMsg);
          error(errorMsg);
        }
      });

      xhr.addEventListener("error", () => {
        if (aborted) return;

        if (bytesSent < file.size && attempt < MAX_NETWORK_ERROR_RETRIES) {
          setTimeout(() => {
            if (!aborted) send(attempt + 1);
          }, RETRY_BACKOFF_MS * (attempt + 1));
          return;
        }

        const errorMsg = `Upload failed due to network error ${diagnostics()}`;
        emit("error", errorMsg);
        error(errorMsg);
      });

      xhr.addEventListener("timeout", () => {
        if (aborted) return;
        const errorMsg = `Upload timed out. The file may be too large or your connection is slow. ${diagnostics()}`;
        emit("error", errorMsg);
        error(errorMsg);
      });

      xhr.open("POST", props.uploadUrl);
      xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
      xhr.setRequestHeader("X-CSRF-TOKEN", page.props.csrf_token);
      xhr.timeout = calculateUploadTimeout(file.size);

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

// FilePond ItemStatus values we care about.
const STATUS = {
  PROCESSING: 3,
  PROCESSING_COMPLETE: 5,
  PROCESSING_ERROR: 6,
  LOADING: 7,
  LOAD_ERROR: 8,
  PROCESSING_QUEUED: 9
};

const isActive = (s) =>
  s === STATUS.PROCESSING ||
  s === STATUS.PROCESSING_QUEUED ||
  s === STATUS.LOADING;
const isErrored = (s) =>
  s === STATUS.PROCESSING_ERROR || s === STATUS.LOAD_ERROR;

const files = ref([]);
watch(files, (newFiles) => {
  try {
    emit("queue-update", Array.isArray(newFiles) ? newFiles.length : 0);
  } catch (_e) {
    // ignore
  }

  if (!newFiles.length) return;

  // Wait until nothing is actively uploading/queued before deciding.
  if (newFiles.some((f) => isActive(f.status))) return;

  // Only signal "all-done" on a clean batch: at least one completed upload and
  // no errored files. If any file errored we keep it in the queue (status
  // PROCESSING_ERROR) so the Retry button has something to re-process instead
  // of wiping the queue and closing the form.
  const anyErrored = newFiles.some((f) => isErrored(f.status));
  const anyComplete = newFiles.some(
    (f) => f.status === STATUS.PROCESSING_COMPLETE
  );
  if (!anyErrored && anyComplete) {
    emit("all-done");
  }
});

// Process all queued/errored files. Calling processFiles() with no arguments
// lets FilePond decide what to (re)process: it skips files that are already
// PROCESSING_COMPLETE so a retry never re-uploads files that already succeeded,
// while errored files (PROCESSING_ERROR) are re-queued.
const process = () => pond.value?.processFiles();
const getFileCount = () => (pond.value?.getFiles?.() || []).length;
const removeFiles = () => pond.value?.removeFiles?.();

defineExpose({ process, getFileCount, removeFiles, getPond: () => pond.value });

onMounted(() => {});

// Completion is signalled by the status-aware watch on `files`, not here, so a
// batch that finished with errors does not get treated as a success.
const oninit = () => {};

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
    @updatefiles="onUpdateFiles"
  />
</template>
