<script setup>
import LiteYouTubeEmbed from "vue-lite-youtube-embed";
import "vue-lite-youtube-embed/style.css";

defineProps({
    id: { type: String, required: true },
    title: { type: String, default: "" },
    controls: { type: Boolean, default: true },
});
</script>

<template>
    <LiteYouTubeEmbed
        :id="id"
        :title="title"
        :cookie="true"
        :params="`modestbranding=1&rel=0${!controls ? '&controls=0' : ''}`"
    />
</template>
