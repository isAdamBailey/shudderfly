import { usePage } from "@inertiajs/vue3";
import {
    aiVoiceEnabled,
    pauseAiVoice,
    playAiVoice,
    primeAiVoice,
    resumeAiVoice,
    stopAiVoice,
} from "@/composables/aiVoice";
import {
    applySpeechSettingsToUtterance,
    getAppLocaleFromPage,
    isSpeechSynthesisAvailable,
    readStoredSpeechSettings,
    speakUtterance,
} from "@/composables/speechVoice";

// Every spoken phrase in the app goes through speakPhrase, so the AI voice,
// its device-voice fallback, and stopping all speech behave the same from a
// component's speak(), a game intro, or the global timer.
//
// With the AI voice on, phrases play one after another, the way
// speechSynthesis queues utterances: a page that speaks a title and then an
// excerpt must say both. Each entry is { run, cancel }; run resolves when its
// phrase has finished, by either voice.
const queue = [];
let draining = false;
// The entry being spoken, so stopping can end it at once rather than wait
// for an end event that a cancelled utterance may never send.
let active = null;
// Pressed while a queued phrase is loading: a fallback to the device voice
// must start paused too. Only set while a queued phrase is active, and
// cleared when it ends, so a stale pause can't silence a later phrase.
let paused = false;
// While stopping, a phrase spoken from a cancelled phrase's onEnd is ended
// at once rather than queued, so nothing survives the stop.
let stopping = false;
// Counts stops, so speech held outside the queue (the game intro waiting on
// Safari's voice list) can tell it was stopped before it began.
let stops = 0;

// If a phrase's end event never arrives (a stalled clip, or Chrome dropping
// an utterance's onend), the queue moves on after this long rather than
// silencing every later phrase. Generous: ~8 characters a second at the
// slowest rate, plus time to fetch.
const PHRASE_WATCHDOG_BASE_MS = 10000;
const PHRASE_WATCHDOG_MS_PER_CHARACTER = 250;

// Read at speak time, not when queued, so a change made meanwhile applies.
const currentLocale = () => getAppLocaleFromPage(usePage());

async function drain() {
    if (draining) {
        return;
    }
    draining = true;
    try {
        while (queue.length) {
            active = queue.shift();
            try {
                await active.run();
            } catch (error) {
                // A phrase that throws must not stall every later one.
                console.error("Speech error:", error);
                active.cancel();
            }
        }
    } finally {
        active = null;
        draining = false;
    }
}

function speakWithDeviceVoice(phrase, { onStart, onEnd, onPause, onResume }) {
    if (!isSpeechSynthesisAvailable() || !phrase) {
        onEnd();
        return;
    }
    try {
        const utterance = new SpeechSynthesisUtterance(
            phrase.replace(/@/g, "")
        );
        applySpeechSettingsToUtterance(
            utterance,
            window.speechSynthesis.getVoices(),
            currentLocale()
        );
        utterance.onstart = () => onStart?.();
        utterance.onend = () => onEnd();
        utterance.onpause = () => onPause?.();
        utterance.onresume = () => onResume?.();
        utterance.onerror = (event) => {
            console.error("Speech error:", event.error);
            onEnd();
        };

        speakUtterance(utterance);
    } catch (error) {
        onEnd();
    }
}

// The AI voice, or the device voice if it can't, resolving when the phrase
// is over so the next one in the queue can start.
function speakInTurn(phrase, callbacks, entry) {
    return new Promise((resolve) => {
        let finished = false;
        let watchdog;
        const finish = () => {
            if (finished) {
                return;
            }
            finished = true;
            clearTimeout(watchdog);
            paused = false;
            callbacks.onEnd();
            resolve();
        };
        // Held while paused, so a long pause doesn't end the phrase and
        // start the next one over it; resume starts it afresh.
        entry.holdWatchdog = () => clearTimeout(watchdog);
        entry.startWatchdog = () => {
            clearTimeout(watchdog);
            watchdog = setTimeout(
                finish,
                PHRASE_WATCHDOG_BASE_MS +
                    phrase.length * PHRASE_WATCHDOG_MS_PER_CHARACTER
            );
        };
        entry.startWatchdog();

        playAiVoice(phrase, {
            ...readStoredSpeechSettings(),
            locale: currentLocale(),
            onStart: callbacks.onStart,
            onEnd: finish,
        }).then((handled) => {
            if (handled || finished) {
                return;
            }
            speakWithDeviceVoice(phrase, { ...callbacks, onEnd: finish });
            // speakUtterance resumes a paused synth; a pause pressed while
            // the AI voice was loading must still hold.
            if (paused) {
                window.speechSynthesis?.pause();
            }
        });

        // From now on, stopping ends this phrase itself.
        entry.cancel = finish;
    });
}

/**
 * Speaks `phrase` with the AI voice when it's on, falling back to the
 * device voice, and queued behind any phrase already playing.
 *
 * onEnd fires exactly once, when the phrase ends, errors, is stopped, or
 * can't be spoken at all. onStart, onPause and onResume are optional.
 *
 * Returns true when the phrase was queued for the AI voice, which may take
 * a request before onStart; false when it went straight to the device.
 */
export function speakPhrase(
    phrase,
    { onStart, onEnd, onPause, onResume } = {}
) {
    let ended = false;
    const callbacks = {
        onStart,
        onPause,
        onResume,
        onEnd: () => {
            if (ended) {
                return;
            }
            ended = true;
            onEnd?.();
        },
    };

    if (stopping) {
        callbacks.onEnd();
        return false;
    }

    if (phrase && aiVoiceEnabled()) {
        primeAiVoice();
        const entry = {
            // Dropped before its turn: it still completes, as a cancelled
            // utterance does.
            cancel: callbacks.onEnd,
            run: () => speakInTurn(phrase, callbacks, entry),
        };
        queue.push(entry);
        drain();
        return true;
    }

    speakWithDeviceVoice(phrase, callbacks);
    return false;
}

/**
 * Stops whatever is speaking, by either voice, and drops every queued
 * phrase. Each dropped phrase still gets its onEnd.
 */
export function speechStopCount() {
    return stops;
}

export function stopAllSpeech() {
    stops += 1;
    stopping = true;
    try {
        queue.splice(0).forEach((entry) => entry.cancel());
        active?.cancel();
        stopAiVoice();
    } finally {
        stopping = false;
    }
    paused = false;
    if (isSpeechSynthesisAvailable()) {
        window.speechSynthesis.cancel();
    }
}

export function pauseAllSpeech() {
    pauseAiVoice();
    if (active) {
        paused = true;
        active.holdWatchdog?.();
    }
    if (isSpeechSynthesisAvailable()) {
        window.speechSynthesis.pause();
    }
}

export function resumeAllSpeech() {
    resumeAiVoice();
    if (paused) {
        active?.startWatchdog?.();
    }
    paused = false;
    if (isSpeechSynthesisAvailable()) {
        window.speechSynthesis.resume();
    }
}
