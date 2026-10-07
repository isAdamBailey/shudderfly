import { usePage } from "@inertiajs/vue3";
import {
    AI_VOICE_MAX_REQUEST_TIMEOUT_MS,
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
    waitForSpeechVoices,
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
// The device utterance being spoken: without a reference Chrome can collect
// it mid-speech, and its onend never fires.
let currentUtterance = null;

// If a phrase's end event never arrives (a stalled clip, or Chrome dropping
// an utterance's onend), the queue moves on after this long rather than
// silencing every later phrase. Generous: the longest a clip request may
// take, plus a few seconds, plus 2.5 characters a second, slower than the
// slowest playbackRate the AI voice allows (0.25).
const PHRASE_WATCHDOG_BASE_MS = AI_VOICE_MAX_REQUEST_TIMEOUT_MS + 5000;
const PHRASE_WATCHDOG_MS_PER_CHARACTER = 400;

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
        const end = () => {
            if (currentUtterance === utterance) {
                currentUtterance = null;
            }
            onEnd();
        };
        utterance.onstart = () => onStart?.();
        utterance.onend = end;
        utterance.onpause = () => onPause?.();
        utterance.onresume = () => onResume?.();
        utterance.onerror = (event) => {
            console.error("Speech error:", event.error);
            end();
        };

        currentUtterance = utterance;
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
        // From now on, stopping ends this phrase itself.
        entry.cancel = finish;
        // Held while paused, so a long pause doesn't end the phrase and
        // start the next one over it; resume starts it afresh. Firing also
        // stops the clip, so it can't play on over the next phrase.
        entry.holdWatchdog = () => clearTimeout(watchdog);
        entry.startWatchdog = () => {
            clearTimeout(watchdog);
            watchdog = setTimeout(() => {
                stopAiVoice();
                finish();
            }, PHRASE_WATCHDOG_BASE_MS + phrase.length * PHRASE_WATCHDOG_MS_PER_CHARACTER);
        };
        entry.startWatchdog();

        const fallBack = async () => {
            // No request was made in some cases (backoff, too long), so this
            // can follow the stop that started the phrase in the same task,
            // before Safari has its voices: it drops an utterance either way.
            await waitForSpeechVoices();
            await new Promise((next) => setTimeout(next));
            if (finished) {
                return;
            }
            speakWithDeviceVoice(phrase, { ...callbacks, onEnd: finish });
            // speakUtterance resumes a paused synth; a pause pressed while
            // the AI voice was loading must still hold.
            if (paused) {
                window.speechSynthesis?.pause();
            }
        };

        // Settings are read now, not when queued, so a change made meanwhile
        // applies. Any error, here or inside playAiVoice, means the device
        // voice, not a phrase stuck until the watchdog.
        Promise.resolve()
            .then(() =>
                playAiVoice(phrase, {
                    ...readStoredSpeechSettings(),
                    locale: currentLocale(),
                    onStart: callbacks.onStart,
                    onEnd: finish,
                })
            )
            .catch((error) => {
                console.error("AI voice error:", error);
                return false;
            })
            .then((handled) => {
                if (!handled && !finished) {
                    return fallBack();
                }
            })
            .catch(finish);
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

export function speechStopCount() {
    return stops;
}

/**
 * Stops whatever is speaking, by either voice, and drops every queued
 * phrase. Each dropped phrase still gets its onEnd.
 */
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
    currentUtterance = null;
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
