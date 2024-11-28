<template>
    <button
        :aria-label="title"
        :title="title"
        class="border-r border-b py-1 px-4"
        :class="{ 'bg-blue-700 font-bold text-white': isActive }"
    >
        <span class="font-bold">{{ icon }}</span>
    </button>
</template>

<script setup>
defineProps({
    icon: String,
    isActive: Boolean,
    title: {
        type: String,
        default: "editor style toggle",
    },
});
</script>
