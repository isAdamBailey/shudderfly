import { onMounted, ref } from "vue";
import { usePage } from "@inertiajs/vue3";
import {
  applySpeechSettingsToUtterance,
  getAppLocaleFromPage,
  getStoredAppLocale,
  resolveSpeechVoice,
  syncStoredSpeechLanguage,
} from "@/composables/speechVoice";
import { useTranslations } from "@/composables/useTranslations";

const INITIAL_VOICE_RETRY_DELAY = 100;
const VOICE_RETRY_INTERVAL = 200;
const MAX_VOICE_LOADING_ATTEMPTS = 5;

export function useSpeechSynthesis() {
  const { t } = useTranslations();
  const page = usePage();
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
  const selectedEmotion = ref(localStorage.getItem("selectedEmotion") || "");
  const isPaused = ref(false);

  const getAppLocale = () => {
    const fromPage = page.props.locale;
    if (fromPage) {
      return getAppLocaleFromPage(page);
    }

    return getStoredAppLocale();
  };

  const getVoices = () => {
    if ("speechSynthesis" in window) {
      const availableVoices = window.speechSynthesis.getVoices();
      voices.value = availableVoices;

      if (availableVoices.length > 0) {
        selectedVoice.value = resolveSpeechVoice(
          availableVoices,
          getAppLocale()
        );

        if (selectedVoice.value) {
          const index = availableVoices.indexOf(selectedVoice.value);
          if (index !== -1) {
            localStorage.setItem("selectedVoiceIndex", index.toString());
          }
        }
      }
    }
  };

  const setVoice = async (voice) => {
    const index = voices.value.findIndex((v) => v.name === voice.name);
    if (index !== -1) {
      selectedVoice.value = voice;
      localStorage.setItem("selectedVoiceIndex", index.toString());
      speak(t("speech.voice_changed", { name: selectedVoice.value.name }));
    }
  };

  const setSpeechRate = (rate) => {
    speechRate.value = rate;
    localStorage.setItem("speechRate", rate.toString());
    speak(t("speech.rate_set", { rate: `${rate}x` }));
  };

  const setSpeechPitch = (pitch) => {
    speechPitch.value = pitch;
    localStorage.setItem("speechPitch", pitch.toString());
    speak(t("speech.pitch_set", { pitch: String(pitch) }));
  };

  const setSpeechVolume = (volume) => {
    speechVolume.value = volume;
    localStorage.setItem("speechVolume", volume.toString());
    speak(t("speech.volume_set", { volume: `${Math.round(volume * 100)}%` }));
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

  const speak = (phrase, onComplete) => {
    const done = () => {
      onComplete?.();
    };
    if (!("speechSynthesis" in window) || !phrase) {
      done();
      return;
    }
    try {
      const currentVoices = window.speechSynthesis.getVoices();
      if (currentVoices.length === 0) {
        done();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(phrase);
      applySpeechSettingsToUtterance(utterance, currentVoices, getAppLocale());

      utterance.onstart = () => {
        speaking.value = true;
      };
      utterance.onend = () => {
        speaking.value = false;
        done();
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
        done();
      };

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      speaking.value = false;
      done();
    }
  };

  const setSelectedEmotion = (emotion) => {
    selectedEmotion.value = emotion;
    localStorage.setItem("selectedEmotion", emotion);

    if (emotion) {
      applyEmotionalEffect(emotion);
      speak(t("speech.emotion_set", { emotion }));
    } else {
      // Reset to defaults when emotion is empty (Normal)
      speechRate.value = 1;
      speechPitch.value = 1;
      speechVolume.value = 1;

      localStorage.setItem("speechRate", "1");
      localStorage.setItem("speechPitch", "1");
      localStorage.setItem("speechVolume", "1");
      syncStoredSpeechLanguage(
        window.speechSynthesis.getVoices(),
        getAppLocale()
      );

      speak(t("speech.emotion_reset"));
    }
  };

  const applyEmotionalEffect = (emotion) => {
    const effects = {
      excited: { rate: 1.2, pitch: 1.2, volume: 1.0 },
      calm: { rate: 0.8, pitch: 0.9, volume: 0.8 },
      mysterious: { rate: 0.9, pitch: 0.7, volume: 0.7 },
      hyper: { rate: 1.5, pitch: 2.0, volume: 1.0 }
    };

    const effect = effects[emotion];
    if (effect) {
      speechRate.value = effect.rate;
      speechPitch.value = effect.pitch;
      speechVolume.value = effect.volume;

      localStorage.setItem("speechRate", effect.rate.toString());
      localStorage.setItem("speechPitch", effect.pitch.toString());
      localStorage.setItem("speechVolume", effect.volume.toString());
    }
  };

  const resetToDefaults = () => {
    speechRate.value = 1;
    speechPitch.value = 1;
    speechVolume.value = 1;
    selectedEmotion.value = "";

    localStorage.setItem("speechRate", "1");
    localStorage.setItem("speechPitch", "1");
    localStorage.setItem("speechVolume", "1");
    localStorage.setItem("selectedEmotion", "");
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
    selectedEmotion,
    setSpeechRate,
    setSpeechPitch,
    setSpeechVolume,
    setSpeechRateSilent,
    setSpeechPitchSilent,
    setSpeechVolumeSilent,
    setSelectedEmotion,
    resetToDefaults,
    pauseSpeech,
    resumeSpeech,
    stopSpeech,
    isPaused
  };
}
