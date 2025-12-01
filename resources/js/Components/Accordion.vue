<template>
    <div :class="['bg-white dark:bg-gray-800', darkBackground ? 'bg-gray-800' : '']">
        <button
            type="button"
            :class="['w-full flex justify-between items-center text-xl font-semibold border-b p-6', darkBackground ? 'bg-gray-800 text-gray-100 border-gray-700' : 'dark:text-gray-100']"
            @click="isOpen = !isOpen"
        >
            <span>{{ title }}</span>
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
});

const isOpen = ref(props.defaultOpen);
</script>
