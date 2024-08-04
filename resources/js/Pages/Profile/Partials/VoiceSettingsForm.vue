<script setup>
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { computed } from "vue";

const { voices, selectedVoice, setVoice } = useSpeechSynthesis();

const filteredVoices = computed(() =>
    voices.value.filter((voice) => voice.lang === "en-US")
);
const halfLength = computed(() => Math.ceil(filteredVoices.value.length / 2));
const firstHalf = computed(() =>
    filteredVoices.value.slice(0, halfLength.value)
);
const secondHalf = computed(() => filteredVoices.value.slice(halfLength.value));
</script>

<template>
    <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">
        Voice Settings
    </h2>
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
                <label :for="voice.name" class="ml-3 font-bold text-lg">{{
                    voice.name
                }}</label>
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
                <label :for="voice.name" class="ml-3 font-bold text-lg">{{
                    voice.name
                }}</label>
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
