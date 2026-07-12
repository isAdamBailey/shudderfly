import {
    applySpeechSettingsToUtterance,
    getStoredAppLocale,
} from "@/composables/speechVoice";

const isSpeechSupported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined";

let currentUtterance = null;

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
    if (!isSpeechSupported) {
        if (onEnd) onEnd();
        return;
    }

    stopGameIntroSpeech();

    ensureVoicesLoaded().then((voices) => {
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
            window.speechSynthesis.speak(utterance);
        }, 0);
    });
}

export function stopGameIntroSpeech() {
    if (isSpeechSupported) {
        window.speechSynthesis.cancel();
    }
    currentUtterance = null;
}
