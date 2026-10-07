<script setup>
/* global route */
import Button from "@/Components/Button.vue";
import LanguageSelect from "@/Components/LanguageSelect.vue";
import SpeakButton from "@/Components/SpeakButton.vue";
import {
    aiVoiceEnabled,
    aiVoicesForLocale,
    resolveAiVoice,
    saveAiVoice,
} from "@/composables/aiVoice";
import { usePermissions } from "@/composables/permissions";
import {
    filterVoicesForLocale,
    getAppLocaleFromPage,
    syncAppLocaleFromPage,
    syncStoredSpeechLanguage,
    voiceMatchesAppLocale,
} from "@/composables/speechVoice";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
import { router, usePage } from "@inertiajs/vue3";
import { debounce } from "lodash";
import { computed, onUnmounted, ref, watch } from "vue";

const VOICE_LOADING_TIMEOUT = 3000;

// Slider configuration constants
const SPEECH_RATE_MIN = 0;
const SPEECH_RATE_MAX = 1.5;
const SPEECH_PITCH_MIN = 0;
const SPEECH_PITCH_MAX = 2;
const SPEECH_VOLUME_MIN = 0.1;
const SPEECH_VOLUME_MAX = 1;

// The emotion buttons, in order; "" is Normal, which resets the others.
const EMOTION_BUTTONS = [
    {
        value: "excited",
        icon: "ri-flashlight-line",
        active: "bg-orange-600 hover:bg-orange-700",
    },
    {
        value: "calm",
        icon: "ri-heart-line",
        active: "bg-blue-600 hover:bg-blue-700",
    },
    {
        value: "mysterious",
        icon: "ri-question-line",
        active: "bg-indigo-600 hover:bg-indigo-700",
    },
    {
        value: "hyper",
        icon: "ri-fire-line",
        active: "bg-red-600 hover:bg-red-700",
    },
    {
        value: "",
        icon: "ri-check-line",
        active: "bg-green-600 hover:bg-green-700",
    },
];

const { t } = useTranslations();

function getSpeechRateDescription(value) {
    const range = SPEECH_RATE_MAX - SPEECH_RATE_MIN;
    const third = range / 3;

    if (value <= SPEECH_RATE_MIN + third) return t("speech.rate_slow");
    if (value <= SPEECH_RATE_MIN + 2 * third) return t("speech.rate_normal");
    return t("speech.rate_fast");
}

function getSpeechPitchDescription(value) {
    const range = SPEECH_PITCH_MAX - SPEECH_PITCH_MIN;
    const third = range / 3;

    if (value <= SPEECH_PITCH_MIN + third) return t("speech.pitch_low");
    if (value <= SPEECH_PITCH_MIN + 2 * third) return t("speech.pitch_normal");
    return t("speech.pitch_high");
}

function getSpeechVolumeDescription(value) {
    const range = SPEECH_VOLUME_MAX - SPEECH_VOLUME_MIN;
    const third = range / 3;

    if (value <= SPEECH_VOLUME_MIN + third) return t("speech.volume_quiet");
    if (value <= SPEECH_VOLUME_MIN + 2 * third)
        return t("speech.volume_normal");
    return t("speech.volume_loud");
}

const {
    voices,
    selectedVoice,
    setVoice,
    emotionLabel,
    speechRate,
    speechPitch,
    speechVolume,
    selectedEmotion,
    speaking,
    setSpeechRateSilent,
    setSpeechPitchSilent,
    setSpeechVolumeSilent,
    setSelectedEmotion,
    speak,
} = useSpeechSynthesis();
const { canEditPages } = usePermissions();

const page = usePage();
const currentLocale = computed(() => getAppLocaleFromPage(page));

// With the AI voice on, only its voices for the app locale are offered, and
// the device voices are hidden. The same gate speech itself uses.
const aiVoiceOn = computed(() => aiVoiceEnabled());
const aiVoices = computed(() => aiVoicesForLocale(currentLocale.value));

