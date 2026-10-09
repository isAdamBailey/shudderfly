import { computed, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useRadio } from "./useRadio.js";

const songs = [
    { id: 1, title: "One" },
    { id: 2, title: "Two" },
];

function fakePlayer({ current = null, playing = false } = {}) {
    const currentSong = ref(current);
    const isPlaying = ref(playing);
    return {
        currentSong: computed(() => currentSong.value),
        isPlaying: computed(() => isPlaying.value),
        setSongsList: vi.fn(),
        playSong: vi.fn((song) => {
            currentSong.value = song;
        }),
        toggleCurrentSongPlayback: vi.fn(),
    };
}

describe("useRadio", () => {
    it("starts on the first song, flyout shut, with its songs as the list", () => {
        const player = fakePlayer({ current: { id: 9 }, playing: true });

        useRadio(player).tune(songs);

        expect(player.setSongsList).toHaveBeenCalledWith(songs);
        expect(player.playSong).toHaveBeenCalledWith(songs[0], {
            openFlyout: false,
        });
    });

    it("moves to the next song on each tune", () => {
        const player = fakePlayer({ current: songs[0], playing: true });

        useRadio(player).tune(songs);

        expect(player.playSong).toHaveBeenCalledWith(songs[1], {
            openFlyout: false,
        });
    });

    it("switches off after the last song", () => {
        const player = fakePlayer({ current: songs[1], playing: true });

        useRadio(player).tune(songs);

        expect(player.toggleCurrentSongPlayback).toHaveBeenCalled();
        expect(player.playSong).not.toHaveBeenCalled();
    });

    it("starts over once the last song has stopped", () => {
        const player = fakePlayer({ current: songs[1], playing: false });

        useRadio(player).tune(songs);

        expect(player.playSong).toHaveBeenCalledWith(songs[0], {
            openFlyout: false,
        });
    });

    it("does nothing with no songs", () => {
        const player = fakePlayer();

        useRadio(player).tune([]);

        expect(player.playSong).not.toHaveBeenCalled();
    });

    it("is silent with no music player", () => {
        expect(() => useRadio(null).tune(songs)).not.toThrow();
    });
});
