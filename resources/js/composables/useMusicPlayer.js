import { computed, ref, watch } from "vue";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";

const STORAGE_KEY = "music_player_state";
const FLYOUT_STORAGE_KEY = "music_flyout_open";
const PLAYBACK_STATE_KEY = "music_playback_state";

// Global state (shared across all components)
const currentSong = ref(null);
const isPlaying = ref(false);
const isFlyoutOpen = ref(false);
const search = ref("");
const filter = ref("");
const songsList = ref([]);
const isAnnouncing = ref(false);
// A song joined part way through (a Games World radio someone else tuned):
// `{ id, startedAt }`, when it began in this browser's clock, for
// MusicPlayer to seek to where it has got to (takeJoinAt).
const joinAt = ref(null);
// What's playing and since when, `{ id, startedAt }` in this browser's
// clock, as MusicPlayer last found it on starting to play.
const playback = ref(null);

// Load initial state from localStorage
const loadState = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const state = JSON.parse(stored);
            if (state.currentSong) {
                currentSong.value = state.currentSong;
            }
        }
    } catch (e) {
        console.error("Error loading music state:", e);
    }

    try {
        const flyoutOpen = localStorage.getItem(FLYOUT_STORAGE_KEY);
        if (flyoutOpen !== null) {
            isFlyoutOpen.value = flyoutOpen === "true";
        }
    } catch (e) {
        console.error("Error loading flyout state:", e);
    }
};

// Save state to localStorage
const saveState = () => {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                currentSong: currentSong.value,
            })
        );
    } catch (e) {
        console.error("Error saving music state:", e);
    }
};

// Save flyout state
const saveFlyoutState = () => {
    try {
        localStorage.setItem(FLYOUT_STORAGE_KEY, isFlyoutOpen.value.toString());
    } catch (e) {
        console.error("Error saving flyout state:", e);
    }
};

// Watch for changes and save
watch(currentSong, saveState, { deep: true });
watch(isFlyoutOpen, saveFlyoutState);

// Initialize on module load
loadState();

export function useMusicPlayer() {
    const { speak, stopSpeech } = useSpeechSynthesis();
    const { t } = useTranslations();

    const announceSong = (song) => {
        if (!song?.title) return;
        // A quick skip replaces the last announcement rather than queueing.
        stopSpeech();
        isAnnouncing.value = true;
        speak(t("music.now_playing", { title: song.title }), () => {
            isAnnouncing.value = false;
        });
    };

    // `openFlyout: false` plays it without opening the flyout over the page
    // (the Games World radio): the player in it plays all the same.
    // `startedAt` (ms, this browser's clock) joins it part way through:
    // MusicPlayer seeks it to where it has got to.
    const playSong = (song, { openFlyout = true, startedAt = null } = {}) => {
        const isNewSong =
            !currentSong.value || currentSong.value.id !== song.id;
        currentSong.value = song;
        joinAt.value = startedAt === null ? null : { id: song.id, startedAt };
        if (openFlyout && !isFlyoutOpen.value) {
            isFlyoutOpen.value = true;
        }
        if (isNewSong) {
            announceSong(song);
        }
    };

    /** When song `id` was joined part way through, once (null if it
     * wasn't). */
    const takeJoinAt = (id) => {
        if (joinAt.value?.id !== id) return null;
        const { startedAt } = joinAt.value;
        joinAt.value = null;
        return startedAt;
    };

    const setPlayback = (value) => {
        playback.value = value;
    };

    const toggleCurrentSongPlayback = () => {
        const player = window.__globalMusicPlayer;
        if (!player) return;
        try {
            const state = player.getPlayerState();
            if (state === window.YT.PlayerState.PLAYING) {
                player.pauseVideo();
                setPlaying(false);
            } else {
                player.playVideo();
                setPlaying(true);
            }
        } catch (e) {
            // Player may not be ready
        }
    };

    /** Pauses whatever is playing, or about to (still loading or
     * buffering), and forgets a song waiting to be joined part way. */
    const pause = () => {
        joinAt.value = null;
        setPlaying(false);
        try {
            window.__globalMusicPlayer?.pauseVideo();
        } catch (e) {
            // Player may not be ready
        }
    };

    const setSongsList = (songs) => {
        songsList.value = songs;
    };

    const playNextSong = () => {
        if (!currentSong.value || songsList.value.length === 0) return false;
        const currentIndex = songsList.value.findIndex(
            (s) => s.id === currentSong.value.id
        );
        if (currentIndex === -1 || currentIndex >= songsList.value.length - 1)
            return false;
        playSong(songsList.value[currentIndex + 1]);
        return true;
    };

    const playPreviousSong = () => {
        if (!currentSong.value || songsList.value.length === 0) return false;
        const currentIndex = songsList.value.findIndex(
            (s) => s.id === currentSong.value.id
        );
        if (currentIndex <= 0) return false;
        playSong(songsList.value[currentIndex - 1]);
        return true;
    };

    const removeSongFromList = (songId) => {
        songsList.value = songsList.value.filter((s) => s.id !== songId);
        if (currentSong.value && currentSong.value.id === songId) {
            currentSong.value = null;
            isPlaying.value = false;
        }
    };

    const closePlayer = () => {};

    const stopPlayer = () => {
        currentSong.value = null;
        isPlaying.value = false;
    };

    const toggleFlyout = () => {
        isFlyoutOpen.value = !isFlyoutOpen.value;
    };

    const openFlyout = () => {
        isFlyoutOpen.value = true;
    };

    const closeFlyout = () => {
        isFlyoutOpen.value = false;
    };

    const setPlaying = (playing) => {
        isPlaying.value = playing;
        try {
            localStorage.setItem(
                PLAYBACK_STATE_KEY,
                JSON.stringify({
                    isPlaying: playing,
                    timestamp: Date.now(),
                })
            );
        } catch (e) {}
    };

    const getSavedPlaybackState = () => {
        try {
            const stored = localStorage.getItem(PLAYBACK_STATE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {}
        return null;
    };

    const setSearch = (searchValue) => {
        search.value = searchValue || "";
    };

    const setFilter = (filterValue) => {
        filter.value = filterValue || "";
    };

    return {
        // State
        currentSong: computed(() => currentSong.value),
        isPlaying: computed(() => isPlaying.value),
        isFlyoutOpen: computed(() => isFlyoutOpen.value),
        search: computed(() => search.value),
        filter: computed(() => filter.value),
        songsList: computed(() => songsList.value),
        isAnnouncing: computed(() => isAnnouncing.value),
        joinAt: computed(() => joinAt.value),
        playback: computed(() => playback.value),

        // Methods
        playSong,
        takeJoinAt,
        setPlayback,
        toggleCurrentSongPlayback,
        pause,
        setSongsList,
        playNextSong,
        playPreviousSong,
        removeSongFromList,
        closePlayer,
        stopPlayer,
        toggleFlyout,
        openFlyout,
        closeFlyout,
        setPlaying,
        setSearch,
        setFilter,
        getSavedPlaybackState,
    };
}
