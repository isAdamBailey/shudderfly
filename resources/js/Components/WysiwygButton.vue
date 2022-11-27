<template>
    <button
        :aria-label="props.title"
        :title="props.title"
        class="border-r border-b py-1 px-2"
        :class="{ 'bg-blue-500 font-bold text-white': props.isActive }"
    >
        <span class="font-bold">{{ props.icon }}</span>
    </button>
</template>

<script setup>
const props = defineProps({
    icon: String,
    isActive: Boolean,
    title: {
        type: String,
        default: "editor style toggle",
    },
});
</script>
