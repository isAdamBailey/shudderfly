<template>
    <div class="w-full px-2 bg-transparent flex">
        <label for="search" class="hidden">Search</label>
        <input
            id="search"
            ref="searchRef"
            v-model="search"
            class="h-8 w-full cursor-pointer rounded-full border border-blue-700 bg-gray-100 px-4 pb-0 pt-px text-gray-700 outline-none transition focus:border-blue-400"
            :class="{ 'border-red-500 border-2': voiceActive }"
            autocomplete="off"
            name="search"
            :placeholder="searchPlaceholder"
            type="search"
            @keyup.esc="search = null"
        />
        <button
            class="self-center flex items-center text-amber-200 dark:text-gray-100 ml-2 w-6 h-6"
            :class="{
                'text-red-500': voiceActive,
                'microphone-icon': !voiceActive,
            }"
            @click="startVoiceRecognition"
        >
            <i class="ri-mic-line text-3xl"></i>
        </button>
    </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { usePage, router } from "@inertiajs/vue3";

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
let searchRef = ref(null);

const typeName = computed(() => {
    return props.label || props.routeName.split(".")[0] || "something";
});

const searchPlaceholder = computed(() => {
    return voiceActive.value ? "Listening..." : `Search ${typeName.value}!`;
});

watch(search, () => {
    if (search.value) {
        searchMethod();
    } else {
        router.get(route(props.routeName));
    }
});

const searchMethod = _.debounce(function () {
    router.get(
        route(props.routeName),
        { search: search.value, filter: filter.value },
        { preserveState: true }
    );
}, 2000);

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
        }
    });

    // keep the voice active state in sync with the recognition state
    recognition.addEventListener("start", () => {
        voiceActive.value = true;
    });

    recognition.addEventListener("end", () => {
        voiceActive.value = false;
    });

    recognition.start();
};
</script>

<style scoped>
.microphone-icon:active {
    @apply text-red-500;
}
</style>
