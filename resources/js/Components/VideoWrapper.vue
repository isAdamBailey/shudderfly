<script setup>
import TypePill from "@/Components/TypePill.vue";
import useGetYouTubeVideo from "@/composables/useGetYouTubeVideo";
import { computed } from "vue";
import LiteYouTubeEmbed from "vue-lite-youtube-embed";
import "vue-lite-youtube-embed/style.css";
const props = defineProps({
  url: { type: String, default: null },
  iframe: { type: Boolean, default: false },
  title: { type: String, default: "" },
  controls: { type: Boolean, default: true }
});

const { embedUrl, videoId, isPlaylist } = useGetYouTubeVideo(() => props.url, {
  noControls: !props.controls
});

// Always use iframe for playlists
const useIframe = computed(() => isPlaylist.value || props.iframe);
</script>

<template>
  <div
    v-if="useIframe"
    :class="!controls ? 'pointer-events-none' : ''"
    class="video-container rounded-lg"
  >
    <iframe
      :title="title"
      :src="embedUrl"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowfullscreen
      playsinline
      webkit-playsinline
    ></iframe>
    <TypePill v-if="isPlaylist && !controls" type="Playlist" />
  </div>
  <div
    v-else
    class="video-container"
    style="pointer-events: auto; touch-action: manipulation"
  >
    <LiteYouTubeEmbed
      :id="videoId"
      :title="title"
      :cookie="false"
      :params="`modestbranding=1&rel=0&playsinline=1${
        !controls ? '&controls=0' : ''
      }`"
    />
  </div>
</template>

<style>
.video-container {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; /* For a 16:9 aspect ratio */
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}

.video-container iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.video-container .yt-lite {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

/* Ensure the play button and overlay are clickable on iOS */
.video-container .yt-lite > .lty-playbtn {
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  z-index: 1;
}
</style>
