<script setup>
import { ref, watch, onMounted, defineExpose } from "vue";
import vueFilePond from "vue-filepond";
// Import FilePond styles
import "filepond/dist/filepond.min.css";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";

// Import FilePond plugins
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";

const emit = defineEmits([
    "error",
    "processed",
    "all-done",
    "queue-update",
    "processing-start",
]);

const MAX_UPLOAD_BYTES = 62914560; // 60MB strict cap to send to backend

const props = defineProps({
    uploadUrl: { type: String, required: true },
    allowMultiple: { type: Boolean, default: false },
    acceptedFileTypes: { type: Array, default: () => ["image/*", "video/*"] },
    extraData: { type: Object, default: () => ({}) },
    labelIdle: {
        type: String,
        default:
            'Drag & Drop your files or <span class="filepond--label-action">Browse</span>',
    },
    instantUpload: { type: Boolean, default: false },
    // Client-side video processing hook
    processVideo: { type: Function, default: null },
    videoThresholdBytes: { type: Number, default: 41943040 }, // ~40MB
});

const FilePond = vueFilePond(
    FilePondPluginFileValidateType,
    FilePondPluginImagePreview
);

const pond = ref(null);

const getCsrfToken = () => {
    return (
        document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute("content") || ""
    );
};

const refreshCsrf = async () => {
    try {
        const resp = await fetch("/sanctum/csrf-cookie", {
            method: "GET",
            credentials: "same-origin",
            headers: {
                "X-Requested-With": "XMLHttpRequest",
                Accept: "application/json",
            },
        });
        if (resp.ok) {
            return getCsrfToken();
        }
    } catch (e) {
        // ignore refresh errors; will fall back to current CSRF token
        console.warn("CSRF refresh failed", e);
    }
    return getCsrfToken();
};

// Custom server process using XHR (for progress + retry on 419)
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
        let retried = false;

        const send = async (csrfToken) => {
            let file = originalFile;
            try {
                // If it's a video and larger than the threshold, optimize before upload
                if (
                    props.processVideo &&
                    file?.type?.startsWith("video/") &&
                    typeof file.size === "number" &&
                    file.size > props.videoThresholdBytes
                ) {
                    // Indicate preparing step (simulate small progress)
                    progress(false, 10, 100);
                    const transformed = await props.processVideo(file);
                    if (transformed instanceof Blob) {
                        const name = file.name || "video.mp4";
                        const type =
                            transformed.type || file.type || "video/mp4";
                        file = new File([transformed], name, { type });
                    }
                }

                // Final client-side size gate: never send if still over 60MB
                if (
                    file &&
                    typeof file.size === "number" &&
                    file.size > MAX_UPLOAD_BYTES
                ) {
                    const msg =
                        "Processed video is still larger than 60MB. Please choose a shorter clip or compress further.";
                    emit("error", msg);
                    error(msg);
                    return; // do not proceed
                }

                // Optional: reject oversized images as well (rare)
                if (
                    !file?.type?.startsWith("video/") &&
                    file?.size > MAX_UPLOAD_BYTES
                ) {
                    const msg =
                        "Image is larger than 60MB and cannot be uploaded.";
                    emit("error", msg);
                    error(msg);
                    return;
                }
            } catch (prepErr) {
                // If processing fails, continue with original file
                console.warn(
                    "Video preprocessing failed; uploading original",
                    prepErr
                );
                file = originalFile;
            }

            const formData = new FormData();
            // Append backend-expected fields
            Object.entries(props.extraData || {}).forEach(([k, v]) => {
                if (v !== undefined && v !== null) formData.append(k, v);
            });
            formData.append("image", file, file.name);
            if (csrfToken) formData.append("_token", csrfToken);

            xhr = new XMLHttpRequest();
            xhr.open("POST", props.uploadUrl, true);
            xhr.withCredentials = true;
            xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
            if (csrfToken) xhr.setRequestHeader("X-CSRF-TOKEN", csrfToken);
            xhr.setRequestHeader("Accept", "application/json");

            xhr.upload.onprogress = (e) => {
                if (!aborted && e.lengthComputable) {
                    progress(true, e.loaded, e.total);
                }
            };

            xhr.onerror = () => {
                if (aborted) return;
                emit("error", "Network error while uploading.");
                error("Network error while uploading.");
            };

            xhr.onload = async () => {
                if (aborted) return;
                if (xhr.status === 419 || xhr.status === 401) {
                    // refresh once and retry
                    if (!retried) {
                        retried = true;
                        const newToken = await refreshCsrf();
                        send(newToken);
                        return;
                    }
                }
                // Consider 2xx and 3xx as success (Laravel may return 302 redirects)
                if (xhr.status >= 200 && xhr.status < 400) {
                    try {
                        const serverId = xhr.responseText || `${Date.now()}`;
                        load(serverId);
                        emit("processed", {
                            name: file.name,
                            size: file.size,
                            type: file.type,
                        });
                    } catch (e) {
                        load(`${Date.now()}`);
                    }
                } else {
                    const msg = `Upload failed (${xhr.status}).`;
                    emit("error", msg);
                    error(msg);
                }
            };

            xhr.send(formData);
        };

        // initial send with current csrf token
        const initialToken = getCsrfToken();
        send(initialToken);

        return {
            abort: () => {
                aborted = true;
                try {
                    xhr && xhr.abort();
                } catch (e) {
                    // ignore abort errors
                }
                abort();
            },
        };
    },
    revert: null,
};

// Track when all files are processed and emit queue updates
const files = ref([]);
watch(files, (newFiles) => {
    try {
        emit("queue-update", Array.isArray(newFiles) ? newFiles.length : 0);
    } catch (e) {
        // ignore emit failures in tests
    }
    const stillProcessing = newFiles.some((f) => f.status && f.status < 5);
    if (!stillProcessing && newFiles.length > 0) {
        emit("all-done");
    }
});

// Expose controls to parent
const process = () => pond.value?.processFiles();
const getFileCount = () => (pond.value?.getFiles?.() || []).length;
const removeFiles = () => pond.value?.removeFiles?.();

defineExpose({ process, getFileCount, removeFiles, getPond: () => pond.value });

onMounted(() => {
    // no-op
});

// Pre-add hook: compress large videos as soon as they are added
const beforeAddFile = async (item) => {
    try {
        const f = item?.file;
        if (
            props.processVideo &&
            f?.type?.startsWith("video/") &&
            typeof f.size === "number" &&
            f.size > props.videoThresholdBytes
        ) {
            const transformed = await props.processVideo(f);
            if (transformed instanceof Blob) {
                const name = f.name || "video.mp4";
                const type = transformed.type || f.type || "video/mp4";
                return new File([transformed], name, { type });
            }
        }
    } catch (e) {
        // fallback to original file on preprocessing error
    }
    return item;
};

// Bind FilePond events after init to detect when all processing is done
const oninit = () => {
    try {
        const instance = pond.value;
        if (instance && typeof instance.on === "function") {
            instance.on("processfiles", () => {
                emit("all-done");
            });
        }
    } catch (e) {
        // ignore event binding errors
    }
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
        :before-add-file="beforeAddFile"
        :oninit="oninit"
        credits="false"
        @processfilestart="$emit('processing-start')"
        @processfiles="$emit('all-done')"
    />
</template>
