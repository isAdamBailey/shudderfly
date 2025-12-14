<template>
    <div :class="['bg-white dark:bg-gray-800', darkBackground ? 'bg-gray-800' : '']">
        <button
            type="button"
            :class="['w-full flex justify-between items-center font-semibold border-b relative', darkBackground ? 'bg-gray-800 text-gray-100 border-gray-700' : 'dark:text-gray-100', compact ? 'text-base p-3' : 'text-xl p-6']"
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

        <div v-show="isOpen" :class="[darkBackground ? 'bg-gray-800' : '', compact ? 'p-3' : 'p-6']">
            <slot></slot>
        </div>
    </div>
</template>

<script setup>
import { ref, watch } from "vue";

const props = defineProps({
    title: {
        type: String,
        required: true,
    },
    defaultOpen: {
        type: Boolean,
        default: false,
    },
    modelValue: {
        type: Boolean,
        default: undefined,
    },
    darkBackground: {
        type: Boolean,
        default: false,
    },
    showBadge: {
        type: Boolean,
        default: false,
    },
    compact: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(["update:modelValue"]);

const isOpen = ref(
    props.modelValue !== undefined ? props.modelValue : props.defaultOpen
);

// Watch for external changes to modelValue
watch(
    () => props.modelValue,
    (newValue) => {
        if (newValue !== undefined) {
            isOpen.value = newValue;
        }
    }
);

// Emit changes when isOpen changes (for v-model support)
watch(isOpen, (newValue) => {
    if (props.modelValue !== undefined) {
        emit("update:modelValue", newValue);
    }
});
</script>