// Re-resolved when the locale or the allowed voices change.
const selectedAiVoice = ref(resolveAiVoice(currentLocale.value));
watch(aiVoices, () => {
    selectedAiVoice.value = resolveAiVoice(currentLocale.value);
});

// A voice added to the config without a label shows its id, not the key.
function aiVoiceLabel(voice) {
    const key = `speech.ai_voice.${voice}`;
    const label = t(key);

    return label === key ? voice : label;
}

function setAiVoice(voice) {
    saveAiVoice(currentLocale.value, voice);
    selectedAiVoice.value = voice;
    speak(t("speech.voice_changed", { name: aiVoiceLabel(voice) }));
}

function previewVoice(voice) {
    speak(t("speech.voice_sample"), null, voice);
}

const voicesLoading = ref(true);
let voiceLoadingTimeoutId = null;

const appLocale = ref(page.props.auth.user?.locale ?? "");
const appLocaleSaving = ref(false);

const appLocaleOptions = computed(() => [
    { value: "", label: t("locale.automatic"), flag: "🌐" },
    { value: "en", label: t("locale.english"), flag: "🇺🇸" },
    { value: "es", label: t("locale.spanish"), flag: "🇪🇸" },
    { value: "fr", label: t("locale.french"), flag: "🇫🇷" },
]);

function handleAppLocaleChange(value) {
    appLocaleSaving.value = true;
    router.patch(
        route("profile.locale.preference"),
        { locale: value === "" ? null : value },
        {
            preserveScroll: true,
            onSuccess: () => {
                appLocale.value = value;
                syncDeviceVoiceForLocale(syncAppLocaleFromPage(page));
            },
            onFinish: () => {
                appLocaleSaving.value = false;
            },
        }
    );
}

// Device voices only: with the AI voice on, they're unused and unseen, so
// switching one would only announce a voice the user can't pick.
function syncDeviceVoiceForLocale(locale) {
    if (aiVoiceOn.value) {
        return;
    }
    const availableVoices =
        voices.value.length > 0
            ? voices.value
            : window.speechSynthesis?.getVoices?.() || [];
    const { voice } = syncStoredSpeechLanguage(availableVoices, locale);
    if (voice) {
        setVoice(voice);
    }
}

const localeVoices = computed(() =>
    filterVoicesForLocale(voices.value, currentLocale.value)
);

// The voice picker's rows: the AI voices when it's on, else the device's.
const voiceOptions = computed(() =>
    aiVoiceOn.value
        ? aiVoices.value.map((voice) => ({
              id: `ai-voice-${voice}`,
              label: aiVoiceLabel(voice),
              checked: selectedAiVoice.value === voice,
              select: () => setAiVoice(voice),
              preview: { aiVoice: voice },
          }))
        : localeVoices.value.map((voice, index) => ({
              // By position: devices can repeat a name across languages.
              id: `device-voice-${index}`,
              label: voice.name,
              checked:
                  selectedVoice.value?.name === voice.name &&
                  selectedVoice.value?.lang === voice.lang,
              select: () => setVoice(voice),
              preview: { deviceVoice: voice },
          }))
);

watch(
    voices,
    (newVoices) => {
        if (newVoices.length > 0) {
            voicesLoading.value = false;
        }
    },
    { immediate: true }
);

watch(
    () => voices.value.length,
    (newLength) => {
        if (newLength === 0) {
            voiceLoadingTimeoutId = setTimeout(() => {
                if (voicesLoading.value) {
                    voicesLoading.value = false;
                }
            }, VOICE_LOADING_TIMEOUT);
        }
    },
    { immediate: true }
);

onUnmounted(() => {
    if (voiceLoadingTimeoutId) {
        clearTimeout(voiceLoadingTimeoutId);
    }
});

const localSpeechRate = ref(speechRate.value);
const localSpeechPitch = ref(speechPitch.value);
const localSpeechVolume = ref(speechVolume.value);

const debouncedSpeechRateUpdate = debounce((value) => {
    setSpeechRateSilent(value);
    speak(t("speech.rate_set", { rate: getSpeechRateDescription(value) }));
}, 500);

