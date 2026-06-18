<script setup>
import { usePage } from "@inertiajs/vue3";
import { defineExpose, ref, watch } from "vue";
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
  instantUpload: { type: Boolean, default: false }
});

const FilePond = vueFilePond(
  FilePondPluginFileValidateType,
  FilePondPluginImagePreview,
  FilePondPluginFilePoster,
  FilePondPluginMediaPreview
);

const pond = ref(null);
const page = usePage();

// iOS WebKit backs a picker-selected File with a live handle to the Photos
// asset. When a file sits queued (allowMultiple + instantUpload=false means
// files wait in the form until submit) WebKit eventually invalidates that
// handle, after which xhr.send() errors instantly (status 0, readyState 4,
// 0 bytes) and never reaches the server. Reading the bytes into a plain
// in-memory Blob the moment the file is added, while the handle is still
// valid, sidesteps the invalidation entirely. Large files (videos) are left
// to stream directly: they already upload reliably and copying them into RAM
// would risk an out-of-memory crash on mobile.
const MAX_SNAPSHOT_BYTES = 50 * 1024 * 1024;

// native File -> Promise<Blob | null>. Keyed by the File reference, which is
// the same object FilePond hands back to server.process().
const snapshots = new Map();

const onAddFile = (error, item) => {
  const file = item?.file;
  if (error || !file || !file.size || file.size > MAX_SNAPSHOT_BYTES) return;
  // Resolve to null (rather than reject) if the file is somehow already
  // unreadable, so server.process() can fall back / surface a clear error.
  const snapshot = file
    .arrayBuffer()
    .then((buffer) => new Blob([buffer], { type: file.type }))
    .catch(() => null);
  snapshots.set(file, snapshot);
};

const onRemoveFile = (_error, item) => {
  if (item?.file) snapshots.delete(item.file);
};

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
    _fieldName,
    originalFile,
    _metadata,
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

    const send = async (body, bodySource, attempt = 0) => {
      const file = originalFile;
      const startedAt = Date.now();
      let bytesSent = 0;
      const diagnostics = () => {
        const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
        const sizeMb = body.size ? (body.size / (1024 * 1024)).toFixed(2) : "?";
        return (
          `[readyState=${xhr ? xhr.readyState : "?"} ` +
          `online=${typeof navigator !== "undefined" ? navigator.onLine : "?"} ` +
          `elapsed=${elapsedSec}s size=${sizeMb}MB type=${file.type || "?"} ` +
          `body=${bodySource} attempt=${attempt}]`
        );
      };

      const formData = new FormData();
      // Always pass the filename so the server keeps the original extension
      // even when body is an in-memory Blob (which carries no name).
      formData.append("image", body, file.name);

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
          snapshots.delete(originalFile);
          try {
            const response = JSON.parse(xhr.responseText);
            const serverId = response?.id || `${Date.now()}`;
            load(serverId);
          } catch (_e) {
            load(`${Date.now()}`);
          }
        } else {
          snapshots.delete(originalFile);
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

        // A network error before the full body was sent never reached the
        // server (an incomplete multipart body can't be processed), so a
        // retry can't create a duplicate. body.size is the real byte count
        // even for an in-memory Blob, so a 0-byte instant failure now
        // satisfies bytesSent < body.size and actually retries.
        if (bytesSent < body.size && attempt < MAX_NETWORK_ERROR_RETRIES) {
          setTimeout(() => {
            if (!aborted) send(body, bodySource, attempt + 1);
          }, RETRY_BACKOFF_MS * (attempt + 1));
          return;
        }

        snapshots.delete(originalFile);
        const errorMsg = `Upload failed due to network error ${diagnostics()}`;
        emit("error", errorMsg);
        error(errorMsg);
      });

      xhr.addEventListener("timeout", () => {
        if (aborted) return;
        snapshots.delete(originalFile);
        const errorMsg = `Upload timed out. The file may be too large or your connection is slow. ${diagnostics()}`;
        emit("error", errorMsg);
        error(errorMsg);
      });

      xhr.open("POST", props.uploadUrl);
      xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
      xhr.setRequestHeader("X-CSRF-TOKEN", page.props.csrf_token);
      xhr.timeout = calculateUploadTimeout(body.size);

      xhr.send(formData);
    };

    // Resolve the request body before sending. Prefer the in-memory Blob
    // snapshot captured at add time (immune to iOS invalidating the picker
    // File). If there's no snapshot (large file, left to stream) fall back to
    // a fresh read; if that read also fails the File is genuinely dead, so
    // surface a clear, actionable error instead of an opaque network error.
    const start = async () => {
      let body = null;
      let bodySource = "snapshot";

      const snapshot = snapshots.get(originalFile);
      if (snapshot) {
        body = await snapshot;
      }

      if (!body && originalFile.size && originalFile.size <= MAX_SNAPSHOT_BYTES) {
        bodySource = "fresh-read";
        try {
          const buffer = await originalFile.arrayBuffer();
          body = new Blob([buffer], { type: originalFile.type });
        } catch (_e) {
          body = null;
        }
        if (!body) {
          if (aborted) return;
          snapshots.delete(originalFile);
          const errorMsg = `Could not read "${originalFile.name}". Please remove it and add it again.`;
          emit("error", errorMsg);
          error(errorMsg);
          return;
        }
      }

      // Large files with no snapshot: stream the File directly, which already
      // uploads reliably and avoids copying hundreds of MB into memory.
      if (!body) {
        body = originalFile;
        bodySource = "stream";
      }

      if (aborted) return;
      send(body, bodySource, 0);
    };

    start();

    return {
      abort: () => {
        aborted = true;
        if (xhr) {
          xhr.abort();
        }
        snapshots.delete(originalFile);
        abort();
      }
    };
  },
  revert: null
};

