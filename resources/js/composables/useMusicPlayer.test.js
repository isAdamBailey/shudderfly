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
});
