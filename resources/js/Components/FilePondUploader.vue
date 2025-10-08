<script setup>
import { ref, watch, onMounted, defineExpose } from "vue";
import { usePage } from "@inertiajs/vue3";
import vueFilePond from "vue-filepond";
// Import FilePond styles
import "filepond/dist/filepond.min.css";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";
import "filepond-plugin-file-poster/dist/filepond-plugin-file-poster.css";

// Import FilePond plugins
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import FilePondPluginFilePoster from "filepond-plugin-file-poster";

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
    maxFileSize: { type: [String, Number], default: null }, // e.g. '60MB' or 62914560
});

const FilePond = vueFilePond(
    FilePondPluginFileValidateType,
    FilePondPluginImagePreview,
    FilePondPluginFilePoster
);

const pond = ref(null);
const page = usePage();

// Custom server process using traditional XMLHttpRequest with Inertia CSRF token
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

                // Final client-side size gate: never send if still over 60MB AFTER optimization
                if (
                    file &&
                    typeof file.size === "number" &&
                    file.size > MAX_UPLOAD_BYTES
                ) {
                    // For videos, give a more specific message since they should have been optimized
                    if (file.type?.startsWith("video/")) {
                        const msg =
                            "Video is still larger than 60MB after optimization. Please choose a shorter clip or compress further.";
                        emit("error", msg);
                        error(msg);
                    } else {
                        const msg =
                            "File is larger than 60MB and cannot be uploaded.";
                        emit("error", msg);
                        error(msg);
                    }
                    return;
                }
            } catch (_prepErr) {
                // If processing fails, continue with original file but check size again
                file = originalFile;

                // If optimization failed and original file is still too large, reject it
                if (
                    file &&
                    typeof file.size === "number" &&
                    file.size > MAX_UPLOAD_BYTES
                ) {
                    const msg = file.type?.startsWith("video/")
                        ? "Video optimization failed and file is too large (>60MB). Please choose a smaller file."
                        : "File is larger than 60MB and cannot be uploaded.";
                    emit("error", msg);
                    error(msg);
                    return;
                }
            }

            // Create FormData
            const formData = new FormData();
            formData.append("image", file);

            // Add extra data
            Object.keys(props.extraData).forEach((key) => {
                formData.append(key, props.extraData[key]);
            });

            // Create and configure XMLHttpRequest
            xhr = new XMLHttpRequest();

            // Upload progress
            xhr.upload.addEventListener("progress", (e) => {
                if (!aborted && e.lengthComputable) {
                    progress(true, e.loaded, e.total);
                }
            });

            // Handle response
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
                            type: file.type,
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

            // Handle errors
            xhr.addEventListener("error", () => {
                if (aborted) return;
                const errorMsg = "Upload failed due to network error";
                emit("error", errorMsg);
                error(errorMsg);
            });

            // Send request
            xhr.open("POST", props.uploadUrl);
            xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
            xhr.setRequestHeader("X-CSRF-TOKEN", page.props.csrf_token);

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
    } catch (_e) {
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
    } catch (_e) {
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
    } catch (_e) {
        // ignore event binding errors
    }
};

// Track file additions/removals
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
        :before-add-file="beforeAddFile"
        :oninit="oninit"
        credits="false"
        @processfilestart="$emit('processing-start')"
        @processfiles="$emit('all-done')"
        @updatefiles="onUpdateFiles"
    />
</template>
