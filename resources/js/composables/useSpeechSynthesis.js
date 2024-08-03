import { onMounted, ref } from "vue";

export function useSpeechSynthesis() {
    const speaking = ref(false);
    const voices = ref([]);
    const selectedVoice = ref(null);
    const savedIndex = localStorage.getItem("selectedVoiceIndex") || "0";

    const getVoices = () => {
        if ("speechSynthesis" in window) {
            voices.value = window.speechSynthesis.getVoices();
            const index = parseInt(savedIndex, 10);
            selectedVoice.value = voices.value[index];
        }
    };

    const setVoice = (voice) => {
        const index = voices.value.findIndex((v) => v.name === voice.name);
        if (index !== -1) {
            selectedVoice.value = voice;
            localStorage.setItem("selectedVoiceIndex", index.toString());
            window.location.reload();
        }
    };

    const speak = (phrase) => {
        if ("speechSynthesis" in window && phrase) {
            const utterance = new SpeechSynthesisUtterance(phrase);
            utterance.voice = voices.value[savedIndex];
            utterance.onstart = () => (speaking.value = true);
            utterance.onend = () => (speaking.value = false);
            window.speechSynthesis.speak(utterance);
        }
    };

    onMounted(() => {
        if ("speechSynthesis" in window) {
            window.speechSynthesis.onvoiceschanged = getVoices;
            setTimeout(getVoices, 100);
        }
        if (voices.value.length > 0) {
            const index = parseInt(savedIndex, 10);
            if (index < voices.value.length) {
                selectedVoice.value = voices.value[index];
            }
        }
    });

    return { speak, speaking, voices, setVoice, selectedVoice };
}
