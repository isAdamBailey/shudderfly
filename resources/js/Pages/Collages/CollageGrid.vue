<template>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mx-10 my-5">
        <div
            v-for="(collage, index) in collages"
            :key="collage.id"
            :ref="(el) => setCollageRef(el, collage.id)"
            class="bg-white shadow p-4 flex flex-col space-y-2"
        >
            <div class="flex justify-between items-center mb-2 min-w-0">
                <h3
                    class="text-lg font-semibold text-gray-800 whitespace-nowrap truncate"
                >
                    <template v-if="showIndex">
                        Collage #{{ index + 1 }}
                    </template>
                    <template v-else>
                        ID: {{ collage.id }}
                        <span
                            v-if="collage.updated_at"
                            class="text-sm font-normal text-gray-500 whitespace-nowrap"
                            >— {{ short(collage.updated_at) }}</span
                        >
                    </template>
                </h3>
                <span class="text-sm text-gray-500"
                    >{{ collage.pages.length }}/{{ MAX_COLLAGE_PAGES }} image{{
                        collage.pages.length !== 1 ? "s" : ""
                    }}</span
                >
            </div>

            <!-- Responsive 8.5x11 aspect ratio container, always looks like a piece of paper and maintains aspect ratio -->
            <div
                class="relative bg-white overflow-hidden mx-auto"
                style="aspect-ratio: 8.5 / 11; width: 100%; max-width: 850px"
            >
                <!-- Show PDF preview in archived view -->
                <div
                    v-if="collage && collage.preview_path && showScreenshots"
                    class="h-full w-full bg-white rounded-lg shadow-sm overflow-hidden"
                    style="position: relative"
                >
                    <!-- Show preview image -->
                    <div class="relative w-full h-full">
                        <img
                            :src="collage.preview_path"
                            :alt="`Collage ${collage.id} preview`"
                            class="w-full h-full object-contain rounded-lg shadow-sm"
                        />
                    </div>
                </div>

                <!-- Fallback when no preview image is available -->
                <div
                    v-else-if="
                        collage && collage.storage_path && showScreenshots
                    "
                    class="h-full w-full flex flex-col items-center justify-center bg-gray-50 p-4"
                >
                    <div class="text-center">
                        <i
                            class="ri-file-pdf-line text-6xl text-red-500 mb-4"
                        ></i>
                        <p class="text-gray-600 mb-4">
                            PDF preview not available
                        </p>
                        <div class="text-sm text-gray-500 mb-4">
                            {{ collage.pages.length }} images in this collage
                        </div>
                    </div>
                </div>

                <!-- Show individual images grid if no PDF or not in archived view -->
                <div
                    v-else
                    class="h-full w-full grid"
                    :style="getGridStyle(collage.pages.length)"
                >
                    <div
                        v-for="(page, pageIndex) in collage.pages.slice(
                            0,
                            MAX_COLLAGE_PAGES
                        )"
                        :key="page.id"
                        class="relative"
                    >
                        <!-- Progressive loading: show all placeholders, load images progressively -->
                        <LazyLoader
                            v-if="shouldLoadImage(pageIndex, collage.id)"
                            :src="page.media_path"
                            :alt="`Collage image ${page.id}`"
                            :classes="'w-full h-full object-contain bg-white'"
                            :fill-container="true"
                            :object-fit="'contain'"
                            :loading="pageIndex < 2 ? 'eager' : 'lazy'"
                            :fetch-priority="pageIndex < 2 ? 'high' : 'low'"
                            :show-pills="false"
                        />
                        <slot
                            name="image-actions"
                            :page="page"
                            :collage="collage"
                        />
                    </div>
                </div>
            </div>
            <div class="flex justify-center mt-2">
                <slot name="actions" :collage="collage" />
            </div>
        </div>
    </div>
</template>