// FilePond ItemStatus values we care about.
const STATUS = {
  PROCESSING_COMPLETE: 5,
  PROCESSING_ERROR: 6,
  LOAD_ERROR: 8
};

const isErrored = (s) =>
  s === STATUS.PROCESSING_ERROR || s === STATUS.LOAD_ERROR;

const files = ref([]);
watch(files, (newFiles) => {
  try {
    emit("queue-update", Array.isArray(newFiles) ? newFiles.length : 0);
  } catch (_e) {
    // ignore
  }
});

// Completion is driven by FilePond's `processfiles` event, which fires once the
// whole queue has finished processing. The previous approach watched the
// v-model `files` array for status transitions, but vue-filepond mutates item
// objects in place without changing the array reference, so the (non-deep)
// watch never re-fired on the final PROCESSING_COMPLETE transition and
// "all-done" was never emitted. We read authoritative statuses from getFiles()
// here instead of trusting the watched copy.
const onProcessFiles = () => {
  const items = pond.value?.getFiles?.() || [];
  if (!items.length) return;

  // Only signal "all-done" on a clean batch: at least one completed upload and
  // no errored files. If any file errored we keep it in the queue (status
  // PROCESSING_ERROR) so the Retry button has something to re-process instead
  // of wiping the queue and closing the form.
  const anyErrored = items.some((f) => isErrored(f.status));
  const anyComplete = items.some(
    (f) => f.status === STATUS.PROCESSING_COMPLETE
  );
  if (!anyErrored && anyComplete) {
    emit("all-done");
  }
};

// Process all queued/errored files. Calling processFiles() with no arguments
// lets FilePond decide what to (re)process: it skips files that are already
// PROCESSING_COMPLETE so a retry never re-uploads files that already succeeded,
// while errored files (PROCESSING_ERROR) are re-queued.
const process = () => pond.value?.processFiles();
const getFileCount = () => (pond.value?.getFiles?.() || []).length;
const removeFiles = () => pond.value?.removeFiles?.();

defineExpose({ process, getFileCount, removeFiles, getPond: () => pond.value });

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
    credits="false"
    @addfile="onAddFile"
    @removefile="onRemoveFile"
    @processfilestart="$emit('processing-start')"
    @processfiles="onProcessFiles"
    @updatefiles="onUpdateFiles"
  />
</template>
