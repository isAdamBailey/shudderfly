<script setup>
defineProps({
    active: { type: Boolean, required: true },
    size: { type: Number, required: true },
    label: { type: String, required: true },
    ariaLabel: { type: String, required: true },
    title: { type: String, required: true },
});

defineEmits(["select"]);
</script>

<template>
    <div class="flex flex-col items-center gap-2">
        <button
            type="button"
            class="btn-bulge rounded-full transition-shadow duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
            :class="
                active
                    ? 'ring-4 ring-theme-button-active ring-offset-2 ring-offset-transparent'
                    : 'hover:ring-2 hover:ring-theme-primary hover:ring-offset-2 hover:ring-offset-transparent'
            "
            :style="{ width: `${size}px`, height: `${size}px` }"
            :aria-pressed="active"
            :aria-label="ariaLabel"
            :title="title"
            @click="$emit('select')"
        >
            <slot />
        </button>
        <div class="text-center">
            <div class="flex items-center justify-center gap-1.5">
                <i
                    v-if="active"
                    class="ri-pushpin-fill text-sm text-theme-button-active"
                    aria-hidden="true"
                ></i>
                <div
                    class="font-heading text-lg text-gray-900 dark:text-gray-100"
                >
                    {{ label }}
                </div>
            </div>
            <slot name="details" />
        </div>
    </div>
</template>
