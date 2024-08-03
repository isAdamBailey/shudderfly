<script setup>
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { computed } from "vue";

const { voices, selectedVoice, setVoice } = useSpeechSynthesis();
const filteredVoices = computed(() =>
    voices.value.filter((voice) => voice.lang === "en-US")
);
</script>

<template>
    <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">
        Voice Settings
    </h2>
    <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Choose from one of the voices below:
    </p>
    <ul>
        <li v-for="voice in filteredVoices" :key="voice.name">
            <input
                :id="voice.name"
                v-model="selectedVoice"
                type="radio"
                :value="voice"
                @input="setVoice(voice)"
            />
            <label :for="voice.name">{{ voice.name }}</label>
        </li>
    </ul>
</template>
