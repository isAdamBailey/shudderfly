<template>
    <Head title="Collages" />

    <AuthenticatedLayout>
        <template #header>
            <div class="flex justify-between flex-wrap items-center mb-3">
                <h2
                    class="font-heading text-2xl text-theme-title leading-tight"
                >
                    Collages
                </h2>

                <div class="flex items-center gap-4">
                    <Link
                        :href="route('collages.archived')"
                        class="text-white hover:text-blue-300"
                    >
                        <i class="ri-archive-line mr-1"></i>
                        View Archived Collages
                    </Link>

                    <Button
                        v-if="canAdmin"
                        :disabled="
                            createCollageForm.processing || collages.length >= 2
                        "
                        @click="createCollageForm.post(route('collages.store'))"
                        ><i class="ri-add-line text-xl mr-3"></i>
                        Create New Collage
                    </Button>
                </div>
            </div>
            <div class="flex justify-between items-center">
                <p class="text-sm text-gray-400 mt-2">{{ text }}</p>
                <Button class="ml-2" :disabled="speaking" @click="speak(text)">
                    <i class="ri-speak-fill text-lg"></i>
                </Button>
            </div>
            <div v-if="canAdmin">
                <p class="font-bold text-gray-400 mt-2 underline">
                    ADMIN INSTRUCTIONS
                </p>
                <p class="text-sm text-gray-400 mt-2">
                    Each collage holds up to {{ MAX_COLLAGE_PAGES }} pictures
                    that automatically arrange to fill the space.
                    <strong>Lock</strong> collages to prevent users from adding
                    more pictures. <strong>Generate PDF</strong> takes a few
                    minutes - you'll receive an email when ready.
                    <strong>Archive</strong> collages to preserve them while
                    preventing new additions (can be restored later).
                </p>
            </div>
        </template>

        <div
            v-if="collages.length === 0"
            class="flex flex-col items-center mt-10"
        >
            <h2 class="mb-8 font-semibold text-2xl text-gray-100 leading-tight">
                No collages have been created yet.
            </h2>
            <ManEmptyCircle />
        </div>

        <CollageGrid :collages="collages">
            <template #image-actions="{ page, collage }">
                <button
                    v-if="canAdmin && !collage.is_locked"
                    class="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg transition-all duration-200"
                    :class="{
                        'opacity-50 cursor-not-allowed': isGenerating(collage),
                    }"
                    title="Remove image"
                    :disabled="isGenerating(collage)"
                    @click="removeImage(collage.id, page.id)"
                >
                    <i class="ri-close-line text-sm"></i>
                </button>
            </template>

            <template #actions="{ collage }">
                <!-- Consolidated Control Panel at Bottom -->
                <div class="w-full bg-gray-50 rounded-lg p-3 border">
                    <div
                        class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                        <!-- Primary Actions Row -->
                        <div
                            class="flex flex-wrap items-center gap-2 w-full sm:w-auto"
                        >
                            <!-- Lock Toggle -->
                            <button
                                v-if="canAdmin"
                                class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 min-w-0"
                                :class="[
                                    collage.is_locked
                                        ? 'bg-red-500 hover:bg-red-600 text-white'
                                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700',
                                    updateForm.processing
                                        ? 'opacity-50 cursor-not-allowed'
                                        : 'cursor-pointer',
                                ]"
                                :disabled="updateForm.processing"
                                :title="
                                    collage.is_locked
                                        ? 'Click to unlock collage'
                                        : 'Click to lock collage'
                                "
                                @click="toggleLock(collage)"
                            >
                                <div
                                    class="relative inline-flex w-5 h-3 rounded-full transition-colors duration-200 flex-shrink-0"
                                    :class="
                                        collage.is_locked
                                            ? 'bg-red-600'
                                            : 'bg-gray-400'
                                    "
                                >
                                    <div
                                        class="absolute top-0.5 left-0.5 w-2 h-2 bg-white rounded-full transition-transform duration-200 transform"
                                        :class="
                                            collage.is_locked
                                                ? 'translate-x-2'
                                                : 'translate-x-0'
                                        "
                                    ></div>
                                </div>
                                <i
                                    :class="
                                        collage.is_locked
                                            ? 'ri-lock-line'
                                            : 'ri-lock-unlock-line'
                                    "
                                    class="flex-shrink-0"
                                ></i>
                                <span class="hidden xs:inline">
                                    {{
                                        collage.is_locked
                                            ? "Locked"
                                            : "Unlocked"
                                    }}
                                </span>
                            </button>

                            <!-- View PDF Button -->
                            <a
                                v-if="collage.storage_path && canEditPages"
                                :href="collage.storage_path"
                                target="_blank"
                                class="flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors duration-200 min-w-0"
                            >
                                <i
                                    class="ri-external-link-line flex-shrink-0"
                                ></i>
                                <span class="hidden xs:inline">View</span>
                                <span class="xs:hidden">PDF</span>
                            </a>
                        </div>

                        <!-- Secondary Actions Row -->
                        <div
                            v-if="canAdmin"
                            class="flex flex-wrap items-center gap-2 w-full sm:w-auto"
                        >
                            <!-- Generate PDF Button -->
                            <button
                                class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 min-w-0"
                                :class="[
                                    isGenerating(collage)
                                        ? 'bg-orange-100 text-orange-600'
                                        : 'bg-green-500 hover:bg-green-600 text-white',
                                    printForm.processing ||
                                    !hasPages(collage) ||
                                    isGenerating(collage)
                                        ? 'opacity-50 cursor-not-allowed'
                                        : 'cursor-pointer',
                                ]"
                                :disabled="
                                    printForm.processing ||
                                    !hasPages(collage) ||
                                    isGenerating(collage)
                                "
                                @click="generatePdf(collage.id)"
                            >
                                <i
                                    :class="
                                        isGenerating(collage)
                                            ? 'ri-loader-4-line animate-spin'
                                            : 'ri-file-pdf-line'
                                    "
                                    class="flex-shrink-0"
                                ></i>
                                <span class="hidden sm:inline">
                                    {{
                                        isGenerating(collage)
                                            ? "Generating..."
                                            : collage.storage_path
                                            ? "Regenerate PDF"
                                            : "Generate PDF"
                                    }}
                                </span>
                                <span class="sm:hidden">
                                    {{
                                        isGenerating(collage)
                                            ? "Gen..."
                                            : collage.storage_path
                                            ? "Regen"
                                            : "Gen"
                                    }}
                                </span>
                            </button>

                            <!-- Archive Button -->
                            <button
                                class="flex items-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors duration-200 min-w-0"
                                :class="{
                                    'opacity-50 cursor-not-allowed':
                                        deleteForm.processing ||
                                        !hasPages(collage) ||
                                        isGenerating(collage),
                                }"
                                :disabled="
                                    deleteForm.processing ||
                                    !hasPages(collage) ||
                                    isGenerating(collage)
                                "
                                @click="confirmDelete(collage.id)"
                            >
                                <i class="ri-archive-line flex-shrink-0"></i>
                                <span class="hidden xs:inline">Archive</span>
                            </button>
                        </div>

                        <!-- Non-Admin View PDF (Full Width on Mobile) -->
                        <div
                            v-else-if="collage.storage_path && canEditPages"
                            class="flex items-center w-full sm:w-auto"
                        >
                            <a
                                :href="collage.storage_path"
                                target="_blank"
                                class="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors duration-200 w-full sm:w-auto"
                            >
                                <i class="ri-external-link-line"></i>
                                <span>View PDF</span>
                            </a>
                        </div>
                    </div>
                </div>
            </template>
        </CollageGrid>
    </AuthenticatedLayout>
