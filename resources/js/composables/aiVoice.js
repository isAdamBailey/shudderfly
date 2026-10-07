/* global route */
import { usePage } from "@inertiajs/vue3";
import axios from "axios";

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

// A silent WAV, played during the user's tap so iOS lets the shared element
// play a clip that only arrives after the request.
const SILENT_WAV =
    "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

// locale|voice|text -> clip URL, for this page session.
const clipUrls = new Map();

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

async function fetchClipUrl(key, text, locale, voice, signal) {
    if (clipUrls.has(key)) {
        return clipUrls.get(key);
    }

    const { data } = await axios.post(
        route("ai-voice.speak"),
        { text, locale, voice },
        { signal, timeout: aiVoiceRequestTimeout(text) }
    );

    if (!data?.url) {
        throw new Error("AI voice response had no url");
    }

    clipUrls.set(key, data.url);

    return data.url;
}

/**
 * Speaks `text` with the AI voice.
 *
 * Resolves true once the AI voice has taken the phrase: the clip is
 * playing, or it was stopped or replaced before it could. onEnd then fires
 * exactly once, when the clip ends, errors, or is stopped. Resolves false
 * on any failure before playback (request error, 429, timeout, playback
 * refused); in that case no callback fires and the caller should use the
 * device voice instead.
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
    const phrase = normalizeAiVoiceText(text);
    if (
        !phrase ||
        // Code points, like the server's mb_strlen, not UTF-16 units.
        [...phrase].length > AI_VOICE_MAX_CHARACTERS ||
        Date.now() < unavailableUntil
    ) {
        return false;
    }
    const key = `${locale}|${voice ?? ""}|${phrase}`;

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
        url = await fetchClipUrl(key, phrase, locale, voice, controller.signal);
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
    audio = null;
    unavailableUntil = 0;
    consecutiveTimeouts = 0;
    primed = false;
}
