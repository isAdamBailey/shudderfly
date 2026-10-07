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

// The utterance being spoken: without a reference Chrome can collect it
// mid-speech, and its onend never fires.
let currentUtterance = null;

export function speakGameIntro(text, onEnd) {
    stopGameIntroSpeech();

    // With the AI voice on, the intro takes the shared queue's AI voice and
    // device fallback like every other phrase; that fallback has the same
    // Safari workarounds as below.
    if (aiVoiceEnabled()) {
        speakPhrase(text, { onEnd });
        return;
    }

    if (!isSpeechSupported) {
        if (onEnd) onEnd();
        return;
    }

    // Any stop while the intro waits below, from here or anywhere else in
    // the app, drops it rather than speaking it afterwards.
    const stopsAtStart = speechStopCount();
    const stoppedMeanwhile = () => {
        if (speechStopCount() === stopsAtStart) {
            return false;
        }
        if (onEnd) onEnd();
        return true;
    };

    waitForSpeechVoices().then((voices) => {
        if (stoppedMeanwhile()) return;
        const utterance = new SpeechSynthesisUtterance(text);
        // Use the app-wide voice/rate/pitch/volume the user has chosen and
        // persisted in localStorage, exactly like the rest of the app.
        applySpeechSettingsToUtterance(utterance, voices, getStoredAppLocale());

        utterance.onend = () => {
            currentUtterance = null;
            if (onEnd) onEnd();
        };

        utterance.onerror = () => {
            currentUtterance = null;
            if (onEnd) onEnd();
        };

        currentUtterance = utterance;

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
    currentUtterance = null;
}
