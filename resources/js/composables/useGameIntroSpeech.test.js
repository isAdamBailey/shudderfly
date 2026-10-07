import { aiClip, playAiVoice, resetAiVoiceMock } from "@/composables/aiVoice";
import { stopAllSpeech } from "@/composables/speechPlayback";
import {
    speakGameIntro,
    stopGameIntroSpeech,
} from "@/composables/useGameIntroSpeech";
import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pageProps = { locale: "en", aiVoice: null };

vi.mock("@inertiajs/vue3", () => ({
    usePage: () => ({ props: pageProps }),
}));

vi.mock("@/composables/aiVoice", async () =>
    (await import("@/composables/aiVoice.mock")).createAiVoiceMock(() =>
        Boolean(pageProps.aiVoice)
    )
);

describe("useGameIntroSpeech", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        pageProps.aiVoice = null;
        resetAiVoiceMock();
        window.speechSynthesis.paused = false;
    });

    afterEach(async () => {
        stopAllSpeech();
        await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
        vi.useRealTimers();
    });

    describe("with the AI voice off", () => {
        it("cancels, then speaks the intro with the device voice", async () => {
            speakGameIntro("How to play");
            await vi.advanceTimersByTimeAsync(0);

            expect(window.speechSynthesis.cancel).toHaveBeenCalled();
            expect(window.speechSynthesis.speak).toHaveBeenCalledOnce();
            expect(playAiVoice).not.toHaveBeenCalled();
        });

        it("drops an intro stopped while it waits to speak", async () => {
            const onEnd = vi.fn();

            speakGameIntro("How to play", onEnd);
            stopAllSpeech();
            await vi.advanceTimersByTimeAsync(0);

            expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
            expect(onEnd).toHaveBeenCalledOnce();
        });

        it("ends when the utterance ends", async () => {
            const onEnd = vi.fn();

            speakGameIntro("How to play", onEnd);
            await vi.advanceTimersByTimeAsync(0);
            window.speechSynthesis.speak.mock.calls[0][0].onend();

            expect(onEnd).toHaveBeenCalledOnce();
        });
    });

    describe("with the AI voice on", () => {
        beforeEach(() => {
            pageProps.aiVoice = { voices: { en: ["af_heart"] } };
        });

        it("plays the intro with the AI voice", async () => {
            speakGameIntro("How to play");
            await flushPromises();

            expect(playAiVoice).toHaveBeenCalledWith(
                "How to play",
                expect.any(Object)
            );
            expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
        });

        it("stopping ends the clip and fires onEnd once", async () => {
            const onEnd = vi.fn();

            speakGameIntro("How to play", onEnd);
            await flushPromises();
            stopGameIntroSpeech();

            expect(onEnd).toHaveBeenCalledOnce();
            expect(aiClip.options).toBeNull();
        });

        it("interrupts a clip that's already playing", async () => {
            const first = vi.fn();

            speakGameIntro("First game", first);
            await flushPromises();
            speakGameIntro("Second game");
            await flushPromises();

            expect(first).toHaveBeenCalledOnce();
            expect(playAiVoice).toHaveBeenCalledTimes(2);
            expect(playAiVoice.mock.calls[1][0]).toBe("Second game");
        });
    });
});
