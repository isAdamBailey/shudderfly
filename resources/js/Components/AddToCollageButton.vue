<template>
    <div>
        <!-- If page is already in any collage, just show the message -->
        <div v-if="isPageInAnyCollage" class="text-yellow-400 text-sm">
            <i class="ri-information-line mr-1"></i>
            This page is in collage{{
                pageExistingCollages.length > 1 ? "s" : ""
            }}:
            <span
                v-for="(existingCollage, index) in pageExistingCollages"
                :key="existingCollage.id"
            >
                #{{ getCollageDisplayNumber(existingCollage.id)
                }}<span v-if="index < pageExistingCollages.length - 1">, </span>
            </span>
        </div>

        <div v-else>
            <label class="block mb-2 text-sm font-medium text-white"
                >Add to collage:</label
            >
            <div class="flex items-center gap-2">
                <select v-model="selectedCollageId" class="rounded">
                    <option :value="''" disabled>Select collage</option>
                    <option
                        v-for="(collage, index) in props.collages"
                        :key="collage.id"
                        :value="collage.id"
                        :disabled="collage.pages.length >= 16"
                    >
                        Collage #{{ index + 1 }}
                        <span v-if="collage.pages.length >= 16"> (Full)</span>
                    </option>
                </select>
                <div v-if="showSuccess" class="p-3 bg-green-100 text-green-700 rounded">
                    <i class="ri-check-circle-line mr-1"></i>
                    Page successfully added to collage!
                </div>
                <Button
                    v-else
                    class="btn btn-primary"
                    :disabled="form.processing"
                    @click="addToCollage"
                >
                    <i class="ri-add-line mr-1"></i> Add to Collage
                </Button>
            </div>
        </div>
    </div>
</template>

<script setup>
import Button from "@/Components/Button.vue";
import { useForm } from "@inertiajs/vue3";
import { computed, ref, watch } from "vue";

const props = defineProps({
    pageId: { type: Number, required: true },
    collages: { type: Array, required: true },
});

const selectedCollageId = ref(null);
const showSuccess = ref(false);

const form = useForm({
    collage_id: null,
    page_id: props.pageId,
});

const route = window.route;

// Update form when collage selection changes
watch(selectedCollageId, (newCollageId) => {
    form.collage_id = newCollageId;
    showSuccess.value = false; // Reset success message when changing collage
});

// Check if current page is already in any non-deleted collages
const pageExistingCollages = computed(() => {
    return props.collages
        .filter((collage) => !collage.deleted_at) // Only non-deleted collages
        .filter((collage) =>
            collage.pages.some((page) => page.id === props.pageId)
        );
});

const isPageInAnyCollage = computed(() => {
    return pageExistingCollages.value.length > 0;
});

const addToCollage = () => {
    form.post(route("collage-page.store"), {
        preserveScroll: true,
        onSuccess: () => {
            form.reset();
            showSuccess.value = true;
            // Hide success message after 3 seconds
            setTimeout(() => {
                showSuccess.value = false;
            }, 3000);
        },
    });
};

const getCollageDisplayNumber = (collageId) => {
    // Filter out deleted collages first
    const activeCollages = props.collages.filter(collage => !collage.deleted_at);
    const index = activeCollages.findIndex(collage => collage.id === collageId);
    return index !== -1 ? index + 1 : collageId;
};
</script>
