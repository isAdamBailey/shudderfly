import { computed, unref } from "vue";

// The hosts the app can build a youtube-nocookie embed from. The id parsing
// below is host-blind — it will happily take the last path segment of any URL
// as an "id" — so callers that accept arbitrary links must check the host too.
const YOUTUBE_HOSTS = [
    "youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtube-nocookie.com",
    "youtu.be",
];

export function isYouTubeUrl(url) {
    if (!url) return false;

    try {
        return YOUTUBE_HOSTS.includes(
            new URL(url).hostname.replace(/^www\./, "")
        );
    } catch {
        return false;
    }
}

export function isYouTubePlaylist(url) {
    return Boolean(url && url.includes("playlist?list="));
}

export function youTubeVideoId(url) {
    if (!url) return null;

    try {
        const params = new URLSearchParams(new URL(url).search);

        if (url.includes("watch?v=")) return params.get("v") || null;
        if (isYouTubePlaylist(url)) return params.get("list") || null;

        const lastSegment = url.split("/").pop().split("?")[0];
        return lastSegment || null;
    } catch {
        return null;
    }
}

/**
 * True only for links VideoWrapper can render as its lazy thumbnail facade: a
 * single YouTube video with a usable id. Playlists are excluded because they
 * mount a live iframe instead, and a channel or bare-domain link parses to an
 * id that yields a dead player.
 */
export function isEmbeddableYouTubeVideo(url) {
    return (
        isYouTubeUrl(url) &&
        !isYouTubePlaylist(url) &&
        youTubeVideoId(url) !== null
    );
}

export default function useGetYouTubeVideo(videoLink, settings = {}) {
    // Convert to computed if it's a function (getter), otherwise wrap in computed for reactivity
    const videoLinkRef =
        typeof videoLink === "function"
            ? computed(videoLink)
            : videoLink && typeof videoLink === "object" && "value" in videoLink
            ? videoLink
            : computed(() => videoLink);
    const videoId = computed(() => youTubeVideoId(unref(videoLinkRef)));

    const isPlaylist = computed(() => isYouTubePlaylist(unref(videoLinkRef)));
    const controls = settings.noControls ? "&controls=0" : "";

    const embedUrl = computed(() => {
        if (!videoId.value) {
            return null;
        }

        if (isPlaylist.value) {
            return `https://www.youtube-nocookie.com/embed/videoseries?list=${videoId.value}&modestbranding=1&rel=0&playsinline=1${controls}`;
        } else {
            return `https://www.youtube-nocookie.com/embed/${videoId.value}?modestbranding=1&rel=0&playsinline=1${controls}`;
        }
    });

    return { videoId, embedUrl, isPlaylist };
}
