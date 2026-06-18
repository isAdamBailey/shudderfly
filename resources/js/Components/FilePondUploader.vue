<script setup>
import { usePage } from "@inertiajs/vue3";
import { ref } from "vue";
import { FileStatus } from "filepond";
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
    "processing-start",
]);

defineProps({
    allowMultiple: { type: Boolean, default: false },
    acceptedFileTypes: { type: Array, default: () => ["image/*", "video/*"] },
    labelIdle: {
        type: String,
        default:
            'Drag & Drop your files or <span class="filepond--label-action">Browse</span>',
    },
    maxFileSize: { type: [String, Number], default: null }, // e.g. '512MB' or 536870912
});

const FilePond = vueFilePond(
    FilePondPluginFileValidateType,
    FilePondPluginImagePreview,
    FilePondPluginFilePoster,
    FilePondPluginMediaPreview
);

const pond = ref(null);
const files = ref([]);
const page = usePage();

// laravel-filepond exposes every action on the same /filepond URL, differentiated
// by HTTP verb (POST/PATCH/HEAD/DELETE). FilePond's transfer layer handles the
// chunked + resumable upload, so a dropped chunk on a flaky mobile connection is
// retried/resumed instead of failing the whole file.
const server = {
    url: "/filepond",
    headers: { "X-CSRF-TOKEN": page.props.csrf_token },
};

// Encrypted temporary-upload ids for files that finished uploading. These are
// submitted with the form and resolved back to files server-side.
const getServerIds = () =>
    (pond.value?.getFiles?.() || []).map((f) => f.serverId).filter(Boolean);
const getFileCount = () => (pond.value?.getFiles?.() || []).length;
const removeFiles = () => pond.value?.removeFiles?.();
// FilePond's documented retry/resume — re-processes queued or errored items.
const process = () => pond.value?.processFiles?.();

defineExpose({
    getServerIds,
    getFileCount,
    removeFiles,
    process,
    getPond: () => pond.value,
});

const onProcessFile = (error) => {
    if (error) {
        emit("error", error.body || error.main || "Upload failed.");
    }
};

const onProcessFiles = () => {
    // Batch finished. Only signal success when no file is left in an error state,
    // so errored files stay in the queue for the user to retry.
    const hasError = (pond.value?.getFiles?.() || []).some(
        (f) => f.status === FileStatus.PROCESSING_ERROR
    );
    if (!hasError) {
        emit("all-done");
    }
};

const onUpdateFiles = (items) => {
    emit("queue-update", items.length);
};
</script>

<template>
    <!-- maxParallelUploads=1: each chunk request shares the same PHP session,
    which serializes on its file lock at write time. With FilePond's default of
    2 files in flight, that contention surfaces as upload failures on slow
    mobile connections once more than one file is uploading at once. -->
    <FilePond
        ref="pond"
        v-model="files"
        :allow-multiple="allowMultiple"
        :accepted-file-types="acceptedFileTypes"
        :server="server"
        :chunk-uploads="true"
        :chunk-size="5242880"
        :chunk-retry-delays="[500, 1000, 3000]"
        :max-parallel-uploads="1"
        :max-file-size="maxFileSize"
        :label-idle="labelIdle"
        name="image"
        credits="false"
        @processfilestart="$emit('processing-start')"
        @processfile="onProcessFile"
        @processfiles="onProcessFiles"
        @updatefiles="onUpdateFiles"
    />
</template>
