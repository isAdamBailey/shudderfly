import { onMounted, ref } from "vue";

export function useSpeechSynthesis() {
    const speaking = ref(false);
    const voices = ref([]);
    const selectedVoice = ref(null);
    const selectedVoiceIndex = ref(0);
    const savedIndex = localStorage.getItem("selectedVoiceIndex");

    const getVoices = () => {
        if ("speechSynthesis" in window) {
            voices.value = window.speechSynthesis.getVoices();
            if (savedIndex !== null) {
                const index = parseInt(savedIndex, 10);
                selectedVoiceIndex.value = index;
                selectedVoice.value = voices.value[index];
            }
        }
    };

    const setVoice = (voice) => {
        const index = voices.value.findIndex((v) => v.name === voice.name);
        if (index !== -1) {
            selectedVoiceIndex.value = index;
            selectedVoice.value = voice;
            localStorage.setItem("selectedVoiceIndex", index.toString());
        }
    };

    const speak = (phrase) => {
        if ("speechSynthesis" in window && phrase) {
            const utterance = new SpeechSynthesisUtterance(phrase);
            if (selectedVoiceIndex.value) {
                utterance.voice = voices.value[selectedVoiceIndex.value];
            }
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
        setTimeout(() => {
            if (voices.value.length > 0) {
                if (savedIndex !== null) {
                    const index = parseInt(savedIndex, 10);
                    if (index >= 0 && index < voices.value.length) {
                        selectedVoiceIndex.value = index;
                        selectedVoice.value = voices.value[index];
                    }
                }
            }
        }, 100);
    });

    return { speak, speaking, voices, setVoice, selectedVoice };
}
