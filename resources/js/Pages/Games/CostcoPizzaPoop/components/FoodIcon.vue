<script setup>
import FoodGlyph from "./FoodGlyph.vue";

defineProps({
    food: { type: String, required: true },
});
</script>

<template>
    <svg viewBox="0 0 100 100" class="food-icon" aria-hidden="true">
        <FoodGlyph :food="food" />
    </svg>
</template>

<style scoped>
.food-icon {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
}
</style>
