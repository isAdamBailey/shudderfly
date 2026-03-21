const RULES_SPEECH =
    "Welcome to Cockroach Fart! Here is how to play. You see a big Madagascar hissing cockroach on the screen. " +
    "Tap the cockroach's head to make it hiss. Each hiss moves the cockroach a little bit toward the toilet on " +
    "the other side of the screen. Every hiss earns you 10 points. If you tap quickly, you get combo bonus points! " +
    "Keep tapping the head until the cockroach reaches the toilet. When it gets there, it will let out a big fart " +
    "and you win the game! Try to win with as few taps as possible to get 3 stars. Good luck!";

let currentUtterance = null;

export function speakGameRules(onEnd) {
    stopSpeaking();

    const utterance      = new SpeechSynthesisUtterance(RULES_SPEECH);
    utterance.lang       = "en";
    utterance.rate       = 0.95;
    utterance.pitch      = 1.0;
    utterance.volume     = 1.0;

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

export function stopSpeaking() {
    window.speechSynthesis.cancel();
    currentUtterance = null;
}
