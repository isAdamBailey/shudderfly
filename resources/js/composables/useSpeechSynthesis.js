import { ref } from "vue";

export function useSpeechSynthesis() {
    const speaking = ref(false);

    const speak = (phrase) => {
        if ("speechSynthesis" in window && phrase) {
            const utterance = new SpeechSynthesisUtterance(phrase);
            utterance.onstart = () => (speaking.value = true);
            utterance.onend = () => (speaking.value = false);
            window.speechSynthesis.speak(utterance);
        }
    };

    return { speak, speaking };
}
