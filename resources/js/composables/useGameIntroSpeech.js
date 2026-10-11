import { aiVoiceEnabled } from "@/composables/aiVoice";
import {
    speakPhrase,
    speechStopCount,
    stopAllSpeech,
} from "@/composables/speechPlayback";
import {
    applySpeechSettingsToUtterance,
    getStoredAppLocale,
    isSpeechSynthesisAvailable,
    speakUtterance,
    waitForSpeechVoices,
} from "@/composables/speechVoice";

const isSpeechSupported =
    isSpeechSynthesisAvailable() &&
    typeof SpeechSynthesisUtterance !== "undefined";

// The line being fetched or spoken: { text, stops, until, ends }. Tapping
// the same thing again while it is would otherwise stop it and start over,
// so a new AI clip that takes a moment to fetch never got to play while
// someone kept tapping. A repeat waits on the line already under way
// instead, with no sign it was dropped. Any stop, here or anywhere else,
// retires it, and so does REPEAT_GUARD_MS, in case an end event never
// comes: a stuck guard must not silence the line for good. By then an AI
// clip has started or handed over to the device voice (its request gives
// up within AI_VOICE_MAX_REQUEST_TIMEOUT_MS).
let pending = null;
const REPEAT_GUARD_MS = 15000;

export function speakGameIntro(text, callerOnEnd) {
    if (
        pending?.text === text &&
        pending.stops === speechStopCount() &&
        Date.now() < pending.until
    ) {
        if (callerOnEnd) pending.ends.push(callerOnEnd);
        return;
    }

    stopGameIntroSpeech();

    const line = {
        text,
        stops: speechStopCount(),
        until: Date.now() + REPEAT_GUARD_MS,
        ends: [],
    };
    if (callerOnEnd) line.ends.push(callerOnEnd);
    pending = line;
    // Every caller waiting on this line hears when it ends, once.
    const onEnd = () => {
        if (pending === line) pending = null;
        line.ends.splice(0).forEach((end) => end());
    };

    // With the AI voice on, the intro takes the shared queue's AI voice and
    // device fallback like every other phrase; that fallback has the same
    // Safari workarounds as below.
    if (aiVoiceEnabled()) {
        speakPhrase(text, { onEnd });
        return;
    }

    if (!isSpeechSupported) {
        onEnd();
        return;
    }

    // Any stop while the intro waits below, from here or anywhere else in
    // the app, drops it rather than speaking it afterwards.
    const stoppedMeanwhile = () => {
        if (speechStopCount() === line.stops) {
            return false;
        }
        onEnd();
        return true;
    };

    waitForSpeechVoices().then((voices) => {
        if (stoppedMeanwhile()) return;
        const utterance = new SpeechSynthesisUtterance(text);
        // Use the app-wide voice/rate/pitch/volume the user has chosen and
        // persisted in localStorage, exactly like the rest of the app.
        applySpeechSettingsToUtterance(utterance, voices, getStoredAppLocale());

        utterance.onend = onEnd;
        utterance.onerror = onEnd;
        // Held by the line (only for this) while it's under way: without a
        // reference Chrome can collect the utterance mid-speech, and its
        // onend never fires.
        line.utterance = utterance;

        // Safari can drop an utterance spoken in the same tick as a cancel();
        // defer to the next tick so the queue has cleared.
        setTimeout(() => {
            if (stoppedMeanwhile()) return;
            speakUtterance(utterance);
        }, 0);
    });
}

// Stops all speech, not only the intro, as speechSynthesis.cancel() always
// did; that includes an AI voice clip and anything queued behind it.
export function stopGameIntroSpeech() {
    stopAllSpeech();
}
