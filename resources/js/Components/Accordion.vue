<template>
    <div :class="['bg-white dark:bg-gray-800', darkBackground ? 'bg-gray-800' : '']">
        <button
            type="button"
            :class="['w-full flex justify-between items-center text-xl font-semibold border-b p-6 relative', darkBackground ? 'bg-gray-800 text-gray-100 border-gray-700' : 'dark:text-gray-100']"
            @click="isOpen = !isOpen"
        >
            <span class="flex items-center gap-2">
                {{ title }}
                <span
                    v-if="showBadge"
                    class="h-2 w-2 bg-red-600 rounded-full"
                    title="You have unread notifications"
                ></span>
            </span>
            <i
                :class="['transition-transform', isOpen ? 'rotate-180' : '']"
                class="ri-arrow-down-s-line"
            ></i>
        </button>

        <div v-show="isOpen" :class="['p-6', darkBackground ? 'bg-gray-800' : '']">
            <slot></slot>
        </div>
    </div>
</template>

<script setup>
import { ref } from "vue";

const props = defineProps({
    title: {
        type: String,
        required: true,
    },
    defaultOpen: {
        type: Boolean,
        default: false,
    },
    darkBackground: {
        type: Boolean,
        default: false,
    },
    showBadge: {
        type: Boolean,
        default: false,
    },
});

const isOpen = ref(props.defaultOpen);
</script>
