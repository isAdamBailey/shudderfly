<script setup>
import Button from "@/Components/Button.vue";
import { onMounted, ref } from "vue";
import { router } from "@inertiajs/vue3";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
const { speak, speaking } = useSpeechSynthesis();

defineProps({
    message: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
});

const buttonsDisabled = ref(true);

function sendEmail(message) {
    speak(message);
    router.post(route("profile.contact-admins-email", { message }));
    setTimestamp();
}

function setTimestamp() {
    const futureTime = new Date().getTime() + 60 * 60 * 1000; // 1 hour from now
    localStorage.setItem("buttonsDisabledUntil", futureTime);
    checkTimestamp();
}

function checkTimestamp() {
    const now = new Date().getTime();
    const disabledUntil = localStorage.getItem("buttonsDisabledUntil");
    buttonsDisabled.value = now < disabledUntil;
}

onMounted(() => {
    checkTimestamp();
});
</script>

<template>
    <div class="flex align-bottom mb-3 text-gray-700 dark:text-gray-100">
        <i class="ri-emotion-sad-fill text-4xl mr-3"></i
        ><span class="text-2xl font-bold">{{ title }} Tell them!</span>
    </div>
    <div>
        <Button class="mb-8 mr-3" :disabled="speaking" @click="speak(message)">
            <i class="ri-speak-fill text-4xl mr-3"></i>Say it
        </Button>
        <Button
            :disabled="buttonsDisabled"
            class="mb-8"
            @click="sendEmail(message)"
        >
            <i class="ri-mail-fill text-4xl mr-3"></i>Email it
        </Button>
    </div>
</template>
