import { onMounted, ref } from "vue";

const MIN_WORD_LENGTH_FOR_ROBOT_EFFECT = 3;
const WHISPER_MIN_VOLUME = 0.3;
const WHISPER_VOLUME_MULTIPLIER = 0.7;
const WHISPER_MIN_RATE = 0.5;
const WHISPER_RATE_MULTIPLIER = 0.8;
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
  const selectedEffect = ref(localStorage.getItem("selectedEffect") || "");
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

  const setSelectedEffect = (effect) => {
    selectedEffect.value = effect;
    localStorage.setItem("selectedEffect", effect);
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

        // Apply the selected effect to the phrase if one is selected
        let modifiedPhrase = phrase;

        if (selectedEffect.value) {
          const effectFunction = applyVoiceEffect(selectedEffect.value);
          modifiedPhrase = effectFunction(phrase);
        }

        const utterance = new SpeechSynthesisUtterance(modifiedPhrase);

        const index = parseInt(
          localStorage.getItem("selectedVoiceIndex") || "0",
          10
        );

        if (index >= 0 && index < currentVoices.length) {
          utterance.voice = currentVoices[index];
        } else {
          utterance.voice = currentVoices[0];
        }

        // Apply whisper effect by temporarily adjusting volume and rate
        if (selectedEffect.value === "whisper") {
          utterance.volume = Math.max(
            WHISPER_MIN_VOLUME,
            speechVolume.value * WHISPER_VOLUME_MULTIPLIER
          );
          utterance.rate = Math.max(
            WHISPER_MIN_RATE,
            speechRate.value * WHISPER_RATE_MULTIPLIER
          );
        } else {
          utterance.rate = speechRate.value;
          utterance.volume = speechVolume.value;
        }

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

  const testVoice = () => {
    const testPhrase = "Hello! This is a test.";

    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(testPhrase);

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        utterance.voice = voices[0];
      }

      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onstart = () => console.log("Test speech started");
      utterance.onend = () => console.log("Test speech ended");
      utterance.onerror = (event) =>
        console.error("Test speech error:", event.error);

      window.speechSynthesis.speak(utterance);
      console.log("Test speech initiated");
    }
  };

  const listVoices = () => {
    if ("speechSynthesis" in window) {
      const voices = window.speechSynthesis.getVoices();
      console.log("All available voices:");
      voices.forEach((voice, index) => {
        console.log(
          `${index}: ${voice.name} (${voice.lang}) - default: ${voice.default}`
        );
      });
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

  const exportPresets = () => {
    const presets = getPresets();
    const dataStr = JSON.stringify(presets, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "voice-presets.json";
    link.click();
    URL.revokeObjectURL(url);
    speak("Presets exported successfully");
  };

  const importPresets = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const presets = JSON.parse(e.target.result);
          if (Array.isArray(presets)) {
            localStorage.setItem("voicePresets", JSON.stringify(presets));
            speak(`Imported ${presets.length} presets successfully`);
            resolve(presets);
          } else {
            reject(new Error("Invalid preset file format"));
          }
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsText(file);
    });
  };

  const applyVoiceEffect = (effect) => {
    switch (effect) {
      case "echo":
        // Simulate echo by repeating the last word
        return (text) => {
          const words = text.split(" ");
          const lastWord = words[words.length - 1];
          return `${text}... ${lastWord}`;
        };
      case "robot":
        // Add robot-like pauses and emphasis
        return (text) => {
          return text
            .split(" ")
            .map((word) => {
              if (word.length > MIN_WORD_LENGTH_FOR_ROBOT_EFFECT) {
                return `${word.slice(0, -1)}-${word.slice(-1)}`;
              }
              return word;
            })
            .join(" ");
        };
      case "whisper":
        // Whisper effect is handled by adjusting volume and rate in the speak function
        return (text) => text;
      default:
        return (text) => text;
    }
  };

  onMounted(() => {
    if ("speechSynthesis" in window) {
      // Set up the voices changed event handler
      window.speechSynthesis.onvoiceschanged = getVoices;

      // Try to get voices immediately
      getVoices();

      // If no voices are available immediately, try again after a short delay
      if (voices.value.length === 0) {
        setTimeout(() => {
          getVoices();
        }, INITIAL_VOICE_RETRY_DELAY);
      }

      // Fallback: try a few more times with increasing delays
      let attempts = 0;
      const maxAttempts = MAX_VOICE_LOADING_ATTEMPTS;

      const intervalId = setInterval(() => {
        attempts++;
        if (voices.value.length > 0 || attempts >= maxAttempts) {
          clearInterval(intervalId);
          console.log("Voice loading completed after", attempts, "attempts");
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
    selectedEffect,
    setSpeechRate,
    setSpeechPitch,
    setSpeechVolume,
    setSpeechRateSilent,
    setSpeechPitchSilent,
    setSpeechVolumeSilent,
    setSelectedEffect,
    pauseSpeech,
    resumeSpeech,
    stopSpeech,
    isPaused,
    testVoice,
    savePreset,
    loadPreset,
    deletePreset,
    getPresets,
    exportPresets,
    importPresets,
    applyVoiceEffect,
    listVoices
  };
}