const debouncedSpeechPitchUpdate = debounce((value) => {
    setSpeechPitchSilent(value);
    speak(t("speech.pitch_set", { pitch: getSpeechPitchDescription(value) }));
}, 500);

const debouncedSpeechVolumeUpdate = debounce((value) => {
    setSpeechVolumeSilent(value);
    speak(
        t("speech.volume_set", { volume: getSpeechVolumeDescription(value) })
    );
}, 500);

function handleSpeechRateChange(value) {
    const floatValue = parseFloat(value);
    localSpeechRate.value = floatValue;
    debouncedSpeechRateUpdate(floatValue);
}

function handleSpeechPitchChange(value) {
    const floatValue = parseFloat(value);
    localSpeechPitch.value = floatValue;
    debouncedSpeechPitchUpdate(floatValue);
}

function handleSpeechVolumeChange(value) {
    const floatValue = parseFloat(value);
    localSpeechVolume.value = floatValue;
    debouncedSpeechVolumeUpdate(floatValue);
}

watch(speechRate, (newRate) => {
    localSpeechRate.value = newRate;
});

watch(speechPitch, (newPitch) => {
    localSpeechPitch.value = newPitch;
});

watch(speechVolume, (newVolume) => {
    localSpeechVolume.value = newVolume;
});

// Normal resets the device voice to the app locale's.
watch(selectedEmotion, (newEmotion) => {
    if (newEmotion === "") {
        syncDeviceVoiceForLocale(currentLocale.value);
    }
});

function alertVoices() {
    const voiceDetails = voices.value
        .filter((voice) => !voiceMatchesAppLocale(voice, currentLocale.value))
        .map(({ name, lang }) => `Name: ${name}, Language: ${lang}`)
        .join("\n");
    alert("Here are more available voices in your browser:\n\n" + voiceDetails);
}
</script>

