import { computed } from "vue";

export default function useGetYouTubeVideo(videoLink, settings = {}) {
    const videoId = computed(() => {
        if (videoLink) {
            const urlObj = new URL(videoLink);
            const params = new URLSearchParams(urlObj.search);

            let id;
            if (videoLink.includes("watch?v=")) {
                id = params.get("v");
            } else if (videoLink.includes("playlist?list=")) {
                id = params.get("list");
            } else {
                const parts = videoLink.split("/");
                id = parts[parts.length - 1].split("?")[0];
            }

            return id || null;
        }
        return null;
    });

    const isPlaylist = computed(
        () => videoLink && videoLink.includes("playlist?list=")
    );
    const controls = settings.noControls ? "&controls=0" : "";

    const embedUrl = computed(() => {
        if (!videoId.value) return null;

        if (isPlaylist.value) {
            return `https://www.youtube.com/embed/videoseries?list=${videoId.value}&modestbranding=1&rel=0${controls}`;
        } else {
            return `https://www.youtube.com/embed/${videoId.value}?modestbranding=1&rel=0${controls}`;
        }
    });

    return { videoId, embedUrl, isPlaylist };
}
