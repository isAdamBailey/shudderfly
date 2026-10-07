import { onMounted, ref } from "vue";
import { usePage } from "@inertiajs/vue3";
import {
    aiVoiceEnabled,
    pauseAiVoice,
    playAiVoice,
    primeAiVoice,
    resumeAiVoice,
    stopAiVoice,
} from "@/composables/aiVoice";
import {
    applySpeechSettingsToUtterance,
    getAppLocaleFromPage,
    getStoredAppLocale,
    readStoredSpeechSettings,
    resolveSpeechVoice,
    speakUtterance,
    syncStoredSpeechLanguage,
} from "@/composables/speechVoice";
import { useTranslations } from "@/composables/useTranslations";

const INITIAL_VOICE_RETRY_DELAY = 100;
const VOICE_RETRY_INTERVAL = 200;
const MAX_VOICE_LOADING_ATTEMPTS = 5;

// With the AI voice on, phrases from every component play one after another,
// the way speechSynthesis queues utterances: a page that speaks a title and
// then an excerpt must say both. Each entry is { run, cancel }; run resolves
// when its phrase has finished, by either voice.
const aiSpeechQueue = [];
let aiSpeechDraining = false;

// If a phrase's end event never arrives (a stalled clip, or Chrome dropping
// an utterance's onend), the queue moves on after this long rather than
// silencing every later phrase. Generous: ~8 characters a second at the
// slowest rate, plus time to fetch.
const PHRASE_WATCHDOG_BASE_MS = 10000;
const PHRASE_WATCHDOG_MS_PER_CHARACTER = 250;

async function drainAiSpeechQueue() {
    if (aiSpeechDraining) {
        return;
    }
    aiSpeechDraining = true;
    while (aiSpeechQueue.length) {
        await aiSpeechQueue.shift().run();
    }
    aiSpeechDraining = false;
}

// Dropped phrases still complete, as cancelled utterances do.
function clearAiSpeechQueue() {
    aiSpeechQueue.splice(0).forEach((entry) => entry.cancel());
}

export function useSpeechSynthesis() {
    const { t } = useTranslations();
    const page = usePage();
    const speaking = ref(false);
    const voices = ref([]);
    const selectedVoice = ref(null);
    const storedSettings = readStoredSpeechSettings();
    const speechRate = ref(storedSettings.rate);
    const speechPitch = ref(storedSettings.pitch);
    const speechVolume = ref(storedSettings.volume);
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
                        localStorage.setItem(
                            "selectedVoiceIndex",
                            index.toString()
                        );
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
            speak(
                t("speech.voice_changed", { name: selectedVoice.value.name })
            );
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
        speak(
            t("speech.volume_set", { volume: `${Math.round(volume * 100)}%` })
        );
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
        pauseAiVoice();
        if ("speechSynthesis" in window) {
            window.speechSynthesis.pause();
            isPaused.value = true;
        }
    };

    const resumeSpeech = () => {
        resumeAiVoice();
        if ("speechSynthesis" in window) {
            window.speechSynthesis.resume();
            isPaused.value = false;
        }
    };

    const stopSpeech = () => {
        clearAiSpeechQueue();
        stopAiVoice();
        speaking.value = false;
        isPaused.value = false;
        if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }
    };

    const speak = (phrase, onComplete) => {
        let completed = false;
        const done = () => {
            if (completed) {
                return;
            }
            completed = true;
            onComplete?.();
        };

        if (phrase && aiVoiceEnabled()) {
            primeAiVoice();
            // Set now, not when the clip starts after the request, so the
            // buttons that disable while speaking can't queue repeats.
            speaking.value = true;
            aiSpeechQueue.push({
                cancel: done,
                run: () => speakInTurn(phrase, done),
            });
            drainAiSpeechQueue();
            return;
        }

        speakWithDeviceVoice(phrase, done);
    };

    // The AI voice, or the device voice if it can't, resolving when the
    // phrase is over so the next one in the queue can start.
    const speakInTurn = (phrase, done) =>
        new Promise((resolve) => {
            let watchdog;
            const finish = () => {
                clearTimeout(watchdog);
                speaking.value = false;
                isPaused.value = false;
                done();
                resolve();
            };
            watchdog = setTimeout(
                finish,
                PHRASE_WATCHDOG_BASE_MS +
                    phrase.length * PHRASE_WATCHDOG_MS_PER_CHARACTER
            );

            // Settings and locale are read now, not when queued, so a
            // change made meanwhile applies.
            playAiVoice(phrase, {
                ...readStoredSpeechSettings(),
                locale: getAppLocale(),
                onStart: () => {
                    speaking.value = true;
                },
                onEnd: finish,
            }).then((handled) => {
                if (handled) {
                    return;
                }
                speakWithDeviceVoice(phrase, finish);
                // speakUtterance resumes a paused synth; a pause pressed
                // while the AI voice was loading must still hold.
                if (isPaused.value) {
                    window.speechSynthesis?.pause();
                }
            });
        });

    const speakWithDeviceVoice = (phrase, done) => {
        if (!("speechSynthesis" in window) || !phrase) {
            done();
            return;
        }
        try {
            const currentVoices = window.speechSynthesis.getVoices();
            const utterance = new SpeechSynthesisUtterance(
                phrase.replace(/@/g, "")
            );
            applySpeechSettingsToUtterance(
                utterance,
                currentVoices,
                getAppLocale()
            );

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

            speakUtterance(utterance);
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
            hyper: { rate: 1.5, pitch: 2.0, volume: 1.0 },
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
        isPaused,
    };
}
