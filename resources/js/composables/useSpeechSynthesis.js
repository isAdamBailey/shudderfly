import { onMounted, ref } from "vue";

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
      voices.value = window.speechSynthesis.getVoices();
      const index = parseInt(
        localStorage.getItem("selectedVoiceIndex") || "0",
        10
      );
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
      const utterance = new SpeechSynthesisUtterance(phrase);
      const index = parseInt(
        localStorage.getItem("selectedVoiceIndex") || "0",
        10
      );
      utterance.voice = window.speechSynthesis.getVoices()[index];
      utterance.rate = speechRate.value;
      utterance.pitch = speechPitch.value;
      utterance.volume = speechVolume.value;
      utterance.onstart = () => (speaking.value = true);
      utterance.onend = () => (speaking.value = false);
      utterance.onpause = () => (isPaused.value = true);
      utterance.onresume = () => (isPaused.value = false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const testVoice = () => {
    const testPhrase =
      "Hello! This is a test of your voice settings. How does it sound?";
    speak(testPhrase);
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
            .map((word) =>
              word.length > 3 ? `${word.slice(0, -1)}-${word.slice(-1)}` : word
            )
            .join(" ");
        };
      case "whisper":
        // Lower volume and rate for whisper effect
        return (text) => {
          const originalVolume = speechVolume.value;
          const originalRate = speechRate.value;
          speechVolume.value = Math.max(0.3, speechVolume.value * 0.7);
          speechRate.value = Math.max(0.5, speechRate.value * 0.8);
          speak(text);
          // Restore original settings after a delay
          setTimeout(() => {
            speechVolume.value = originalVolume;
            speechRate.value = originalRate;
          }, 1000);
          return text;
        };
      default:
        return (text) => text;
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
    applyVoiceEffect
  };
}
