<template>
    <div 
        class="pill" 
        :class="typeClasses"
    >
        {{ type }}
    </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    type: { type: String, required: true },
});

const typeStyles = {
    playlist: 'bg-purple-600 text-white',
    video: 'bg-blue-600 text-white',
    screenshot: 'bg-green-600 text-white',
};

const typeClasses = computed(() => {
    const typeKey = props.type.toLowerCase();
    return typeStyles[typeKey] || 'bg-gray-100 text-gray-800';
});
</script>

<style scoped>
.pill {
    position: absolute;
    bottom: 5px;
    left: 5px;
    padding: 5px 10px;
    border-radius:20px ;
    font-size: 14px;
}
</style>