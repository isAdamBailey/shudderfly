<script setup>
import LiteYouTubeEmbed from "vue-lite-youtube-embed";
import "vue-lite-youtube-embed/style.css";

defineProps({
    id: { type: String, default: null },
    url: { type: String, default: null },
    title: { type: String, default: "" },
    controls: { type: Boolean, default: true },
});
</script>

<template>
    <LiteYouTubeEmbed
        v-if="id"
        :id="id"
        :title="title"
        :cookie="true"
        :params="`modestbranding=1&rel=0${!controls ? '&controls=0' : ''}`"
    />
    <div
        v-if="url"
        :class="!controls ? 'pointer-events-none' : ''"
        class="video-container rounded-lg"
    >
        <iframe
            :title="title"
            :src="url"
            frameborder="0"
            allow="accelerometer; encrypted-media;"
        ></iframe>
    </div>
</template>

<style scoped>
.video-container {
    position: relative;
    width: 100%;
    padding-bottom: 56.25%; /* For a 16:9 aspect ratio */
    overflow: hidden;
}
.video-container iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}
</style>
