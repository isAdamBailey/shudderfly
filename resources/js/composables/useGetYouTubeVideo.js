import { computed } from "vue";

export default function useGetYouTubeVideo(videoLink, settings = {}) {
    const videoId = computed(() => {
        if (videoLink) {
            let id;

            if (videoLink.includes("watch?v=")) {
                const urlObj = new URL(videoLink);
                const params = new URLSearchParams(urlObj.search);
                id = params.get("v");
            } else {
                const parts = videoLink.split("/");
                id = parts[parts.length - 1].split("?")[0];
            }

            return id || null;
        }
        return null;
    });

    const controls = settings.noControls ? "&controls=0" : "";

    let embedUrl = null;
    if (videoId.value) {
        embedUrl = `https://www.youtube.com/embed/${videoId.value}?modestbranding=1&rel=0${controls}`;
    }

    return { videoId, embedUrl };
}
