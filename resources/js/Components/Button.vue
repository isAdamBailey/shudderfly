<script setup>
defineProps({
    type: {
        type: String,
        default: "submit",
    },
    disabled: {
        type: Boolean,
        default: false,
    },
    isActive: {
        type: Boolean,
        default: false,
    },
});
</script>

<template>
    <button
        :disabled="disabled"
        :type="type"
        :class="[
            'inline-flex items-center px-4 py-2 border border-transparent rounded-md font-semibold text-xs uppercase tracking-widest transition ease-in-out duration-150',
            isActive
                ? 'bg-blue-600 dark:bg-amber-400 text-white dark:text-gray-800 border-blue-600 hover:border-blue-500 dark:border-amber-400 hover:bg-blue-500 active:bg-green-900 focus:border-blue-900 focus:shadow-outline-blue'
                : 'bg-yellow-900 dark:bg-gray-800 text-white dark:border-gray-500 hover:bg-yellow-700 active:bg-yellow-900 focus:border-blue-900 focus:shadow-outline-blue',
            disabled ? 'opacity-25' : '',
        ]"
    >
        <slot />
    </button>
</template>
