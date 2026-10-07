/* global route */
import { usePage } from "@inertiajs/vue3";
import axios from "axios";
import { watch } from "vue";
import { getAppLocaleFromPage } from "@/composables/speechVoice";

// Plays AI voice clips from POST /ai-voice. State is module-level so only
// one clip plays app-wide: any new clip, from any component, stops the last.
//
// Clips are always generated at the default speed and shaped in the
// browser, so one cached clip serves every slider position: rate sets
// playbackRate with preservesPitch on; a pitch other than 1 turns
// preservesPitch off and multiplies into playbackRate, the only pitch
// control an <audio> element has.

// How long to wait for a clip before using the device voice. A new clip
// takes about 0.6 s plus 9 ms a character to generate (measured on
// DeepInfra, October 2026: 18 characters in 0.74 s, 110 in 1.6 s), so a
// fixed wait sent every longer phrase, such as a game intro, to the device
// voice on its first play. The wait grows with the phrase, up to a cap past
// which the device voice is quicker; the server still caches the clip.
const AI_VOICE_BASE_REQUEST_TIMEOUT_MS = 1500;
const AI_VOICE_TIMEOUT_MS_PER_CHARACTER = 15;
export const AI_VOICE_MAX_REQUEST_TIMEOUT_MS = 5000;

export function aiVoiceRequestTimeout(phrase) {
    return Math.min(
        AI_VOICE_MAX_REQUEST_TIMEOUT_MS,
        // UTF-16 units: close enough for a wait, and no array to build.
        AI_VOICE_BASE_REQUEST_TIMEOUT_MS +
            phrase.length * AI_VOICE_TIMEOUT_MS_PER_CHARACTER
    );
}

// Mirrors AiVoiceService::MAX_CHARACTERS: longer text would only get a 422.
export const AI_VOICE_MAX_CHARACTERS = 2000;

// After a provider failure or network error, skip the AI voice for this
// long, so a broken provider costs one wait rather than one per phrase.
// A 429 (daily budget spent) does not count: cached clips still play over
// budget, and the 429 itself comes back quickly.
export const AI_VOICE_BACKOFF_MS = 60000;

// A single timeout is usually a new clip that took longer than the client
// waits; the server still finishes and caches it, so the next tap is fast.
// Only this many in a row look like a hung provider.
export const AI_VOICE_TIMEOUTS_BEFORE_BACKOFF = 3;

// A prefetch nobody is waiting on can take as long as the server does to
// make a long clip: two provider attempts, well inside its 10 s timeout.
export const AI_VOICE_PREFETCH_TIMEOUT_MS = 15000;

// How long text must stay on screen before its clip is prefetched, so
// paging quickly through a book doesn't make a clip for every page passed.
export const AI_VOICE_PREFETCH_DELAY_MS = 1500;

// A silent WAV, played during the user's tap so iOS lets the shared element
// play a clip that only arrives after the request.
const SILENT_WAV =
    "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

// locale|voice|text -> clip URL, for this page session.
const clipUrls = new Map();
// locale|voice|text -> Promise of its URL, while that request runs.
const requests = new Map();

let audio = null;
let unavailableUntil = 0;
let consecutiveTimeouts = 0;
let primed = false;
// The clip that owns the audio element, from request until it ends. A clip
// is live only while it is `current`; anything that replaces or clears it
// has already ended it.
let current = null;

/**
 * The aiVoice prop is only shared while ai_voice_enabled is on and the
 * provider has a key, so it is a stricter gate than the setting alone.
 */
export function aiVoiceEnabled() {
    return Boolean(usePage().props.aiVoice);
}

// The voice picked for each app locale is saved separately, so switching
// language switches voice too: aiVoice.en, aiVoice.es, aiVoice.fr.
export const AI_VOICE_STORAGE_PREFIX = "aiVoice.";

/**
 * The AI voices allowed for `locale`, from services.ai_voice.voices. The
 * first is the locale's default. Empty when the AI voice is off.
 */
export function aiVoicesForLocale(locale) {
    return usePage().props.aiVoice?.voices?.[locale] ?? [];
}

// The voice a seasonal theme (HandleInertiaRequests::getCurrentTheme) uses
// instead of the locale's default, for people who never picked one. Used
// only while the voice is still in the locale's allow-list; French has no
// Santa voice.
const SEASONAL_AI_VOICES = {
    christmas: { en: "am_santa", es: "em_santa" },
};

/**
 * The voice to speak `locale` in: the saved choice while it is still
 * allowed, otherwise the seasonal voice for the current theme, otherwise
 * the locale's default. Null when the AI voice is off, so the server picks.
 */
