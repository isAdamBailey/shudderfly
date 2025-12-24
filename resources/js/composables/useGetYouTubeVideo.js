import { computed, unref } from "vue";

export default function useGetYouTubeVideo(videoLink, settings = {}) {
  // Convert to computed if it's a function (getter), otherwise wrap in computed for reactivity
  const videoLinkRef =
    typeof videoLink === "function"
      ? computed(videoLink)
      : videoLink && typeof videoLink === "object" && "value" in videoLink
      ? videoLink
      : computed(() => videoLink);
  const videoId = computed(() => {
    const currentVideoLink = unref(videoLinkRef);
    if (currentVideoLink) {
      try {
        const urlObj = new URL(currentVideoLink);
        const params = new URLSearchParams(urlObj.search);

        let id;
        if (currentVideoLink.includes("watch?v=")) {
          id = params.get("v");
        } else if (currentVideoLink.includes("playlist?list=")) {
          id = params.get("list");
        } else {
          const parts = currentVideoLink.split("/");
          id = parts[parts.length - 1].split("?")[0];
        }
        return id || null;
      } catch (error) {
        return null;
      }
    }
    return null;
  });

  const isPlaylist = computed(() => {
    const currentVideoLink = unref(videoLinkRef);
    return currentVideoLink && currentVideoLink.includes("playlist?list=");
  });
  const controls = settings.noControls ? "&controls=0" : "";

  const embedUrl = computed(() => {
    if (!videoId.value) {
      return null;
    }

    if (isPlaylist.value) {
      return `https://www.youtube.com/embed/videoseries?list=${videoId.value}&modestbranding=1&rel=0${controls}`;
    } else {
      return `https://www.youtube.com/embed/${videoId.value}?modestbranding=1&rel=0${controls}`;
    }
  });

  return { videoId, embedUrl, isPlaylist };
}