<script setup>
import LazyLoader from "@/Components/LazyLoader.vue";
import { MAX_COLLAGE_PAGES } from "@/constants/collage";
import { useIntersectionObserver } from "@vueuse/core";
import { onMounted, ref } from "vue";
import { useDate } from "@/dateHelpers";
const { short } = useDate();

const props = defineProps({
    collages: { type: Array, required: true },
    showIndex: { type: Boolean, default: true },
    showScreenshots: { type: Boolean, default: false },
});

// Track loaded images for each collage
const loadedImages = ref(new Map());

// Initialize loaded images for each collage
onMounted(() => {
    props.collages.forEach((collage) => {
        const initialSet = new Set();
        // Load first 8 images immediately
        const initialCount = Math.min(
            8,
            Math.min(collage.pages.length, MAX_COLLAGE_PAGES)
        );
        for (let i = 0; i < initialCount; i++) {
            initialSet.add(i);
        }
        loadedImages.value.set(collage.id, initialSet);

        // Auto-load all remaining images after 2 seconds
        setTimeout(() => {
            const totalItems = Math.min(
                collage.pages.length,
                MAX_COLLAGE_PAGES
            );
            const currentSet = loadedImages.value.get(collage.id);
            if (currentSet && currentSet.size < totalItems) {
                for (let i = 0; i < totalItems; i++) {
                    currentSet.add(i);
                }
                // Trigger reactivity
                loadedImages.value = new Map(loadedImages.value);
            }
        }, 2000);
    });
});

// Check if an image should be loaded
const shouldLoadImage = (pageIndex, collageId) => {
    const collageLoadedImages = loadedImages.value.get(collageId);
    return collageLoadedImages && collageLoadedImages.has(pageIndex);
};

// Function to set collage ref and setup intersection observer
const setCollageRef = (element, collageId) => {
    if (!element) return;

    // Use VueUse's intersection observer
    const { stop } = useIntersectionObserver(
        element,
        ([{ isIntersecting }]) => {
            if (isIntersecting) {
                // Load all images for this collage when it comes into view
                const collage = props.collages.find((c) => c.id === collageId);
                if (!collage) return;

                const totalItems = Math.min(
                    collage.pages.length,
                    MAX_COLLAGE_PAGES
                );
                const currentSet = loadedImages.value.get(collageId);

                if (currentSet && currentSet.size < totalItems) {
                    for (let i = 0; i < totalItems; i++) {
                        currentSet.add(i);
                    }
                    // Trigger reactivity
                    loadedImages.value = new Map(loadedImages.value);
                    // Stop observing once all images are loaded
                    stop();
                }
            }
        },
        {
            rootMargin: "200px", // Start loading when 200px away from viewport
            threshold: 0.1, // Trigger when 10% is visible
        }
    );
};

// Function to calculate optimal grid layout based on number of images
const getGridStyle = (imageCount) => {
    if (imageCount <= 0) return {};

    const gridConfigs = {
        1: { cols: 1, rows: 1 },
        2: { cols: 2, rows: 1 },
        3: { cols: 3, rows: 1 },
        4: { cols: 2, rows: 2 },
        5: { cols: 3, rows: 2 },
        6: { cols: 3, rows: 2 },
        7: { cols: 4, rows: 2 },
        8: { cols: 4, rows: 2 },
        9: { cols: 3, rows: 3 },
        10: { cols: 4, rows: 3 },
        11: { cols: 4, rows: 3 },
        12: { cols: 4, rows: 3 },
        13: { cols: 4, rows: 4 },
        14: { cols: 4, rows: 4 },
        15: { cols: 4, rows: 4 },
        16: { cols: 4, rows: 4 },
    };

    const config = gridConfigs[imageCount] || gridConfigs[16];
    const { cols, rows } = config;
    const gap = 8; // px

    return {
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, calc((100% - ${
            (rows - 1) * gap
        }px) / ${rows}))`,
        gap: `${gap}px`,
    };
};
</script>
