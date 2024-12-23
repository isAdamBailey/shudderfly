<template>
    <div class="bg-white dark:bg-gray-800">
        <button
            class="w-full flex justify-between items-center text-xl dark:text-gray-100 font-semibold border-b p-6"
            @click="isOpen = !isOpen"
        >
            <span>{{ title }}</span>
            <i
                :class="['transition-transform', isOpen ? 'rotate-180' : '']"
                class="ri-arrow-down-s-line"
            ></i>
        </button>

        <div v-show="isOpen" class="p-6">
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
});

const isOpen = ref(props.defaultOpen);
</script>
