const isSpeechSupported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined";

let currentUtterance = null;

export function speakGameIntro(text, onEnd) {
    if (!isSpeechSupported) {
        if (onEnd) onEnd();
        return;
    }

    stopGameIntroSpeech();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en";
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onend = () => {
        currentUtterance = null;
        if (onEnd) onEnd();
    };

    utterance.onerror = () => {
        currentUtterance = null;
        if (onEnd) onEnd();
    };

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
}

export function stopGameIntroSpeech() {
    if (isSpeechSupported) {
        window.speechSynthesis.cancel();
    }
    currentUtterance = null;
}
