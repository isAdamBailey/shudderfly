import { computed, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRadio } from "./useRadio.js";

const songs = [
    { id: 1, title: "One" },
    { id: 2, title: "Two" },
];

function fakePlayer({ current = null, playing = false, since = null } = {}) {
    const currentSong = ref(current);
    const isPlaying = ref(playing);
    const playback = ref(
        since === null ? null : { id: current.id, startedAt: since }
    );
    return {
        currentSong: computed(() => currentSong.value),
        isPlaying: computed(() => isPlaying.value),
        setSongsList: vi.fn(),
        playSong: vi.fn((song) => {
            currentSong.value = song;
        }),
        pause: vi.fn(() => {
            isPlaying.value = false;
        }),
        playback: computed(() => playback.value),
        // What the YouTube player does on its own: starts playing.
        startPlaying: () => {
            isPlaying.value = true;
            playback.value = {
                id: currentSong.value.id,
                startedAt: Date.now(),
            };
        },
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

        expect(player.pause).toHaveBeenCalled();
        expect(player.playSong).not.toHaveBeenCalled();
    });

    it("starts over once the last song has stopped", () => {
        const player = fakePlayer({ current: songs[1], playing: false });

        useRadio(player).tune(songs);

        expect(player.playSong).toHaveBeenCalledWith(songs[0], {
            openFlyout: false,
        });
    });

    it("says what it did", () => {
        const radio = useRadio(
            fakePlayer({ current: songs[1], playing: true })
        );
        expect(radio.tune(songs)).toBeNull();
        expect(radio.tune([])).toBeUndefined();
        expect(useRadio(fakePlayer()).tune(songs)).toBe(songs[0]);
    });

    it("does nothing with no songs", () => {
        const player = fakePlayer();

        useRadio(player).tune([]);

        expect(player.playSong).not.toHaveBeenCalled();
    });

    it("is silent with no music player", () => {
        expect(() => useRadio(null).tune(songs)).not.toThrow();
        expect(useRadio(null).isOn(songs)).toBe(false);
    });

    it("is on only while one of its songs plays", () => {
        expect(
            useRadio(fakePlayer({ current: songs[1], playing: true })).isOn(
                songs
            )
        ).toBe(true);
        expect(
            useRadio(fakePlayer({ current: songs[1], playing: false })).isOn(
                songs
            )
        ).toBe(false);
        expect(
            useRadio(fakePlayer({ current: { id: 9 }, playing: true })).isOn(
                songs
            )
        ).toBe(false);
    });

    describe("together", () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(100000);
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it("says which of its songs is on, and since when", () => {
            const radio = useRadio(
                fakePlayer({ current: songs[1], playing: true, since: 70000 })
            );

            expect(radio.nowPlaying(songs)).toEqual({
                songId: 2,
                startedAt: 70000,
            });
            expect(radio.nowPlaying([{ id: 9 }])).toBeNull();
        });

        it("says when a tuned song starts playing", async () => {
            const player = fakePlayer({
                current: songs[0],
                playing: true,
                since: 50000,
            });
            const radio = useRadio(player);
            const started = radio.started(radio.tune(songs));

            vi.setSystemTime(103000);
            player.startPlaying();

            await expect(started).resolves.toBe(103000);
        });

        it("says nothing of a song replaced or never started", async () => {
            const player = fakePlayer();
            const radio = useRadio(player);
            const replaced = radio.started(radio.tune(songs));
            player.playSong({ id: 9 });
            await expect(replaced).resolves.toBeNull();

            const stuck = radio.started(radio.tune(songs));
            vi.advanceTimersByTime(20000);
            await expect(stuck).resolves.toBeNull();
        });

        it("joins someone else's song from where it has got to", () => {
            const player = fakePlayer();

            useRadio(player).join(songs, 2, 70000);

            expect(player.setSongsList).toHaveBeenCalledWith(songs);
            expect(player.playSong).toHaveBeenCalledWith(songs[1], {
                openFlyout: false,
                startedAt: 70000,
            });
        });

        it("follows the radio from one of its songs to another", () => {
            const player = fakePlayer({ current: songs[0], playing: true });

            useRadio(player).join(songs, 2, 70000);

            expect(player.playSong).toHaveBeenCalled();
        });

        it("leaves someone already in step with the song as they are", () => {
            const player = fakePlayer({
                current: songs[1],
                playing: true,
                since: 69000,
            });

            useRadio(player).join(songs, 2, 70000);

            expect(player.playSong).not.toHaveBeenCalled();
        });

        it("leaves someone listening to something else alone", () => {
            const player = fakePlayer({ current: { id: 9 }, playing: true });

            useRadio(player).join(songs, 2, 70000);

            expect(player.playSong).not.toHaveBeenCalled();
        });

        it("joins only a song the radio has", () => {
            const player = fakePlayer();

            useRadio(player).join(songs, 9, 70000);

            expect(player.playSong).not.toHaveBeenCalled();
        });

        it("stops only the radio's songs", () => {
            const other = fakePlayer({ current: { id: 9 }, playing: true });
            useRadio(other).stop(songs);
            expect(other.pause).not.toHaveBeenCalled();

            const on = fakePlayer({ current: songs[0], playing: true });
            useRadio(on).stop(songs);
            expect(on.pause).toHaveBeenCalled();
        });

        it("stops a joined song still loading once it starts", async () => {
            const player = fakePlayer();
            const radio = useRadio(player);
            radio.join(songs, 2, 70000);

            const stopped = radio.stop(songs);
            expect(player.pause).not.toHaveBeenCalled();
            player.startPlaying();
            await stopped;

            expect(player.pause).toHaveBeenCalled();
        });

        it("doesn't wait to stop a joined song that has played and been paused", async () => {
            const player = fakePlayer();
            const radio = useRadio(player);
            radio.join(songs, 2, 70000);
            player.startPlaying();
            player.pause();
            player.pause.mockClear();

            const stopped = radio.stop(songs);
            player.startPlaying();
            await stopped;

            expect(player.pause).not.toHaveBeenCalled();
        });

        it("doesn't stop a song you put on yourself before it starts", async () => {
            const player = fakePlayer();
            const radio = useRadio(player);
            radio.tune(songs);

            await radio.stop(songs);

            expect(player.pause).not.toHaveBeenCalled();
        });

        it("forgets a deferred stop once joined again", async () => {
            const player = fakePlayer();
            const radio = useRadio(player);
            radio.join(songs, 2, 70000);
            const stopped = radio.stop(songs);

            radio.join(songs, 1, 90000);
            player.startPlaying();
            await stopped;

            expect(player.pause).not.toHaveBeenCalled();
        });

        it("gives up waiting for a song to start on dispose", async () => {
            const tuned = fakePlayer();
            const mine = useRadio(tuned);
            const started = mine.started(mine.tune(songs));
            mine.dispose();
            tuned.startPlaying();
            await expect(started).resolves.toBeNull();

            const joined = fakePlayer();
            const theirs = useRadio(joined);
            theirs.join(songs, 2, 70000);
            const stopped = theirs.stop(songs);
            theirs.dispose();
            joined.startPlaying();
            await stopped;
            expect(joined.pause).not.toHaveBeenCalled();
        });
    });
});
