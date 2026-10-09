<script setup>
import { useTranslations } from "@/composables/useTranslations";
import { onBeforeUnmount, onMounted, ref } from "vue";

// A TV's picture in a room's DOM overlay: the channel's video filling the
// flat black panel the canvas draws, inside a thin bezel, so it plays on
// the TV. It's a plain <video>, like a book's cover <img>, so CloudFront
// needn't let WebGL read it. It plays with sound if the browser lets it (the tap that
// switched it on may be spent by the walk over), or muted if not. It says
// when its video ends, so the TV can go on to the next channel. As it
// comes on, its channel number shows in the corner for a moment, as on a
// real TV, so a change of channel can be seen.
defineProps({
    /** { id, video, poster, title }, as GamesWorld::channels() sends it. */
    channel: { type: Object, required: true },
    /** Which channel it is, from 1. */
    number: { type: Number, required: true },
});

const emit = defineEmits(["ended"]);

const { t } = useTranslations();

const videoEl = ref(null);

// How long the channel number shows.
const BADGE_MS = 2000;
const badge = ref(true);
const badgeTimer = setTimeout(() => (badge.value = false), BADGE_MS);

onBeforeUnmount(() => {
    clearTimeout(badgeTimer);
    // Let go of the download and the decoder now, not whenever the old
    // <video> is collected: flicking through channels mustn't pile them up.
    const video = videoEl.value;
    video.pause();
    video.removeAttribute("src");
    video.load();
});

onMounted(async () => {
    const video = videoEl.value;
    try {
        await video.play();
    } catch {
        video.muted = true;
        video.play().catch(() => {});
    }
});
</script>

<template>
    <span class="tv-screen" aria-hidden="true">
        <video
            ref="videoEl"
            class="tv-screen-video"
            :src="channel.video"
            :poster="channel.poster || undefined"
            playsinline
            disablepictureinpicture
            preload="metadata"
            @ended="emit('ended')"
        ></video>
        <span v-if="badge" class="tv-screen-channel">
            {{ t("games.world.tv_channel", { number }) }}
        </span>
    </span>
</template>

<style scoped>
/* Over the whole panel (the button is the panel's size), the picture
   inside a thin black bezel. */
.tv-screen {
    position: absolute;
    inset: 0;
    padding: 3%;
    background: #0b0b0f;
    pointer-events: none;
}

.tv-screen-channel {
    position: absolute;
    top: 8%;
    right: 6%;
    padding: 0 0.3em;
    font-family: ui-monospace, monospace;
    font-size: clamp(9px, 1.6vmin, 15px);
    font-weight: 800;
    color: #4ade80;
    background: rgb(0 0 0 / 0.6);
    text-shadow: 0 0 4px #22c55e;
}

.tv-screen-video {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: #000;
}
</style>
