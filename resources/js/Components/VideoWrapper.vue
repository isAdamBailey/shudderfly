<script setup>
import LiteYouTubeEmbed from "vue-lite-youtube-embed";
import "vue-lite-youtube-embed/style.css";
import useGetYouTubeVideo from "@/composables/useGetYouTubeVideo";

const props = defineProps({
    url: { type: String, default: null },
    iframe: { type: Boolean, default: false },
    title: { type: String, default: "" },
    controls: { type: Boolean, default: true },
});

const { embedUrl, videoId } = useGetYouTubeVideo(props.url, {
    noControls: !props.controls,
});
</script>

<template>
    <div
        v-if="iframe"
        :class="!controls ? 'pointer-events-none' : ''"
        class="video-container rounded-lg"
    >
        <iframe
            :title="title"
            :src="embedUrl"
            frameborder="0"
            allow="accelerometer; encrypted-media;"
        ></iframe>
    </div>
    <LiteYouTubeEmbed
        v-else
        :id="videoId"
        :title="title"
        :cookie="true"
        :params="`modestbranding=1&rel=0${!controls ? '&controls=0' : ''}`"
    />
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
