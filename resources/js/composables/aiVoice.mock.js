import { vi } from "vitest";

/**
 * A stand-in for @/composables/aiVoice, for tests of the speech queue:
 *
 *     vi.mock("@/composables/aiVoice", async () =>
 *         (await import("@/composables/aiVoice.mock")).createAiVoiceMock(
 *             () => Boolean(pageProps.aiVoice)
 *         )
 *     );
 *
 * By default a clip starts at once and plays until stopped or ended
 * through `aiClip.options.onEnd()`; `resetAiVoiceMock()` restores that. Like the real module, stopping ends
 * the current clip; without that the module-level speech queue would wait
 * on it into the next test.
 *
 * The voice helpers (aiVoicesForLocale, resolveAiVoice, saveAiVoice) are
 * the real ones, reading the mocked usePage() and localStorage.
 */
export async function createAiVoiceMock(isEnabled) {
    const { aiVoicesForLocale, resolveAiVoice, saveAiVoice } =
        await vi.importActual("@/composables/aiVoice");
    const aiClip = { options: null };
    const startsClip = (_, options) => {
        aiClip.options = options;
        options.onStart?.();
        return Promise.resolve(true);
    };
    const playAiVoice = vi.fn(startsClip);

    return {
        AI_VOICE_MAX_REQUEST_TIMEOUT_MS: 5000,
        aiClip,
        // Call in beforeEach: clearAllMocks keeps a test's implementation.
        resetAiVoiceMock() {
            aiClip.options = null;
            playAiVoice.mockImplementation(startsClip);
        },
        aiVoiceEnabled: () => isEnabled(),
        aiVoicesForLocale,
        resolveAiVoice,
        saveAiVoice,
        prefetchAiVoice: vi.fn(() => Promise.resolve(null)),
        usePrefetchAiVoice: vi.fn(),
        primeAiVoice: vi.fn(),
        playAiVoice,
        stopAiVoice: vi.fn(() => {
            const options = aiClip.options;
            aiClip.options = null;
            options?.onEnd?.();
        }),
        pauseAiVoice: vi.fn(),
        resumeAiVoice: vi.fn(),
    };
}
