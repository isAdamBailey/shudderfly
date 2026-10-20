import { useMusicPlayer } from "@/composables/useMusicPlayer";
import { watch } from "vue";

// How long a tuned song has to start playing before nobody else is told.
const START_WITHIN_MS = 20000;
// Someone already this close to where a song they're told of has got to
// carries on as they are, rather than seek.
const IN_STEP_MS = 2000;

/**
 * A radio's dial, played through the site's music player (its flyout stays
 * shut, so the world isn't covered). `tune(songs)` plays the next of a
 * radio's songs: the first if none of them is on, and after the last one
 * playing, it switches off. It returns the song it put on, null when it
 * switched off, or undefined when it couldn't do either. The songs become
 * the player's list, so a song that ends moves on to the next by itself.
 * `isOn(songs)`: whether one of a radio's songs is playing (reactive), so
 * its dial can light.
 *
 * The same radio for everyone in the room (issue #174): `started(song)`
 * says when a tuned song began playing, `nowPlaying(songs)` which of a
 * radio's songs is on and since when, `join(...)` plays what someone else
 * tuned from where it has got to, and `stop(songs)` switches it off again.
 * Times are ms in this browser's clock. `dispose()` gives up anything still
 * waiting on a song to start.
 */
export function useRadio(player = musicPlayer()) {
    // The song last joined from someone else, and what was playing as it
    // was (`{ id, playback }`), to stop it even before it starts.
    let joined = null;
    // How to give up each wait still going (started, a deferred stop).
    const waits = new Set();
    // How to give up a deferred stop: tuned or joined again meanwhile.
    let stopping = null;

    function tune(songs) {
        if (!player || !songs?.length) return undefined;
        settle();
        const at = songs.findIndex(
            (song) => song.id === player.currentSong.value?.id
        );
        if (at === songs.length - 1 && player.isPlaying.value) {
            player.pause();
            return null;
        }
        player.setSongsList(songs);
        // The first again after the last, once it has stopped.
        const song = songs[(at + 1) % songs.length];
        player.playSong(song, { openFlyout: false });
        return song;
    }

    function isOn(songs) {
        if (!player || !player.isPlaying.value) return false;
        const id = player.currentSong.value?.id;
        return Boolean(songs?.some((song) => song.id === id));
    }

    /** `{ songId, startedAt }` for whichever of a radio's songs is
     * playing, or null. */
    function nowPlaying(songs) {
        const playback = player?.playback.value;
        if (!isOn(songs) || playback?.id !== player.currentSong.value.id) {
            return null;
        }
        return { songId: playback.id, startedAt: playback.startedAt };
    }

    /** Resolves with what `decide(currentSong, playback)` first returns
     * other than undefined as either changes, or null after
     * START_WITHIN_MS or on dispose. `onWait(done)` is handed the way to
     * give up early. */
    function waitFor(decide, onWait = () => {}) {
        return new Promise((resolve) => {
            const done = (value) => {
                if (!waits.delete(done)) return;
                unwatch();
                clearTimeout(timer);
                resolve(value);
            };
            waits.add(done);
            onWait(done);
            const timer = setTimeout(() => done(null), START_WITHIN_MS);
            const unwatch = watch(
                [player.currentSong, player.playback],
                ([current, playback]) => {
                    const value = decide(current, playback);
                    if (value !== undefined) done(value);
                }
            );
        });
    }

    /** Resolves with when `song`, just tuned, began playing, or null if
     * something else is put on first or it never starts. */
    function started(song) {
        if (!player) return Promise.resolve(null);
        return waitFor((current, playback) => {
            if (current?.id !== song.id) return null;
            if (playback?.id === song.id) return playback.startedAt;
            return undefined;
        });
    }

    /** Plays song `songId` of a radio's `songs`, as tuned by someone else
     * at `startedAt`, from where it has got to. Someone listening to
     * something else is left alone. */
    function join(songs, songId, startedAt) {
        const song = songs?.find((s) => s.id === songId);
        if (!player || !song) return;
        if (player.isPlaying.value && !isOn(songs)) return;
        const now = nowPlaying(songs);
        if (
            now?.songId === songId &&
            Math.abs(now.startedAt - startedAt) < IN_STEP_MS
        ) {
            return;
        }
        settle();
        joined = { id: songId, playback: player.playback.value };
        player.setSongsList(songs);
        player.playSong(song, { openFlyout: false, startedAt });
    }

    /** Switched off by someone else: stops a radio's song, and nothing
     * else. A song joined that's still being announced or loading is
     * stopped once it starts. */
    async function stop(songs) {
        if (!player) return;
        if (isOn(songs)) {
            player.pause();
            return;
        }
        // Nothing joined still to start: it has played since (and been
        // paused), or something else is on.
        const id = joined?.id;
        if (player.playback.value !== joined?.playback) return;
        if (player.currentSong.value?.id !== id) return;
        if (!songs?.some((song) => song.id === id)) return;
        stopping?.(null);
        const playing = await waitFor(
            (current, playback) => {
                if (current?.id !== id) return false;
                if (playback?.id === id) return true;
                return undefined;
            },
            (done) => (stopping = done)
        );
        if (playing) player.pause();
    }

    /** Tuned or joined: an earlier switch-off waiting on a song to start
     * is overtaken, and a song you put on isn't one joined. */
    function settle() {
        stopping?.(null);
        stopping = null;
        joined = null;
    }

    /** Gives up every wait still going: the world has gone. */
    function dispose() {
        [...waits].forEach((done) => done(null));
    }

    return { tune, isOn, nowPlaying, started, join, stop, dispose };
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
