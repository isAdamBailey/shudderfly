<script setup>
import { computed } from "vue";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { usePermissions } from "@/composables/permissions";
import Button from "@/Components/Button.vue";

const { voices, selectedVoice, setVoice } = useSpeechSynthesis();
const { canEditPages } = usePermissions();

const filteredVoices = computed(() =>
    voices.value.filter(
        (voice) => voice.lang === "en-US" || voice.lang === "en_US"
    )
);
const halfLength = computed(() => Math.ceil(filteredVoices.value.length / 2));
const firstHalf = computed(() =>
    filteredVoices.value.slice(0, halfLength.value)
);
const secondHalf = computed(() => filteredVoices.value.slice(halfLength.value));

function alertVoices() {
    const filteredVoiceNames = new Set(
        filteredVoices.value.map((voice) => voice.name)
    );
    const voiceDetails = voices.value
        .filter((voice) => !filteredVoiceNames.has(voice.name))
        .map(({ name, lang }) => `Name: ${name}, Language: ${lang}`)
        .join("\n");
    alert("Here are more available voices in your browser:\n\n" + voiceDetails);
}
</script>

<template>
    <div class="flex justify-between">
        <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">
            Voice Settings
        </h2>
        <Button v-if="canEditPages" class="ml-3" @click="alertVoices"
            >Voices</Button
        >
    </div>
    <p class="my-3 text-sm text-gray-600 dark:text-gray-400">
        Choose from one of the voices below:
    </p>
    <div v-if="voices.length" class="flex">
        <ul class="w-1/2">
            <li v-for="voice in firstHalf" :key="voice.name" class="mb-3">
                <input
                    :id="voice.name"
                    v-model="selectedVoice"
                    type="radio"
                    :value="voice"
                    @input="setVoice(voice)"
                />
                <label
                    :for="voice.name"
                    class="dark:text-white ml-3 font-bold text-lg"
                    >{{ voice.name }}</label
                >
            </li>
        </ul>
        <ul class="w-1/2">
            <li v-for="voice in secondHalf" :key="voice.name" class="mb-3">
                <input
                    :id="voice.name"
                    v-model="selectedVoice"
                    type="radio"
                    :value="voice"
                    @input="setVoice(voice)"
                />
                <label
                    :for="voice.name"
                    class="dark:text-white ml-3 font-bold text-lg"
                    >{{ voice.name }}</label
                >
            </li>
        </ul>
    </div>
    <div v-else>
        <p class="text-red-700 dark:text-red-300">
            Voices from speech synthesis are not available in your browser. Your
            browser's default will be used.
        </p>
    </div>
</template>
