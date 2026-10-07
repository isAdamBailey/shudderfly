import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    AI_VOICE_BACKOFF_MS,
    AI_VOICE_MAX_CHARACTERS,
    AI_VOICE_MAX_REQUEST_TIMEOUT_MS,
    aiVoiceRequestTimeout,
    AI_VOICE_TIMEOUTS_BEFORE_BACKOFF,
    pauseAiVoice,
    playAiVoice,
    primeAiVoice,
    resetAiVoiceForTests,
    resumeAiVoice,
    stopAiVoice,
} from "@/composables/aiVoice";

vi.mock("axios", () => ({ default: { post: vi.fn() } }));

const CLIP_URL = "https://cdn.test/ai-voice/en/abc.mp3";

let lastAudio;

function respondWith(url = CLIP_URL) {
    axios.post.mockResolvedValue({ data: { url } });
}

function httpError(status) {
    return Object.assign(new Error(`HTTP ${status}`), {
        response: { status },
    });
}

describe("aiVoice", () => {
    beforeEach(() => {
        axios.post.mockReset();
        vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(
            function () {
                lastAudio = this;
                this.dispatchEvent(new Event("play"));
                return Promise.resolve();
            }
        );
        vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(
            function () {
                this.dispatchEvent(new Event("pause"));
            }
        );
    });

    afterEach(() => {
        // While play/pause are still mocked: jsdom implements neither.
        resetAiVoiceForTests();
        vi.restoreAllMocks();
    });

    it("requests the clip and plays it", async () => {
        respondWith();
        const onStart = vi.fn();

        const handled = await playAiVoice("Hello  @there", {
            locale: "es",
            volume: 0.5,
            onStart,
        });

        expect(handled).toBe(true);
        expect(axios.post).toHaveBeenCalledWith(
            "ai-voice.speak",
            { text: "Hello there", locale: "es", voice: null },
            expect.objectContaining({
                timeout: aiVoiceRequestTimeout("Hello there"),
                signal: expect.any(AbortSignal),
            })
        );
        expect(lastAudio.src).toBe(CLIP_URL);
        expect(lastAudio.volume).toBe(0.5);
        expect(onStart).toHaveBeenCalledOnce();
    });

    it("waits longer for a longer phrase, up to a cap", () => {
        // A new 165-character clip takes about 2.1 s to generate.
        expect(aiVoiceRequestTimeout("x".repeat(165))).toBeGreaterThan(2100);
        expect(aiVoiceRequestTimeout("x".repeat(2000))).toBe(
            AI_VOICE_MAX_REQUEST_TIMEOUT_MS
        );
    });

    it("keeps the natural pitch when only the rate changes", async () => {
        respondWith();

        await playAiVoice("Hi", { locale: "en", rate: 1.5, pitch: 1 });

        expect(lastAudio.playbackRate).toBe(1.5);
        expect(lastAudio.preservesPitch).toBe(true);
    });

    it("shifts pitch by letting playbackRate change it", async () => {
        respondWith();

        await playAiVoice("Hi", { locale: "en", rate: 1.2, pitch: 1.5 });

        expect(lastAudio.playbackRate).toBeCloseTo(1.8);
        expect(lastAudio.preservesPitch).toBe(false);
    });

    it("reuses the session cache instead of requesting the same clip again", async () => {
        respondWith();

        await playAiVoice("Hi there", { locale: "en" });
        await playAiVoice(" Hi  there ", { locale: "en" });

        expect(axios.post).toHaveBeenCalledOnce();
        expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
    });

    it("requests again for a different locale", async () => {
        respondWith();

        await playAiVoice("Hi", { locale: "en" });
        await playAiVoice("Hi", { locale: "fr" });

        expect(axios.post).toHaveBeenCalledTimes(2);
    });

    it.each([
        ["a network error", new Error("Network Error")],
        [
            "a timeout",
            Object.assign(new Error("timeout"), { code: "ECONNABORTED" }),
        ],
        ["a 429 over budget", httpError(429)],
        ["a 503 provider failure", httpError(503)],
    ])("resolves false without callbacks on %s", async (_, error) => {
        axios.post.mockRejectedValue(error);
        const onStart = vi.fn();
        const onEnd = vi.fn();

        const handled = await playAiVoice("Hi", {
            locale: "en",
            onStart,
            onEnd,
        });

        expect(handled).toBe(false);
        expect(onStart).not.toHaveBeenCalled();
        expect(onEnd).not.toHaveBeenCalled();
        expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    });

    it("resolves false and forgets the URL when the file won't play", async () => {
        respondWith();
        HTMLMediaElement.prototype.play.mockRejectedValueOnce(
            new DOMException("no source", "NotSupportedError")
        );

        expect(await playAiVoice("Hi", { locale: "en" })).toBe(false);

        await playAiVoice("Hi", { locale: "en" });
        expect(axios.post).toHaveBeenCalledTimes(2);
    });

    it("does not request text that is empty or too long", async () => {
        expect(await playAiVoice(" @ ", { locale: "en" })).toBe(false);
        expect(
            await playAiVoice("a".repeat(AI_VOICE_MAX_CHARACTERS + 1), {
                locale: "en",
            })
        ).toBe(false);

        expect(axios.post).not.toHaveBeenCalled();
    });

    it("fires onEnd once when the clip ends", async () => {
        respondWith();
        const onEnd = vi.fn();

        await playAiVoice("Hi", { locale: "en", onEnd });
        lastAudio.dispatchEvent(new Event("ended"));
        stopAiVoice();

        expect(onEnd).toHaveBeenCalledOnce();
    });

    it("fires onEnd once when a playing clip errors", async () => {
        respondWith();
        const onEnd = vi.fn();

        await playAiVoice("Hi", { locale: "en", onEnd });
        lastAudio.dispatchEvent(new Event("error"));
        lastAudio.dispatchEvent(new Event("ended"));

        expect(onEnd).toHaveBeenCalledOnce();
    });

    it("stops the playing clip", async () => {
        respondWith();
        const onEnd = vi.fn();

        await playAiVoice("Hi", { locale: "en", onEnd });
        stopAiVoice();

        expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
        expect(onEnd).toHaveBeenCalledOnce();
    });

    it("lets a new clip interrupt the one playing", async () => {
        respondWith();
        const firstEnd = vi.fn();
        const secondEnd = vi.fn();

        await playAiVoice("First", { locale: "en", onEnd: firstEnd });
        await playAiVoice("Second", { locale: "en", onEnd: secondEnd });

        expect(firstEnd).toHaveBeenCalledOnce();
        expect(secondEnd).not.toHaveBeenCalled();
    });

    it("treats a clip stopped mid-request as handled, without playing it", async () => {
        let resolveRequest;
        axios.post.mockReturnValue(
            new Promise((resolve) => {
                resolveRequest = resolve;
            })
        );
        const onEnd = vi.fn();

        const pending = playAiVoice("Hi", { locale: "en", onEnd });
        stopAiVoice();
        resolveRequest({ data: { url: CLIP_URL } });

        expect(await pending).toBe(true);
        expect(onEnd).toHaveBeenCalledOnce();
        expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    });

    it("pauses the playing clip without ending it", async () => {
        respondWith();
        const onEnd = vi.fn();

        await playAiVoice("Hi", { locale: "en", onEnd });
        pauseAiVoice();
        expect(onEnd).not.toHaveBeenCalled();
    });

    it("backs off for a while after a provider failure", async () => {
        vi.useFakeTimers();
        axios.post.mockRejectedValueOnce(httpError(503));
        respondWith();

        expect(await playAiVoice("Hi", { locale: "en" })).toBe(false);
        expect(await playAiVoice("Hi", { locale: "en" })).toBe(false);
        expect(axios.post).toHaveBeenCalledOnce();

        vi.advanceTimersByTime(AI_VOICE_BACKOFF_MS);
        expect(await playAiVoice("Hi", { locale: "en" })).toBe(true);
        vi.useRealTimers();
    });

    it("only backs off when timeouts repeat, since one is usually a slow new clip", async () => {
        const timeout = () =>
            Object.assign(new Error("timeout"), { code: "ECONNABORTED" });
        axios.post.mockRejectedValue(timeout());

        for (let i = 0; i < AI_VOICE_TIMEOUTS_BEFORE_BACKOFF; i++) {
            expect(await playAiVoice(`Phrase ${i}`, { locale: "en" })).toBe(
                false
            );
        }
        expect(axios.post).toHaveBeenCalledTimes(
            AI_VOICE_TIMEOUTS_BEFORE_BACKOFF
        );

        await playAiVoice("One more", { locale: "en" });
        expect(axios.post).toHaveBeenCalledTimes(
            AI_VOICE_TIMEOUTS_BEFORE_BACKOFF
        );
    });

    it("forgets a timeout once a request succeeds", async () => {
        const timeout = Object.assign(new Error("timeout"), {
            code: "ECONNABORTED",
        });
        for (let i = 0; i < 5; i++) {
            axios.post.mockRejectedValueOnce(timeout);
            axios.post.mockResolvedValueOnce({ data: { url: CLIP_URL } });
        }

        for (let i = 0; i < 10; i++) {
            await playAiVoice(`Phrase ${i}`, { locale: "en" });
        }

        expect(axios.post).toHaveBeenCalledTimes(10);
    });

    it("keeps the URL when autoplay is refused, since the file is fine", async () => {
        respondWith();
        HTMLMediaElement.prototype.play.mockRejectedValueOnce(
            new DOMException("blocked", "NotAllowedError")
        );

        expect(await playAiVoice("Hi", { locale: "en" })).toBe(false);
        await playAiVoice("Hi", { locale: "en" });

        expect(axios.post).toHaveBeenCalledOnce();
    });

    it("holds a clip paused while loading without playing any of it, until resumed", async () => {
        let resolveRequest;
        axios.post.mockReturnValue(
            new Promise((resolve) => {
                resolveRequest = resolve;
            })
        );
        const onStart = vi.fn();

        const pending = playAiVoice("Hi", { locale: "en", onStart });
        pauseAiVoice();
        resolveRequest({ data: { url: CLIP_URL } });

        expect(await pending).toBe(true);
        expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
        expect(onStart).toHaveBeenCalledOnce();

        resumeAiVoice();
        expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
    });

    it("a failed resume ends only the clip it tried to resume", async () => {
        respondWith();
        const firstEnd = vi.fn();
        const secondEnd = vi.fn();
        await playAiVoice("First", { locale: "en", onEnd: firstEnd });
        pauseAiVoice();

        let rejectResume;
        HTMLMediaElement.prototype.play.mockImplementationOnce(
            () =>
                new Promise((_, reject) => {
                    rejectResume = reject;
                })
        );
        resumeAiVoice();
        await playAiVoice("Second", { locale: "en", onEnd: secondEnd });
        rejectResume(new Error("nope"));
        await Promise.resolve();

        expect(firstEnd).toHaveBeenCalledOnce();
        expect(secondEnd).not.toHaveBeenCalled();
    });

    it("primes the element with a silent clip, once", () => {
        primeAiVoice();
        primeAiVoice();

        expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
        expect(lastAudio.src).toMatch(/^data:audio\/wav/);
    });

    it("the primer ending does not end a clip that is still loading", async () => {
        let resolveRequest;
        axios.post.mockReturnValue(
            new Promise((resolve) => {
                resolveRequest = resolve;
            })
        );
        const onEnd = vi.fn();

        primeAiVoice();
        const pending = playAiVoice("Hi", { locale: "en", onEnd });
        lastAudio.dispatchEvent(new Event("ended"));
        resolveRequest({ data: { url: CLIP_URL } });

        expect(await pending).toBe(true);
        expect(onEnd).not.toHaveBeenCalled();
        expect(lastAudio.src).toBe(CLIP_URL);
    });

    it.each([401, 419, 422])(
        "does not back off after a %s, which is about the request",
        async (status) => {
            axios.post.mockRejectedValueOnce(httpError(status));
            respondWith();

            expect(await playAiVoice("Hi", { locale: "en" })).toBe(false);
            expect(await playAiVoice("Hi", { locale: "en" })).toBe(true);
        }
    );

    it("counts characters like the server, so emoji don't count twice", async () => {
        respondWith();

        expect(
            await playAiVoice("😀".repeat(AI_VOICE_MAX_CHARACTERS), {
                locale: "en",
            })
        ).toBe(true);
    });

    it("keeps trying after a 429, since cached clips still play over budget", async () => {
        axios.post.mockRejectedValueOnce(httpError(429));
        respondWith();

        expect(await playAiVoice("New words", { locale: "en" })).toBe(false);
        expect(await playAiVoice("Cached words", { locale: "en" })).toBe(true);
    });
});
