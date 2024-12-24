<template>
    <div class="w-full px-2 bg-transparent flex">
        <label for="search" class="hidden">Search</label>
        <input
            id="search"
            v-model="search"
            class="h-8 w-full cursor-pointer rounded-full border bg-gray-100 px-4 pb-0 pt-px text-gray-700 outline-none transition focus:border-blue-400"
            :class="{ 'border-red-500 border-2': voiceActive }"
            autocomplete="off"
            name="search"
            :placeholder="searchPlaceholder"
            type="search"
            @keyup.esc="search = null"
            @keyup.enter="searchMethod"
        />
        <button
            class="self-center flex items-center ml-2 w-6 h-6"
            @click="startVoiceRecognition"
        >
            <i
                :class="{
                    'bg-red-500 border-red-500': voiceActive,
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
        required: true,
    },
    label: {
        type: String,
        default: null,
    },
});

let search = ref(usePage().props?.search || null);
let filter = ref(usePage().props?.filter || null);
let voiceActive = ref(false);
let voiceHeard = ref(false);

const typeName = computed(() => {
    return props.label || props.routeName.split(".")[0] || "something";
});

const searchPlaceholder = computed(() => {
    if (voiceHeard.value) {
        return "Searching...";
    }
    return voiceActive.value ? "Listening..." : `Search ${typeName.value}!`;
});

watch(search, () => {
    if (!search.value) {
        searchMethod();
    }
});

const searchMethod = () => {
    if (search.value) {
        speak(`Here are some ${props.label} with ${search.value}`);
    }
    router.get(
        route(props.routeName),
        { search: search.value, filter: filter.value },
        { preserveState: true }
    );
};

const startVoiceRecognition = () => {
    const recognition = new (window.SpeechRecognition ||
        window.webkitSpeechRecognition)();
    recognition.interimResults = true;

    recognition.addEventListener("result", (event) => {
        let transcript = Array.from(event.results)
            .map((result) => result[0])
            .map((result) => result.transcript)
            .join("");

        if (event.results[0].isFinal) {
            // Split the transcript into words, remove duplicates, and join back together
            transcript = [...new Set(transcript.split(" "))].join(" ");
            search.value = transcript;
            searchMethod();
        }
    });

    // keep the voice active state in sync with the recognition state
    recognition.addEventListener("start", () => {
        voiceActive.value = true;
    });

    recognition.addEventListener("soundstart", () => {
        voiceHeard.value = true;
    });

    recognition.addEventListener("end", () => {
        voiceActive.value = false;
        voiceHeard.value = false;
    });

    recognition.start();
};
</script>