<template>
    <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Voice Settings
        </h3>
        <div class="flex gap-2">
            <Button v-if="canEditPages && !aiVoiceOn" @click="alertVoices"
                >All Voices</Button
            >
        </div>
    </div>

    <div class="mb-6">
        <label
            id="app-language-label"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
            {{ t("locale.app_language") }}
        </label>
        <LanguageSelect
            v-model="appLocale"
            :options="appLocaleOptions"
            :disabled="appLocaleSaving"
            labelledby="app-language-label"
            @change="handleAppLocaleChange"
        />
    </div>

    <div class="mb-6">
        <div v-if="!aiVoiceOn && voicesLoading" class="text-center py-4">
            <p class="text-gray-600 dark:text-gray-400">
                Loading available voices...
            </p>
        </div>
        <ul v-else-if="voiceOptions.length" class="sm:columns-2 sm:gap-6">
            <li
                v-for="option in voiceOptions"
                :key="option.id"
                class="flex items-center gap-2 py-0.5 break-inside-avoid"
            >
                <label
                    :for="option.id"
                    class="flex flex-1 items-center gap-3 min-h-11 px-2 rounded-md cursor-pointer dark:text-white font-bold text-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                >
                    <input
                        :id="option.id"
                        type="radio"
                        name="voice"
                        :checked="option.checked"
                        :disabled="speaking"
                        class="h-5 w-5 accent-blue-600 dark:accent-blue-500"
                        @change="option.select()"
                    />
                    {{ option.label }}
                </label>
                <SpeakButton
                    :aria-label="
                        t('speech.preview_voice', { name: option.label })
                    "
                    icon-class="ri-play-fill text-xl"
                    :disabled="speaking"
                    data-test="preview-voice"
                    @click="previewVoice(option.preview)"
                />
            </li>
        </ul>
        <div v-else>
            <p class="text-red-700 dark:text-red-300">
                Voices from speech synthesis are not available in your browser.
                Your browser's default will be used.
            </p>
        </div>
    </div>

    <div class="space-y-8 mb-8">
        <div
            class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
        >
            <label
                class="block text-lg font-semibold text-gray-900 dark:text-white mb-4"
            >
                Emotional Effects
            </label>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <Button
                    v-for="emotion in EMOTION_BUTTONS"
                    :key="emotion.value"
                    :class="
                        selectedEmotion === emotion.value
                            ? emotion.active
                            : 'bg-gray-600 hover:bg-gray-700'
                    "
                    :disabled="speaking"
                    :data-emotion="emotion.value || 'normal'"
                    class="flex flex-col items-center justify-center py-1.5 px-1.5 min-h-[45px]"
                    @click="setSelectedEmotion(emotion.value)"
                >
                    <i :class="[emotion.icon, 'text-2xl mb-1']"></i>
                    <span class="text-sm font-medium">{{
                        emotionLabel(emotion.value)
                    }}</span>
                </Button>
            </div>
        </div>

        <div
            class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
        >
            <div class="flex items-center justify-between mb-4">
                <label
                    class="text-lg font-semibold text-gray-900 dark:text-white"
                >
                    Speech Rate
                </label>
                <span
                    class="text-2xl font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-700 px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                    {{ localSpeechRate }}x
                </span>
            </div>
            <div class="space-y-3">
                <div class="flex items-center gap-4">
                    <span
                        class="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[2rem]"
                        >Slow</span
                    >
                    <div class="flex-1 relative">
                        <input
                            v-model="localSpeechRate"
                            type="range"
                            :min="SPEECH_RATE_MIN"
                            :max="SPEECH_RATE_MAX"
                            step="0.1"
                            data-slider="rate"
                            class="w-full h-3 bg-gradient-to-r from-blue-200 to-blue-400 dark:from-blue-600 dark:to-blue-800 rounded-lg appearance-none cursor-pointer slider-custom relative z-20"
                            @input="handleSpeechRateChange($event.target.value)"
                        />
                        <div class="absolute inset-0 pointer-events-none z-10">
                            <div
                                class="h-3 w-full origin-left bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 rounded-lg transition-transform duration-200 ease-out"
                                :style="{
                                    transform: `scaleX(${
                                        (localSpeechRate - SPEECH_RATE_MIN) /
                                        (SPEECH_RATE_MAX - SPEECH_RATE_MIN)
                                    })`,
                                }"
                            ></div>
                        </div>
                    </div>
                    <span
                        class="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[2rem]"
                        >Fast</span
                    >
                </div>
                <div
                    class="flex justify-between text-xs text-gray-500 dark:text-gray-400"
                >
                    <span>Very Slow</span>
                    <span>Normal</span>
                    <span>Very Fast</span>
                </div>
            </div>
        </div>

        <div
            class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
        >
            <div class="flex items-center justify-between mb-4">
                <label
                    class="text-lg font-semibold text-gray-900 dark:text-white"
                >
                    Pitch
                </label>
                <span
                    class="text-2xl font-bold text-green-600 dark:text-green-400 bg-white dark:bg-gray-700 px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                    {{ localSpeechPitch }}
                </span>
            </div>
            <div class="space-y-3">
                <div class="flex items-center gap-4">
                    <span
                        class="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[2rem]"
                        >Low</span
                    >
                    <div class="flex-1 relative">
                        <input
                            v-model="localSpeechPitch"
                            type="range"
                            :min="SPEECH_PITCH_MIN"
                            :max="SPEECH_PITCH_MAX"
                            step="0.1"
                            data-slider="pitch"
                            class="w-full h-3 bg-gradient-to-r from-green-200 to-green-400 dark:from-green-600 dark:to-green-800 rounded-lg appearance-none cursor-pointer slider-custom relative z-20"
                            @input="
                                handleSpeechPitchChange($event.target.value)
                            "
                        />
                        <div class="absolute inset-0 pointer-events-none z-10">
                            <div
                                class="h-3 w-full origin-left bg-gradient-to-r from-green-500 to-green-600 dark:from-green-400 dark:to-green-500 rounded-lg transition-transform duration-200 ease-out"
                                :style="{
                                    transform: `scaleX(${
                                        (localSpeechPitch - SPEECH_PITCH_MIN) /
                                        (SPEECH_PITCH_MAX - SPEECH_PITCH_MIN)
                                    })`,
                                }"
                            ></div>
                        </div>
                    </div>
                    <span
                        class="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[2rem]"
                        >High</span
                    >
                </div>
                <div
                    class="flex justify-between text-xs text-gray-500 dark:text-gray-400"
                >
                    <span>Very Low</span>
                    <span>Normal</span>
                    <span>Very High</span>
                </div>
            </div>
        </div>

        <div
            class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
        >
            <div class="flex items-center justify-between mb-4">
                <label
                    class="text-lg font-semibold text-gray-900 dark:text-white"
                >
                    Volume
                </label>
                <span
                    class="text-2xl font-bold text-rose-600 dark:text-rose-400 bg-white dark:bg-gray-700 px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                    {{ Math.round(localSpeechVolume * 100) }}%
                </span>
            </div>
            <div class="space-y-3">
                <div class="flex items-center gap-4">
                    <span
                        class="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[2rem]"
                        >10%</span
                    >
                    <div class="flex-1 relative">
                        <input
                            v-model="localSpeechVolume"
                            type="range"
                            :min="SPEECH_VOLUME_MIN"
                            :max="SPEECH_VOLUME_MAX"
                            step="0.1"
                            data-slider="volume"
                            class="w-full h-3 bg-gradient-to-r from-rose-200 to-rose-400 dark:from-rose-600 dark:to-rose-800 rounded-lg appearance-none cursor-pointer slider-custom relative z-20"
                            @input="
                                handleSpeechVolumeChange($event.target.value)
                            "
                        />
                        <div class="absolute inset-0 pointer-events-none z-10">
                            <div
                                class="h-3 w-full origin-left bg-gradient-to-r from-rose-500 to-rose-600 dark:from-rose-400 dark:to-rose-500 rounded-lg transition-transform duration-200 ease-out"
                                :style="{
                                    transform: `scaleX(${
                                        (localSpeechVolume -
                                            SPEECH_VOLUME_MIN) /
                                        (SPEECH_VOLUME_MAX - SPEECH_VOLUME_MIN)
                                    })`,
                                }"
                            ></div>
                        </div>
                    </div>
                    <span
                        class="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[2rem]"
                        >100%</span
                    >
                </div>
                <div
                    class="flex justify-between text-xs text-gray-500 dark:text-gray-400"
                >
                    <span>Quiet</span>
                    <span>Normal</span>
                    <span>Maximum</span>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.slider-custom {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    cursor: pointer;
    position: relative;
    z-index: 20;
}