export function resolveAiVoice(locale) {
    const voices = aiVoicesForLocale(locale);
    const saved = localStorage.getItem(AI_VOICE_STORAGE_PREFIX + locale);
    if (voices.includes(saved)) {
        return saved;
    }

    const seasonal = SEASONAL_AI_VOICES[usePage().props.theme]?.[locale];

    return voices.includes(seasonal) ? seasonal : voices[0] ?? null;
}

export function saveAiVoice(locale, voice) {
    localStorage.setItem(AI_VOICE_STORAGE_PREFIX + locale, voice);
}

/**
 * Call synchronously inside the user's tap, before anything async. Mobile
 * Safari only lets an element play without a fresh tap once it has played
 * during one, and the real clip arrives after a network round trip.
 */
export function primeAiVoice() {
    if (primed || current) {
        return;
    }
    primed = true;
    const player = audioElement();
    player.src = SILENT_WAV;
    player.play().catch(() => {
        primed = false;
    });
}

// Network errors and provider failures back off at once; timeouts only
// when they repeat. A 4xx (spent budget, expired session, rejected text)
// is about this request, not the provider, and comes back quickly.
function recordRequestFailure(error) {
    const status = error?.response?.status;
    if (status && status < 500) {
        return;
    }

    const timedOut =
        error?.code === "ECONNABORTED" || error?.code === "ETIMEDOUT";
    consecutiveTimeouts = timedOut ? consecutiveTimeouts + 1 : 0;

    if (!timedOut || consecutiveTimeouts >= AI_VOICE_TIMEOUTS_BEFORE_BACKOFF) {
        unavailableUntil = Date.now() + AI_VOICE_BACKOFF_MS;
        consecutiveTimeouts = 0;
    }
}

