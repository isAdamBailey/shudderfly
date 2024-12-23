import { onMounted, ref } from "vue";

export function useSpeechSynthesis() {
    const speaking = ref(false);
    const voices = ref([]);
    const selectedVoice = ref(null);

    const getVoices = () => {
        if ("speechSynthesis" in window) {
            voices.value = window.speechSynthesis.getVoices();
            const index = parseInt(localStorage.getItem("selectedVoiceIndex") || "0", 10);
            selectedVoice.value = voices.value[index];
        }
    };

    const setVoice = async (voice) => {
        const index = voices.value.findIndex((v) => v.name === voice.name);
        if (index !== -1) {
            selectedVoice.value = voice;
            localStorage.setItem("selectedVoiceIndex", index.toString());
            speak(`Voice changed to ${selectedVoice.value.name}`);
        }
    };

    const speak = (phrase) => {
        if ("speechSynthesis" in window && phrase) {
            const utterance = new SpeechSynthesisUtterance(phrase);
            const index = parseInt(localStorage.getItem("selectedVoiceIndex") || "0", 10);
            utterance.voice = window.speechSynthesis.getVoices()[index];
            utterance.onstart = () => (speaking.value = true);
            utterance.onend = () => (speaking.value = false);
            window.speechSynthesis.speak(utterance);
        }
    };

    onMounted(() => {
        if ("speechSynthesis" in window) {
            window.speechSynthesis.onvoiceschanged = getVoices;
            getVoices();

            // Fallback mechanism for mobile browsers
            const intervalId = setInterval(() => {
                if (voices.value.length > 0) {
                    clearInterval(intervalId);
                } else {
                    getVoices();
                }
            }, 100);
        }
    });

    return { speak, speaking, voices, setVoice, selectedVoice };
}
