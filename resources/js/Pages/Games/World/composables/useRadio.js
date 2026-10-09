import { useMusicPlayer } from "@/composables/useMusicPlayer";

/**
 * A radio's dial, played through the site's music player (its flyout stays
 * shut, so the world isn't covered). `tune(songs)` plays the next of a
 * radio's songs: the first if none of them is on, and after the last one
 * playing, it switches off. The songs become the player's list, so a song
 * that ends moves on to the next by itself.
 */
export function useRadio(player = musicPlayer()) {
    function tune(songs) {
        if (!player || !songs?.length) return;
        const at = songs.findIndex(
            (song) => song.id === player.currentSong.value?.id
        );
        if (at === songs.length - 1 && player.isPlaying.value) {
            player.toggleCurrentSongPlayback();
            return;
        }
        player.setSongsList(songs);
        // The first again after the last, once it has stopped.
        player.playSong(songs[(at + 1) % songs.length], { openFlyout: false });
    }

    return { tune };
}

/** The site's music player, or none where it can't start (it reads
 * localStorage as it does, which throws when storage is blocked): the radio
 * is then silent rather than the world failing to open. */
function musicPlayer() {
    try {
        return useMusicPlayer();
    } catch {
        return null;
    }
}
