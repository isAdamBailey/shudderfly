import { useMusicPlayer } from "@/composables/useMusicPlayer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const speech = vi.hoisted(() => ({ speak: vi.fn(), stopSpeech: vi.fn() }));

vi.mock("@/composables/useSpeechSynthesis", () => ({
    useSpeechSynthesis: () => speech,
}));

vi.mock("@/composables/useTranslations", () => ({
    useTranslations: () => ({ t: (key) => key }),
}));

describe("useMusicPlayer", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it("stops the previous announcement before announcing a new song", () => {
        const { playSong } = useMusicPlayer();

        playSong({ id: 1, title: "First" });
        playSong({ id: 2, title: "Second" });

        expect(speech.stopSpeech).toHaveBeenCalledTimes(2);
        expect(speech.speak).toHaveBeenCalledTimes(2);
        expect(speech.stopSpeech.mock.invocationCallOrder[1]).toBeLessThan(
            speech.speak.mock.invocationCallOrder[1]
        );
    });

    it("can play a song without opening the flyout", () => {
        const { playSong, closeFlyout, isFlyoutOpen } = useMusicPlayer();
        closeFlyout();

        playSong({ id: 3, title: "Quiet" }, { openFlyout: false });
        expect(isFlyoutOpen.value).toBe(false);

        playSong({ id: 4, title: "Loud" });
        expect(isFlyoutOpen.value).toBe(true);
    });

    it("keeps where a song was joined, for the player to take once", () => {
        const { playSong, takeJoinAt, joinAt } = useMusicPlayer();

        playSong({ id: 10, title: "Late" }, { startedAt: 70000 });
        expect(joinAt.value).toEqual({ id: 10, startedAt: 70000 });
        expect(takeJoinAt(11)).toBeNull();
        expect(takeJoinAt(10)).toBe(70000);
        expect(takeJoinAt(10)).toBeNull();
    });

    it("forgets a join once a song is played the usual way", () => {
        const { playSong, takeJoinAt } = useMusicPlayer();

        playSong({ id: 12, title: "Late" }, { startedAt: 70000 });
        playSong({ id: 13, title: "Mine" });

        expect(takeJoinAt(12)).toBeNull();
        expect(takeJoinAt(13)).toBeNull();
    });

    it("keeps what's playing and since when", () => {
        const { setPlayback, playback } = useMusicPlayer();

        setPlayback({ id: 14, startedAt: 5000 });

        expect(playback.value).toEqual({ id: 14, startedAt: 5000 });
    });

    it("pauses whatever is on, even while it loads, and drops a join", () => {
        const pauseVideo = vi.fn();
        window.__globalMusicPlayer = { pauseVideo };
        const { playSong, pause, joinAt, isPlaying, setPlaying } =
            useMusicPlayer();
        playSong({ id: 15, title: "Late" }, { startedAt: 70000 });
        setPlaying(true);

        pause();

        expect(pauseVideo).toHaveBeenCalled();
        expect(isPlaying.value).toBe(false);
        expect(joinAt.value).toBeNull();
        window.__globalMusicPlayer = null;
    });
});
