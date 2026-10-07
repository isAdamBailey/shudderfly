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
} from "@/composables/speechVoice";

const isSpeechSupported =
    isSpeechSynthesisAvailable() &&
    typeof SpeechSynthesisUtterance !== "undefined";

// Safari populates the voice list asynchronously; getVoices() is usually empty
// on first call. Resolve once voices are available (or a short timeout elapses)
// so the intro speech doesn't silently no-op with no configured voice.
function ensureVoicesLoaded(timeoutMs = 1000) {
    return new Promise((resolve) => {
        if (!isSpeechSupported) {
            resolve([]);
            return;
        }
        const existing = window.speechSynthesis.getVoices();
        if (existing.length > 0) {
            resolve(existing);
            return;
        }

        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            window.speechSynthesis.onvoiceschanged = null;
            resolve(window.speechSynthesis.getVoices());
        };

        window.speechSynthesis.onvoiceschanged = finish;
        setTimeout(finish, timeoutMs);
    });
}

export function speakGameIntro(text, onEnd) {
    stopGameIntroSpeech();

    // With the AI voice on, the intro takes the shared queue's AI voice and
    // device fallback like every other phrase. The fallback only runs after
    // a network round trip, so Safari's voice list and cancel have settled
    // by then and it needs neither workaround below.
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

    ensureVoicesLoaded().then((voices) => {
        if (stoppedMeanwhile()) return;
        const utterance = new SpeechSynthesisUtterance(text);
        // Use the app-wide voice/rate/pitch/volume the user has chosen and
        // persisted in localStorage, exactly like the rest of the app.
        applySpeechSettingsToUtterance(utterance, voices, getStoredAppLocale());

        utterance.onend = () => {
            if (onEnd) onEnd();
        };

        utterance.onerror = () => {
            if (onEnd) onEnd();
        };

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
