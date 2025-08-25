<template>
    <Head title="Archived Collages" />

    <AuthenticatedLayout>
        <template #header>
            <div class="flex justify-between flex-wrap items-center mb-3">
                <h2
                    class="font-heading text-2xl text-theme-title leading-tight"
                >
                    Archived Collages
                </h2>

                <Link
                    :href="route('collages.index')"
                    class="text-white hover:text-blue-300"
                >
                    <i class="ri-arrow-left-line mr-1"></i>
                    Back to Collages
                </Link>
            </div>
            <p class="text-sm text-gray-400 mt-2">
                Archived collages can no longer be edited, but you may still
                view and print them.
            </p>
        </template>

        <div
            v-if="collages.length === 0"
            class="flex flex-col items-center mt-10"
        >
            <h2 class="mb-8 font-semibold text-2xl text-gray-100 leading-tight">
                No archived collages found.
            </h2>
            <ManEmptyCircle />
        </div>

        <CollageGrid
            :collages="collages"
            :show-index="false"
            :show-screenshots="true"
        >
            <template #actions="{ collage }">
                <!-- Consolidated Control Panel at Bottom -->
                <div class="w-full bg-gray-50 rounded-lg p-3 border">
                    <div
                        class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                        <!-- Left Side: Primary Actions -->
                        <div
                            class="flex flex-wrap items-center gap-2 w-full sm:w-auto"
                        >
                            <!-- View PDF Button -->
                            <a
                                v-if="canEditPages && collage.storage_path"
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

                        <!-- Right Side: Admin Actions -->
                        <div
                            v-if="canAdmin"
                            class="flex flex-wrap items-center gap-2 w-full sm:w-auto"
                        >
                            <!-- Restore Button -->
                            <button
                                class="flex items-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors duration-200 min-w-0"
                                :class="{
                                    'opacity-50 cursor-not-allowed':
                                        restoreForm.processing,
                                }"
                                :disabled="restoreForm.processing"
                                @click="
                                    restoreForm.patch(
                                        route('collages.restore', collage.id)
                                    )
                                "
                            >
                                <i
                                    class="ri-arrow-go-back-line flex-shrink-0"
                                ></i>
                                <span class="xs:inline">Restore</span>
                            </button>

                            <!-- Delete Permanently Button -->
                            <button
                                class="flex items-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors duration-200 min-w-0"
                                :class="{
                                    'opacity-50 cursor-not-allowed':
                                        deleteForm.processing,
                                }"
                                :disabled="deleteForm.processing"
                                @click="confirmDelete(collage.id)"
                            >
                                <i class="ri-delete-bin-line flex-shrink-0"></i>
                                <span class="hidden sm:inline"
                                    >Delete Permanently</span
                                >
                                <span class="sm:hidden">Delete</span>
                            </button>
                        </div>

                        <!-- Non-Admin View PDF (Full Width on Mobile) -->
                        <div
                            v-else-if="canEditPages && collage.storage_path"
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
import DangerButton from "@/Components/DangerButton.vue";
import ManEmptyCircle from "@/Components/svg/ManEmptyCircle.vue";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { Head, Link, useForm } from "@inertiajs/vue3";
import CollageGrid from "./CollageGrid.vue";

import { usePermissions } from "@/composables/permissions";

const { canEditPages, canAdmin } = usePermissions();

defineProps({
    collages: { type: Array, required: true },
});

const restoreForm = useForm();
const deleteForm = useForm();

const confirmDelete = (collageId) => {
    if (
        confirm(
            `Are you sure you want to permanently delete this collage? This action cannot be undone and will remove all associated data.`
        )
    ) {
        deleteForm.delete(route("collages.destroy", collageId), {
            preserveScroll: true,
        });
    }
};

defineOptions({
    name: "ArchivedCollages",
});
</script>