</template>

<script setup>
import Button from "@/Components/Button.vue";
import ManEmptyCircle from "@/Components/svg/ManEmptyCircle.vue";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { MAX_COLLAGE_PAGES } from "@/constants/collage";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { Head, Link, useForm } from "@inertiajs/vue3";
import { ref, onMounted, onUnmounted } from "vue";
import CollageGrid from "./CollageGrid.vue";

import { usePermissions } from "@/composables/permissions";
import { useCollageProcessing } from "@/composables/useCollageProcessing";

const { canAdmin, canEditPages } = usePermissions();
const { speak, speaking } = useSpeechSynthesis();
const { startProcessing, stopProcessing, isProcessing } =
    useCollageProcessing();

defineProps({
    collages: { type: Array, required: true },
});

const createCollageForm = useForm();
const printForm = useForm();
const deleteForm = useForm();
const updateForm = useForm({
    is_locked: false,
});

// Dropdown state management
const activeDropdown = ref(null);

// Close dropdown when clicking outside
const closeDropdowns = () => {
    activeDropdown.value = null;
};

// Add click outside listener
onMounted(() => {
    document.addEventListener("click", closeDropdowns);
});

onUnmounted(() => {
    document.removeEventListener("click", closeDropdowns);
});

const text = ref(
    `You can build your own collages! Go to the picture you want to add to the collage and select the collage you want. Mom and Dad can print these collages.`
);

const hasPages = (collage) => {
    return collage.pages.length > 0;
};

const generatePdf = (collageId) => {
    startProcessing(collageId);

    // eslint-disable-next-line no-undef
    printForm.post(route("collages.generate-pdf", collageId), {
        onSuccess: () => {
            // Keep it in processing state until manually cleared or job completes
        },
        onError: () => {
            // Remove from processing state if there's an error
            stopProcessing(collageId);
        },
    });
};

const isGenerating = (collage) => {
    // Check if it's currently being processed (localStorage state)
    const processing = isProcessing(collage.id);

    // If it's in processing state AND has is_archived set to true,
    // the job completed successfully, so clear the processing state
    if (processing && collage.is_archived) {
        stopProcessing(collage.id);
        return false;
    }

    // If it's in processing state, it's generating (regardless of storage_path)
    if (processing) {
        return true;
    }

    // If it's not in processing state, it's not generating
    return false;
};

const removeImage = (collageId, pageId) => {
    if (confirm("Remove this image from the collage?")) {
        // eslint-disable-next-line no-undef
        useForm().delete(route("collage-page.destroy", [collageId, pageId]), {
            preserveScroll: true,
        });
    }
};

const confirmDelete = (collageId) => {
    if (
        confirm(
            `Are you sure you want to archive this collage? You will still be able to see the collage in the archive.`
        )
    ) {
        // eslint-disable-next-line no-undef
        deleteForm.patch(route("collages.archive", collageId), {
            preserveScroll: true,
        });
    }
};

const toggleLock = (collage) => {
    updateForm.is_locked = !collage.is_locked;

    // eslint-disable-next-line no-undef
    updateForm.put(route("collages.update", collage.id), {
        preserveScroll: true,
        onSuccess: () => {
            console.log("Lock toggle successful");
        },
        onError: (errors) => {
            console.error("Lock toggle failed:", errors);
        },
    });
};

defineOptions({
    name: "CollagesIndex",
});
</script>
