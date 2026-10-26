<template>
    <!-- The month's collage as a painting: its pictures in its page's
         grid (GamesWorld::collage()), each shown whole in its cell. -->
    <div
        class="collage-art"
        :style="{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
        }"
    >
        <img
            v-for="(src, i) in tiles"
            :key="i"
            :src="src"
            alt=""
            draggable="false"
        />
    </div>
</template>

<script setup>
defineProps({
    tiles: { type: Array, required: true },
    cols: { type: Number, required: true },
    rows: { type: Number, required: true },
});
</script>

<style scoped>
.collage-art {
    display: grid;
    gap: 2px;
    padding: 2px;
    background: #f8f4ea;
}

.collage-art img {
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    object-fit: contain;
}
</style>
