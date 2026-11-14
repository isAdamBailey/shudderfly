import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    primeMusicPlayback,
    resetMusicPlaybackUnlock,
    settlePrimedPlayback,
    startMusicPlayback,
} from "@/composables/musicPlaybackUnlock";

const STATES = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, CUED: 5 };

describe("musicPlaybackUnlock", () => {
    let player;

    beforeEach(() => {
        resetMusicPlaybackUnlock();
        global.YT = { PlayerState: STATES };
        player = {
            getPlayerState: vi.fn(() => STATES.CUED),
            playVideo: vi.fn(),
            pauseVideo: vi.fn(),
            mute: vi.fn(),
            unMute: vi.fn(),
        };
        window.__globalMusicPlayer = player;
    });

    it("plays a cued song muted in a tap, and pauses it as it starts", () => {
        primeMusicPlayback();

        expect(player.mute).toHaveBeenCalled();
        expect(player.playVideo).toHaveBeenCalledTimes(1);

        // Not a song playing: the player says so.
        expect(settlePrimedPlayback(player)).toBe(true);
        expect(player.pauseVideo).toHaveBeenCalled();
        expect(player.unMute).toHaveBeenCalled();
    });

    it("leaves a player alone once it has played", () => {
        expect(settlePrimedPlayback(player)).toBe(false);
        expect(player.pauseVideo).not.toHaveBeenCalled();

        primeMusicPlayback();

        expect(player.playVideo).not.toHaveBeenCalled();
    });

    it("leaves a song that's paused or playing alone", () => {
        player.getPlayerState.mockReturnValue(STATES.PAUSED);

        primeMusicPlayback();

        expect(player.mute).not.toHaveBeenCalled();
        expect(player.playVideo).not.toHaveBeenCalled();
    });

    it("tries again on the next tap while the player hasn't started", () => {
        primeMusicPlayback();
        primeMusicPlayback();

        expect(player.playVideo).toHaveBeenCalledTimes(2);
    });

    it("lets a real play overtake the muted one", () => {
        primeMusicPlayback();
        startMusicPlayback(player);

        expect(player.unMute).toHaveBeenCalled();
        expect(player.playVideo).toHaveBeenCalledTimes(2);
        // The song starting is the real one: it plays on.
        expect(settlePrimedPlayback(player)).toBe(false);
        expect(player.pauseVideo).not.toHaveBeenCalled();
    });

    it("unmutes whenever it plays for real", () => {
        // YouTube can remember a mute from before a reload.
        startMusicPlayback(player);

        expect(player.unMute).toHaveBeenCalled();
        expect(player.playVideo).toHaveBeenCalledTimes(1);
    });

    it("does nothing without a player, or one that isn't ready", () => {
        window.__globalMusicPlayer = null;
        expect(() => primeMusicPlayback()).not.toThrow();

        window.__globalMusicPlayer = {};
        expect(() => primeMusicPlayback()).not.toThrow();
    });
});
