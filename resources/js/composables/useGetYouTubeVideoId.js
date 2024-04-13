import { computed } from "vue";

export default function useGetYouTubeVideoId(videoLink) {
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

    return { videoId };
}