.slider-custom::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    height: 24px;
    width: 24px;
    border-radius: 50%;
    cursor: pointer;
    border: 3px solid #ffffff;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    transition: all 0.2s ease;
}

.slider-custom::-webkit-slider-thumb:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
}

.slider-custom[data-slider="rate"]::-webkit-slider-thumb {
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
}

.slider-custom[data-slider="pitch"]::-webkit-slider-thumb {
    background: linear-gradient(135deg, #10b981, #059669);
}

.slider-custom[data-slider="volume"]::-webkit-slider-thumb {
    background: linear-gradient(135deg, #f43f5e, #e11d48);
}

.slider-custom::-moz-range-thumb {
    height: 24px;
    width: 24px;
    border-radius: 50%;
    cursor: pointer;
    border: 3px solid #ffffff;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    transition: all 0.2s ease;
}

.slider-custom::-moz-range-thumb:hover {
    transform: scale(1.1);
}

.slider-custom[data-slider="rate"]::-moz-range-thumb {
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
}

.slider-custom[data-slider="pitch"]::-moz-range-thumb {
    background: linear-gradient(135deg, #10b981, #059669);
}

.slider-custom[data-slider="volume"]::-moz-range-thumb {
    background: linear-gradient(135deg, #f43f5e, #e11d48);
}
</style>
