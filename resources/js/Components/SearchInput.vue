<template>
    <div class="w-full px-2 bg-transparent flex">
        <label for="search" class="hidden">Search</label>
        <input
            id="search"
            ref="search"
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
            class="self-center text-amber-200 dark:text-gray-100 ml-2 w-6 h-6"
            :class="voiceActive ? ' animate-bounce' : 'animate-none'"
            @click="startVoiceRecognition"
        >
            <Microphone
                :class="{
                    'text-red-500': voiceActive,
                    'microphone-icon': !voiceActive,
                }"
            />
        </button>
    </div>
</template>

<script>
import { defineComponent } from "vue";
import { usePage } from "@inertiajs/inertia-vue3";
import Microphone from "@/Components/svg/MicrophoneIcon.vue";

export default defineComponent({
    components: { Microphone },
    props: {
        routeName: {
            type: String,
            required: true,
        },
        label: {
            type: String,
            default: null,
        },
    },

    data() {
        return {
            search: usePage().props.value?.search || null,
            voiceActive: false,
        };
    },

    computed: {
        typeName() {
            return this.label || this.routeName.split(".")[0] || "something";
        },
        searchPlaceholder() {
            return this.voiceActive
                ? "Listening..."
                : `Search ${this.typeName}!`;
        },
    },

    watch: {
        search() {
            if (this.search) {
                this.searchMethod();
            } else {
                this.$inertia.get(route(this.routeName));
            }
        },
    },

    methods: {
        searchMethod: _.debounce(function () {
            this.$inertia.get(
                route(this.routeName),
                { search: this.search },
                { preserveState: true }
            );
        }, 500),

        startVoiceRecognition() {
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
                    this.search = transcript;
                }
            });

            // keep the voice active state in sync with the recognition state
            recognition.addEventListener("start", () => {
                this.voiceActive = true;
            });

            recognition.addEventListener("end", () => {
                this.voiceActive = false;
            });

            recognition.start();
        },
    },
});
</script>

<style scoped>
.microphone-icon:active {
    @apply text-red-500;
}
</style>
