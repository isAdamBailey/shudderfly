import {
    playAiVoice,
    resetAiVoiceMock,
    stopAiVoice,
} from "@/composables/aiVoice";
import {
    pauseAllSpeech,
    resumeAllSpeech,
    speakPhrase,
    stopAllSpeech,
} from "@/composables/speechPlayback";
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

describe("speechPlayback", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        localStorage.clear();
        vi.clearAllMocks();
        pageProps.aiVoice = null;
        pageProps.locale = "en";
        resetAiVoiceMock();
        window.speechSynthesis.paused = false;
    });

    afterEach(async () => {
        stopAllSpeech();
        await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
        vi.useRealTimers();
    });

    describe("with the AI voice off", () => {
        it("speaks with the device voice and makes no AI request", () => {
            const onEnd = vi.fn();

            speakPhrase("hello", { onEnd });

            expect(playAiVoice).not.toHaveBeenCalled();
            expect(window.speechSynthesis.speak).toHaveBeenCalledOnce();
            window.speechSynthesis.speak.mock.calls[0][0].onend();
            expect(onEnd).toHaveBeenCalledOnce();
        });

        it("speaks a preview in the voice it is given", () => {
            const voice = { name: "Amelie", lang: "fr-CA" };

            speakPhrase("bonjour", { deviceVoice: voice });

            const utterance = window.speechSynthesis.speak.mock.calls[0][0];
            expect(utterance.voice).toBe(voice);
            expect(utterance.lang).toBe("fr-CA");
        });

        it("stopAllSpeech cancels the device voice", () => {
            stopAllSpeech();

            expect(window.speechSynthesis.cancel).toHaveBeenCalledOnce();
        });
    });

    describe("with the AI voice on", () => {
        beforeEach(() => {
            pageProps.aiVoice = { voices: { en: ["af_heart"] } };
        });

        it("plays a preview in the AI voice it is given", async () => {
            speakPhrase("hello", { aiVoice: "am_puck" });
            await flushPromises();

            expect(playAiVoice).toHaveBeenCalledWith(
                "hello",
                expect.objectContaining({ voice: "am_puck" })
            );
        });

        it("plays the phrase in the page locale", async () => {
            pageProps.locale = "es";

            speakPhrase("hola");
            await flushPromises();

            expect(playAiVoice).toHaveBeenCalledWith(
                "hola",
                expect.objectContaining({ locale: "es" })
            );
            expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
        });

        it("stopAllSpeech ends the playing clip and drops the queue", async () => {
            const first = vi.fn();
            const second = vi.fn();

            speakPhrase("first", { onEnd: first });
            speakPhrase("second", { onEnd: second });
            await flushPromises();
            stopAllSpeech();
            await flushPromises();

            expect(first).toHaveBeenCalledOnce();
            expect(second).toHaveBeenCalledOnce();
            expect(playAiVoice).toHaveBeenCalledOnce();
            expect(stopAiVoice).toHaveBeenCalled();
            expect(window.speechSynthesis.cancel).toHaveBeenCalled();
        });

        it("ends a device fallback at once when stopped, without waiting for its onend", async () => {
            vi.spyOn(console, "error").mockImplementation(() => {});
            playAiVoice.mockResolvedValueOnce(false);
            const onEnd = vi.fn();

            speakPhrase("fallback", { onEnd });
            await vi.advanceTimersByTimeAsync(0);
            const utterance = window.speechSynthesis.speak.mock.calls[0][0];

            stopAllSpeech();
            expect(onEnd).toHaveBeenCalledOnce();

            // The cancelled utterance reporting late must not end it twice.
            utterance.onerror({ error: "interrupted" });
            expect(onEnd).toHaveBeenCalledOnce();
        });

        it("plays a phrase spoken right after a stop without waiting", async () => {
            playAiVoice.mockResolvedValueOnce(false);

            speakPhrase("old song");
            await flushPromises();
            stopAllSpeech();
            speakPhrase("new song");
            await flushPromises();

            expect(playAiVoice).toHaveBeenCalledTimes(2);
            expect(playAiVoice.mock.calls[1][0]).toBe("new song");
        });

        it("does not fall back once a phrase stopped while loading resolves", async () => {
            let settle;
            playAiVoice.mockReturnValueOnce(
                new Promise((resolve) => {
                    settle = resolve;
                })
            );

            speakPhrase("hello");
            await flushPromises();
            stopAllSpeech();
            settle(false);
            await flushPromises();

            expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
        });

        it("drops a phrase spoken from onEnd while stopping", async () => {
            speakPhrase("title", {
                onEnd: () => speakPhrase("excerpt"),
            });
            await flushPromises();
            stopAllSpeech();
            await flushPromises();

            expect(playAiVoice).toHaveBeenCalledOnce();
        });

        it("falls back to the device voice when the AI voice throws", async () => {
            vi.spyOn(console, "error").mockImplementation(() => {});
            playAiVoice.mockRejectedValueOnce(new Error("no audio"));
            const onEnd = vi.fn();

            speakPhrase("broken", { onEnd });
            speakPhrase("next");
            await vi.advanceTimersByTimeAsync(0);

            expect(window.speechSynthesis.speak).toHaveBeenCalledOnce();
            window.speechSynthesis.speak.mock.calls[0][0].onend();
            await flushPromises();

            expect(onEnd).toHaveBeenCalledOnce();
            expect(playAiVoice).toHaveBeenCalledTimes(2);
            expect(playAiVoice.mock.calls[1][0]).toBe("next");
        });

        it("waits a tick after a stop before the device fallback speaks", async () => {
            playAiVoice.mockResolvedValueOnce(false);

            stopAllSpeech();
            speakPhrase("game intro");
            await flushPromises();
            expect(window.speechSynthesis.speak).not.toHaveBeenCalled();

            await vi.advanceTimersByTimeAsync(0);
            expect(window.speechSynthesis.speak).toHaveBeenCalledOnce();
        });

        it("holds the watchdog while paused", async () => {
            const onEnd = vi.fn();

            speakPhrase("paused phrase", { onEnd });
            await flushPromises();
            pauseAllSpeech();
            await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
            expect(onEnd).not.toHaveBeenCalled();

            resumeAllSpeech();
            await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
            expect(onEnd).toHaveBeenCalledOnce();
        });

        it("ignores a pause pressed when nothing is queued", async () => {
            pauseAllSpeech();
            playAiVoice.mockResolvedValueOnce(false);
            window.speechSynthesis.pause.mockClear();

            speakPhrase("time's up");
            await vi.advanceTimersByTimeAsync(0);

            expect(window.speechSynthesis.speak).toHaveBeenCalledOnce();
            expect(window.speechSynthesis.pause).not.toHaveBeenCalled();
        });
    });
});
