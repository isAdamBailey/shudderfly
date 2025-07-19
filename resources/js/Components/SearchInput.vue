<template>
  <div class="w-full px-2 bg-transparent flex">
    <label for="search" class="hidden">Search</label>
    <input
      id="search"
      :value="voiceActive ? transcript : search"
      class="h-8 w-full cursor-pointer rounded-full border bg-gray-100 px-4 pb-0 pt-px text-gray-700 outline-none transition focus:border-blue-400"
      :class="{ 'border-red-500 border-2': voiceActive }"
      autocomplete="off"
      name="search"
      :placeholder="searchPlaceholder"
      type="search"
      @input="search = $event.target.value"
      @keyup.esc="search = null"
      @keyup.enter="searchMethod"
    />
    <button
      v-if="isVoiceSupported"
      class="self-center flex items-center ml-2 w-6 h-6"
      @click="startVoiceRecognition"
    >
      <i
        :class="{
          'bg-red-500 border-red-500': voiceActive
        }"
        class="border-2 px-1 bg-white text-gray-700 rounded-full ri-mic-line text-3xl"
      ></i>
    </button>
  </div>
</template>

<script setup>
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { router, usePage } from "@inertiajs/vue3";
import { computed, ref, watch } from "vue";

const { speak } = useSpeechSynthesis();
const props = defineProps({
  routeName: {
    type: String,
    required: true
  },
  label: {
    type: String,
    default: null
  }
});

let search = ref(usePage().props?.search || null);
let filter = ref(usePage().props?.filter || null);
let voiceActive = ref(false);
let voiceHeard = ref(false);
let transcript = ref("");

const typeName = computed(() => {
  return props.label || props.routeName.split(".")[0] || "something";
});

const isVoiceSupported = computed(() => {
  if (typeof window === "undefined") {
    return false;
  }
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
});

const searchPlaceholder = computed(() => {
  if (voiceActive.value && !voiceHeard.value) {
    return "Listening...";
  }
  return `Search ${typeName.value}!`;
});

watch(search, () => {
  if (!search.value) {
    searchMethod();
  }
});

const searchMethod = () => {
  if (search.value) {
    speak(`Searching for ${props.label} with ${search.value}`);
  }
  router.get(
    route(props.routeName),
    { search: search.value, filter: filter.value },
    { preserveState: true }
  );
};

const startVoiceRecognition = () => {
  // Check if SpeechRecognition is supported
  if (!isVoiceSupported.value) {
    speak("Voice recognition is not supported in this browser.");
    return;
  }

  const recognition = new (window.SpeechRecognition ||
    window.webkitSpeechRecognition)();
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.lang = "en-US";

  recognition.addEventListener("result", (event) => {
    let currentTranscript = Array.from(event.results)
      .map((result) => result[0])
      .map((result) => result.transcript)
      .join("");

    // Set voiceHeard to true when we get any result
    voiceHeard.value = true;

    // Update the transcript in real-time
    transcript.value = currentTranscript;

    if (event.results[0].isFinal) {
      // Split the transcript into words, remove duplicates, and join back together
      currentTranscript = [...new Set(currentTranscript.split(" "))].join(" ");
      search.value = currentTranscript;
      transcript.value = "";
      searchMethod();
    }
  });

  // keep the voice active state in sync with the recognition state
  recognition.addEventListener("start", () => {
    voiceActive.value = true;
    voiceHeard.value = false;
    search.value = null;
    transcript.value = "";
  });

  recognition.addEventListener("end", () => {
    voiceActive.value = false;
    voiceHeard.value = false;
    transcript.value = "";
  });

  recognition.addEventListener("error", (event) => {
    voiceActive.value = false;
    voiceHeard.value = false;
    transcript.value = "";

    let errorMessage = "Voice recognition error occurred.";
    switch (event.error) {
      case "not-allowed":
        errorMessage = "Please allow microphone access for voice search.";
        break;
      case "no-speech":
        errorMessage = "No speech detected. Please try again.";
        break;
      case "network":
        errorMessage = "Network error. Please check your connection.";
        break;
      case "service-not-allowed":
        errorMessage = "Voice recognition service not available.";
        break;
    }
    speak(errorMessage);
  });

  recognition.start();
};
</script>
