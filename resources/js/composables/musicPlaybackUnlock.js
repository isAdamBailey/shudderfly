// iOS Safari only lets the music player (a YouTube iframe) start inside a
// tap. A song starts after its title has been announced, and a Games World
// radio after the Butt has walked over or someone else tuned it, all long
// after the tap. But once a tap has played the iframe's video, Safari lets
// it start by itself from then on, for as long as that iframe lives. So a
// tap plays whatever is loaded, muted, and it's paused again the moment it
// starts: the player is unlocked, and nothing was heard.

// The player has played, so it can start by itself.
let unlocked = false;
// A muted play to unlock it is on its way.
let priming = false;

/**
 * Lets the music player start later, outside the tap: call inside a user
 * gesture (a click, pointerup or keydown), as playSong does and the Games
 * World in a room with a radio. Cheap to call on every tap, and does
 * nothing once the player has played, or while it has nothing loaded.
 */
export function primeMusicPlayback() {
    if (unlocked) return;
    const player = window.__globalMusicPlayer;
    try {
        const { UNSTARTED, CUED } = window.YT.PlayerState;
        const state = player.getPlayerState();
        if (state !== UNSTARTED && state !== CUED) return;
        player.mute();
        player.playVideo();
        priming = true;
    } catch (e) {
        // No player yet, or it isn't ready.
    }
}

/**
 * Plays for real: every play goes through here, so one that overtakes a
 * muted play still on its way is heard (and isn't paused as that one).
 */
export function startMusicPlayback(player) {
    priming = false;
    // Always: YouTube can remember a mute a reload left behind.
    player.unMute?.();
    player.playVideo();
}

/**
 * Call when the player starts playing. True when that was only the muted
 * play of primeMusicPlayback, now paused again: not a song to count as
 * playing.
 */
export function settlePrimedPlayback(player) {
    unlocked = true;
    if (!priming) return false;
    priming = false;
    try {
        player.pauseVideo();
        player.unMute();
    } catch (e) {
        // Player may be in transition
    }
    return true;
}

/** A new player (another iframe) starts locked. */
export function resetMusicPlaybackUnlock() {
    unlocked = false;
    priming = false;
}