// The same clean-up AiVoiceService::normalize() applies, so the session
// cache key matches what the server would hash.
export function normalizeAiVoiceText(text) {
    return String(text ?? "")
        .replace(/@/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function audioElement() {
    if (!audio) {
        audio = new Audio();
        // Only a clip that has started can end or error: before that the
        // element may still be playing the silent primer, and a failing
        // play() rejects instead.
        const finishStarted = () => {
            if (current?.started) {
                current.finish();
            }
        };
        audio.addEventListener("ended", finishStarted);
        audio.addEventListener("error", finishStarted);
    }

    return audio;
}

function clamp(value, min, max) {
    const number = Number(value);

    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : 1;
}

function clipKey(locale, voice, phrase) {
    return `${locale}|${voice ?? ""}|${phrase}`;
}

// The normalized phrase when the AI voice could take it now, else null:
// it has words, fits in one clip, and the provider isn't in backoff.
function speakablePhrase(text) {
    const phrase = normalizeAiVoiceText(text);

    return phrase &&
        // Code points, like the server's mb_strlen, not UTF-16 units.
        [...phrase].length <= AI_VOICE_MAX_CHARACTERS &&
        Date.now() >= unavailableUntil
        ? phrase
        : null;
}

// The clip URL for `key`, from this session's cache or from one request
// per key: a play and a prefetch of the same text share it. A second
// request would only wait on the server's lock for the first, and fail
// once that takes longer than a couple of seconds.
function requestClipUrl(key, routeName, body, timeout) {
    if (clipUrls.has(key)) {
        return Promise.resolve(clipUrls.get(key));
    }
    if (!requests.has(key)) {
        requests.set(
            key,
            axios
                .post(route(routeName), body, { timeout })
                .then(({ data }) => {
                    if (!data?.url) {
                        throw new Error("AI voice response had no url");
                    }
                    clipUrls.set(key, data.url);

                    return data.url;
                })
                .finally(() => requests.delete(key))
        );
    }

    return requests.get(key);
}

// Waits for `request` no longer than `timeoutMs` and not past `signal`.
// The request itself carries on, so the clip is cached for the next tap.
function waitForClip(request, signal, timeoutMs) {
    return new Promise((resolve, reject) => {
        const onAbort = () => fail(new Error("AI voice request stopped"));
        const settle = (finish) => (value) => {
            clearTimeout(timer);
            signal.removeEventListener("abort", onAbort);
            finish(value);
        };
        const fail = settle(reject);
        const timer = setTimeout(
            () =>
                fail(
                    Object.assign(new Error("AI voice request timed out"), {
                        code: "ECONNABORTED",
                    })
                ),
            timeoutMs
        );
        signal.addEventListener("abort", onAbort);
        request.then(settle(resolve), fail);
    });
}

/**
 * Speaks `text` with the AI voice.
 *
 * Resolves true once the AI voice has taken the phrase: the clip is
 * playing, or it was stopped or replaced before it could. onEnd then fires
 * exactly once, when the clip ends, errors, or is stopped. Resolves false
 * on any failure before playback (request error, 429, timeout, playback
 * refused); in that case no callback fires and the caller should use the
 * device voice instead. Without a `voice`, the locale's saved voice is used.
 */
export async function playAiVoice(
    text,
    {
        locale,
        voice = null,
        rate = 1,
        pitch = 1,
        volume = 1,
        onStart,
        onEnd,
    } = {}
) {
    const phrase = speakablePhrase(text);
    if (!phrase) {
        return false;
    }
    const voiceId = voice ?? resolveAiVoice(locale);
    const key = clipKey(locale, voiceId, phrase);

    stopAiVoice();

    const controller = new AbortController();
    const clip = {
        started: false,
        // Paused while still loading: start paused once it can play.
        pauseRequested: false,
        finish() {
            if (current !== clip) {
                return;
            }
            current = null;
            onEnd?.();
        },
        stop() {
            controller.abort();
            // Also covers a play() still pending on this clip's src.
            audio?.pause();
            clip.finish();
        },
    };
    current = clip;

    // Failing before playback hands the phrase back to the caller, unless
    // the clip was stopped meanwhile: onEnd has fired, so it's handled.
    const fail = () => {
        if (current !== clip) {
            return true;
        }
        current = null;

        return false;
    };

    let url;
    try {
        const timeout = aiVoiceRequestTimeout(phrase);
        url = await waitForClip(
            requestClipUrl(
                key,
                "ai-voice.speak",
                { text: phrase, locale, voice: voiceId },
                timeout
            ),
            controller.signal,
            timeout
        );
    } catch (error) {
        if (current === clip) {
            recordRequestFailure(error);
        }

        return fail();
    }
    consecutiveTimeouts = 0;

    if (current !== clip) {
        return true;
    }

    const player = audioElement();
    const pitchFactor = clamp(pitch, 0.1, 4);
    player.src = url;
    player.volume = clamp(volume, 0, 1);
    player.preservesPitch = pitchFactor === 1;
    player.playbackRate = clamp(clamp(rate, 0.1, 4) * pitchFactor, 0.25, 4);

    // Paused while loading: hold it ready, and resume plays it.
    if (!clip.pauseRequested) {
        try {
            await player.play();
        } catch (error) {
            // A broken or missing file must not stay cached for this
            // session; a refused autoplay says nothing about the file.
            if (error?.name !== "NotAllowedError") {
                clipUrls.delete(key);
            }

            return fail();
        }
    }

    if (current === clip) {
        clip.started = true;
        onStart?.();
    }

    return true;
}

/**
 * Asks for the clip `text` would play in the app locale and saved voice,
 * without playing it, so a later speak() of the same text starts at once.
 * Skipped while the AI voice is off, on a data-saving connection, or
 * during the backoff; failures are silent, since nothing is waiting.
 * Resolves the clip URL, or null.
 */
export function prefetchAiVoice(text) {
    const phrase = speakablePhrase(text);
    if (!phrase || !aiVoiceEnabled() || navigator.connection?.saveData) {
        return Promise.resolve(null);
    }
    const locale = getAppLocaleFromPage(usePage());
    const voice = resolveAiVoice(locale);

    return requestClipUrl(
        clipKey(locale, voice, phrase),
        "ai-voice.prefetch",
        { text: phrase, locale, voice },
        AI_VOICE_PREFETCH_TIMEOUT_MS
    ).catch(() => null);
}

/**
 * Prefetches the clip for the text `source` returns once it has been on
 * screen for AI_VOICE_PREFETCH_DELAY_MS, again whenever that text changes
 * (Inertia reuses a page component from one record to the next), and not
 * at all if the component goes away first.
 */
export function usePrefetchAiVoice(source) {
    watch(
        source,
        (text, _, onCleanup) => {
            const timer = setTimeout(
                () => prefetchAiVoice(text),
                AI_VOICE_PREFETCH_DELAY_MS
            );
            onCleanup(() => clearTimeout(timer));
        },
        { immediate: true }
    );
}

export function stopAiVoice() {
    current?.stop();
}

export function pauseAiVoice() {
    if (!current) {
        return;
    }
    if (current.started) {
        audio.pause();
    } else {
        current.pauseRequested = true;
    }
}

export function resumeAiVoice() {
    const clip = current;
    if (!clip) {
        return;
    }
    clip.pauseRequested = false;
    if (clip.started) {
        audio.play().catch(() => clip.finish());
    }
}

// For tests only: forget cached URLs, the backoff and the audio element.
export function resetAiVoiceForTests() {
    stopAiVoice();
    clipUrls.clear();
    requests.clear();
    audio = null;
    unavailableUntil = 0;
    consecutiveTimeouts = 0;
    primed = false;
}
