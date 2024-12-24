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
            'inline-flex items-center px-6 py-3 border rounded-md font-semibold text-xs uppercase tracking-widest transition ease-in-out duration-150',
            isActive
                ? 'bg-theme-button-active text-theme-button-active border-theme-button-active hover:bg-theme-button-active active:bg-theme-button focus:border-theme-button focus:shadow-theme-button'
                : 'bg-theme-primary text-theme-button border-theme-primary hover:text-theme-button-hover hover:bg-theme-button active:bg-theme-button focus:border-theme-button focus:shadow-theme-button',
            disabled ? 'opacity-25' : '',
        ]"
    >
        <slot />
    </button>
</template>
