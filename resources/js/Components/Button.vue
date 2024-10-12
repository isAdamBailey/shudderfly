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
            'inline-flex items-center px-6 py-3 border border-white rounded-md font-semibold text-xs uppercase tracking-widest transition ease-in-out duration-150',
            isActive
                ? 'bg-yellow-400 dark:bg-amber-400 text-gray-800 hover:text-gray-800 border-blue-600 hover:border-yellow-500 dark:border-amber-400 hover:bg-yellow-500 dark:hover:bg-yellow-500 active:bg-green-900 focus:border-blue-900 focus:shadow-outline-blue'
                : 'bg-blue-600 dark:bg-gray-800 text-white hover:text-gray-800 dark:border-gray-500 hover:bg-yellow-400 dark:hover:bg-yellow-400 active:bg-yellow-900 focus:border-blue-900 focus:shadow-outline-blue',
            disabled ? 'opacity-25' : '',
        ]"
    >
        <slot />
    </button>
</template>
