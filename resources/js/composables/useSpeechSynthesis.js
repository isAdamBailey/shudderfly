import { onMounted, ref } from "vue";

const INITIAL_VOICE_RETRY_DELAY = 100;
const VOICE_RETRY_INTERVAL = 200;
const MAX_VOICE_LOADING_ATTEMPTS = 5;

export function useSpeechSynthesis() {
  const speaking = ref(false);
  const voices = ref([]);
  const selectedVoice = ref(null);
  const speechRate = ref(parseFloat(localStorage.getItem("speechRate") || "1"));
  const speechPitch = ref(
    parseFloat(localStorage.getItem("speechPitch") || "1")
  );
  const speechVolume = ref(
    parseFloat(localStorage.getItem("speechVolume") || "1")
  );
  const isPaused = ref(false);

  const getVoices = () => {
    if ("speechSynthesis" in window) {
      const availableVoices = window.speechSynthesis.getVoices();
      voices.value = availableVoices;

      if (availableVoices.length > 0) {
        const index = parseInt(
          localStorage.getItem("selectedVoiceIndex") || "0",
          10
        );

        if (index >= 0 && index < availableVoices.length) {
          selectedVoice.value = availableVoices[index];
        } else {
          selectedVoice.value = availableVoices[0];
          localStorage.setItem("selectedVoiceIndex", "0");
        }
      }
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

  const setSpeechRate = (rate) => {
    speechRate.value = rate;
    localStorage.setItem("speechRate", rate.toString());
    speak(`Speech rate set to ${rate}x`);
  };

  const setSpeechPitch = (pitch) => {
    speechPitch.value = pitch;
    localStorage.setItem("speechPitch", pitch.toString());
    speak(`Pitch set to ${pitch}`);
  };

  const setSpeechVolume = (volume) => {
    speechVolume.value = volume;
    localStorage.setItem("speechVolume", volume.toString());
    speak(`Volume set to ${Math.round(volume * 100)}%`);
  };

  // Silent versions for use with debounced updates
  const setSpeechRateSilent = (rate) => {
    speechRate.value = rate;
    localStorage.setItem("speechRate", rate.toString());
  };

  const setSpeechPitchSilent = (pitch) => {
    speechPitch.value = pitch;
    localStorage.setItem("speechPitch", pitch.toString());
  };

  const setSpeechVolumeSilent = (volume) => {
    speechVolume.value = volume;
    localStorage.setItem("speechVolume", volume.toString());
  };

  const pauseSpeech = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.pause();
      isPaused.value = true;
    }
  };

  const resumeSpeech = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.resume();
      isPaused.value = false;
    }
  };

  const stopSpeech = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      speaking.value = false;
      isPaused.value = false;
    }
  };

  const speak = (phrase) => {
    if ("speechSynthesis" in window && phrase) {
      try {
        const currentVoices = window.speechSynthesis.getVoices();
        if (currentVoices.length === 0) {
          return;
        }

        const utterance = new SpeechSynthesisUtterance(phrase);

        const index = parseInt(
          localStorage.getItem("selectedVoiceIndex") || "0",
          10
        );

        if (index >= 0 && index < currentVoices.length) {
          utterance.voice = currentVoices[index];
        } else {
          utterance.voice = currentVoices[0];
        }

        utterance.rate = speechRate.value;
        utterance.volume = speechVolume.value;
        utterance.pitch = speechPitch.value;

        utterance.onstart = () => {
          speaking.value = true;
        };
        utterance.onend = () => {
          speaking.value = false;
        };
        utterance.onpause = () => {
          isPaused.value = true;
        };
        utterance.onresume = () => {
          isPaused.value = false;
        };

        utterance.onerror = (event) => {
          console.error("Speech error:", event.error);
          speaking.value = false;
          isPaused.value = false;
        };

        window.speechSynthesis.speak(utterance);
      } catch (error) {
        speaking.value = false;
      }
    }
  };

  const savePreset = (name) => {
    const preset = {
      name,
      voiceIndex: parseInt(
        localStorage.getItem("selectedVoiceIndex") || "0",
        10
      ),
      rate: speechRate.value,
      pitch: speechPitch.value,
      volume: speechVolume.value,
      timestamp: Date.now()
    };

    const presets = JSON.parse(localStorage.getItem("voicePresets") || "[]");
    const existingIndex = presets.findIndex((p) => p.name === name);

    if (existingIndex !== -1) {
      presets[existingIndex] = preset;
    } else {
      presets.push(preset);
    }

    localStorage.setItem("voicePresets", JSON.stringify(presets));
    speak(`Preset "${name}" saved`);
  };

  const loadPreset = (preset) => {
    if (preset.voiceIndex < voices.value.length) {
      selectedVoice.value = voices.value[preset.voiceIndex];
      localStorage.setItem("selectedVoiceIndex", preset.voiceIndex.toString());
    }

    speechRate.value = preset.rate;
    speechPitch.value = preset.pitch;
    speechVolume.value = preset.volume;

    localStorage.setItem("speechRate", preset.rate.toString());
    localStorage.setItem("speechPitch", preset.pitch.toString());
    localStorage.setItem("speechVolume", preset.volume.toString());

    speak(`Preset "${preset.name}" loaded`);
  };

  const deletePreset = (name) => {
    const presets = JSON.parse(localStorage.getItem("voicePresets") || "[]");
    const filteredPresets = presets.filter((p) => p.name !== name);
    localStorage.setItem("voicePresets", JSON.stringify(filteredPresets));
    speak(`Preset "${name}" deleted`);
  };

  const getPresets = () => {
    return JSON.parse(localStorage.getItem("voicePresets") || "[]");
  };

  onMounted(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = getVoices;

      getVoices();

      if (voices.value.length === 0) {
        setTimeout(() => {
          getVoices();
        }, INITIAL_VOICE_RETRY_DELAY);
      }

      let attempts = 0;
      const maxAttempts = MAX_VOICE_LOADING_ATTEMPTS;

      const intervalId = setInterval(() => {
        attempts++;
        if (voices.value.length > 0 || attempts >= maxAttempts) {
          clearInterval(intervalId);
        } else {
          getVoices();
        }
      }, VOICE_RETRY_INTERVAL);
    }
  });

  return {
    speak,
    speaking,
    voices,
    setVoice,
    selectedVoice,
    speechRate,
    speechPitch,
    speechVolume,
    setSpeechRate,
    setSpeechPitch,
    setSpeechVolume,
    setSpeechRateSilent,
    setSpeechPitchSilent,
    setSpeechVolumeSilent,
    pauseSpeech,
    resumeSpeech,
    stopSpeech,
    isPaused,
    savePreset,
    loadPreset,
    deletePreset,
    getPresets
  };
}
