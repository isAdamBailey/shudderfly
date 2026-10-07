import {
    aiClip,
    pauseAiVoice,
    playAiVoice,
    primeAiVoice,
    resetAiVoiceMock,
    resumeAiVoice,
    stopAiVoice,
} from "@/composables/aiVoice";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";

const pageProps = {
    locale: "en",
    translations: {},
    aiVoice: null,
};

vi.mock("@inertiajs/vue3", () => ({
    usePage: () => ({ props: pageProps }),
}));

vi.mock("@/composables/aiVoice", async () =>
    (await import("@/composables/aiVoice.mock")).createAiVoiceMock(() =>
        Boolean(pageProps.aiVoice)
    )
);

let wrapper;

function mountSpeech() {
    let api;
    wrapper = mount(
        defineComponent({
            setup() {
                api = useSpeechSynthesis();
                return () => null;
            },
        })
    );
    return api;
}

describe("useSpeechSynthesis", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        localStorage.clear();
        pageProps.locale = "en";
        pageProps.aiVoice = null;
        vi.clearAllMocks();
        window.speechSynthesis.paused = false;
        window.speechSynthesis.getVoices.mockReturnValue([
            { name: "Test Voice", lang: "en-US" },
        ]);
    });

    afterEach(() => {
        wrapper?.unmount();
        wrapper = null;
        vi.useRealTimers();
    });

    it("speaks with the system default voice when getVoices is empty", () => {
        window.speechSynthesis.getVoices.mockReturnValue([]);
        const api = mountSpeech();

        api.speak("hello there");

        expect(window.speechSynthesis.speak).toHaveBeenCalled();
    });

    it("does not speak when the phrase is empty", () => {
        const api = mountSpeech();

        api.speak("");

        expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
    });

    describe("with the AI voice", () => {
        const endClip = async () => {
            const options = aiClip.options;
            aiClip.options = null;
            options.onEnd();
            await flushPromises();
        };

        beforeEach(() => {
            pageProps.aiVoice = { voices: { en: ["af_heart"] } };
            resetAiVoiceMock();
        });

        // The queue is module-level: end whatever a test left playing, and
        // let the watchdog clear a device fallback that never reported back.
        afterEach(async () => {
            stopAiVoice();
            await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
        });

        it("is not used while the AI voice is off", () => {
            pageProps.aiVoice = null;
            const api = mountSpeech();

            api.speak("hello");

            expect(playAiVoice).not.toHaveBeenCalled();
            expect(window.speechSynthesis.speak).toHaveBeenCalled();
        });

        it("primes the audio element inside the tap and plays with the stored settings", async () => {
            pageProps.locale = "fr";
            localStorage.setItem("speechRate", "1.5");
            localStorage.setItem("speechPitch", "0.8");
            localStorage.setItem("speechVolume", "0.6");
            const api = mountSpeech();

            api.speak("bonjour");
            expect(primeAiVoice).toHaveBeenCalledOnce();
            await flushPromises();

            expect(playAiVoice).toHaveBeenCalledWith(
                "bonjour",
                expect.objectContaining({
                    locale: "fr",
                    rate: 1.5,
                    pitch: 0.8,
                    volume: 0.6,
                })
            );
            expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
        });

        it("tracks speaking and fires onComplete once", async () => {
            const onComplete = vi.fn();
            const api = mountSpeech();

            api.speak("hello", onComplete);
            await flushPromises();
            expect(api.speaking.value).toBe(true);

            await endClip();

            expect(api.speaking.value).toBe(false);
            expect(onComplete).toHaveBeenCalledOnce();
        });

        it("queues phrases spoken back to back, like the device voice", async () => {
            const api = mountSpeech();

            api.speak("The title");
            api.speak("The excerpt");
            await flushPromises();

            expect(playAiVoice).toHaveBeenCalledOnce();
            expect(playAiVoice.mock.calls[0][0]).toBe("The title");

            await endClip();

            expect(playAiVoice).toHaveBeenCalledTimes(2);
            expect(playAiVoice.mock.calls[1][0]).toBe("The excerpt");
        });

        it("falls back to the device voice in turn when the AI voice fails", async () => {
            const onComplete = vi.fn();
            const api = mountSpeech();

            api.speak("first");
            api.speak("second", onComplete);
            await flushPromises();
            playAiVoice.mockResolvedValueOnce(false);
            await endClip();

            expect(window.speechSynthesis.speak).toHaveBeenCalledOnce();
            const utterance = window.speechSynthesis.speak.mock.calls[0][0];
            utterance.onend();
            expect(onComplete).toHaveBeenCalledOnce();
        });

        it("stopSpeech drops queued phrases and completes them", async () => {
            const first = vi.fn();
            const second = vi.fn();
            const api = mountSpeech();

            api.speak("first", first);
            api.speak("second", second);
            await flushPromises();
            api.stopSpeech();
            await flushPromises();

            expect(first).toHaveBeenCalledOnce();
            expect(second).toHaveBeenCalledOnce();
            expect(playAiVoice).toHaveBeenCalledOnce();
            expect(window.speechSynthesis.cancel).toHaveBeenCalled();
        });

        it("marks speaking as soon as a phrase is queued, before the clip loads", () => {
            // Still loading: onStart hasn't fired.
            playAiVoice.mockImplementation((_, options) => {
                aiClip.options = options;
                return new Promise(() => {});
            });
            const api = mountSpeech();

            api.speak("hello");

            expect(api.speaking.value).toBe(true);
        });

        it("moves the queue on when a phrase never reports its end", async () => {
            const onComplete = vi.fn();
            const api = mountSpeech();

            api.speak("stuck", onComplete);
            api.speak("next");
            await flushPromises();
            expect(playAiVoice).toHaveBeenCalledOnce();

            await vi.advanceTimersByTimeAsync(60000);

            expect(onComplete).toHaveBeenCalledOnce();
            expect(playAiVoice).toHaveBeenCalledTimes(2);
        });

        it("keeps a pause pressed while loading when falling back to the device voice", async () => {
            let settle;
            playAiVoice.mockReturnValueOnce(
                new Promise((resolve) => {
                    settle = resolve;
                })
            );
            const api = mountSpeech();

            api.speak("hello");
            await flushPromises();
            api.pauseSpeech();
            window.speechSynthesis.pause.mockClear();
            settle(false);
            await flushPromises();

            expect(window.speechSynthesis.speak).toHaveBeenCalledOnce();
            expect(window.speechSynthesis.pause).toHaveBeenCalledOnce();
        });

        it("completes without a request when the phrase is empty", () => {
            const onComplete = vi.fn();
            const api = mountSpeech();

            api.speak("", onComplete);

            expect(playAiVoice).not.toHaveBeenCalled();
            expect(onComplete).toHaveBeenCalledOnce();
        });

        it("pauses and resumes the AI voice too", () => {
            const api = mountSpeech();

            api.pauseSpeech();
            api.resumeSpeech();

            expect(pauseAiVoice).toHaveBeenCalledOnce();
            expect(resumeAiVoice).toHaveBeenCalledOnce();
        });
    });
});
