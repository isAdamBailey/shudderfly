<template>
    <div
        class="p-1 border-2 border-gray-900 bg-gradient-to-r from-white to-yellow-100 h-full flex flex-col justify-between"
    >
        <video v-if="isVideo" controls class="rounded">
            <source :src="page.image_path" />
            Your browser does not support the video tag.
        </video>
        <img
            v-else-if="page.image_path"
            class="rounded"
            :src="page.image_path"
            alt="image"
        />
        <p class="prose px-3 py-3 text-gray-900" v-html="page.content"></p>
        <div v-if="canEditPages">
            <Button
                v-if="!showPageSettings"
                class="w-full"
                @click="showPageSettings = true"
            >
                Edit Page
            </Button>
            <EditPageForm
                v-if="showPageSettings"
                :page="page"
                @close-page-form="showPageSettings = false"
            />
        </div>
    </div>
</template>

<script setup>
import Button from "@/Components/Button.vue";
import { computed, ref } from "vue";
import EditPageForm from "@/Pages/Book/EditPageForm.vue";
import { usePermissions } from "@/permissions";

const { canEditPages } = usePermissions();

const props = defineProps({
    page: Object,
});

const isVideo = computed(() => {
    const videoFormats = ["mp4", "avi", "mpeg", "quicktime"];
    return videoFormats.some(function (suffix) {
        return props.page.image_path.endsWith(suffix);
    });
});

let showPageSettings = ref(false);
</script>
