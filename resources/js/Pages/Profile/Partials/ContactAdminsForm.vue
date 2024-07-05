<script setup>
import { router } from "@inertiajs/vue3";
import Button from "@/Components/Button.vue";
import { ref, onMounted } from "vue";

const buttonsDisabled = ref(true);

function sendEmail(message) {
    speak(message);
    router.post(route("profile.contact-admins-email", { message }));
    setTimestamp();
}

function speak(message) {
    if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(message);
        window.speechSynthesis.speak(utterance);
    }
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
    <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">
        Contact Admins
    </h2>
    <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Send messages to mom and dad!
    </p>
    <p class="mb-8 text-sm text-gray-600 dark:text-gray-400">
        You can only send one message every hour.
    </p>
    <div class="flex flex-col justify-between">
        Love mom and dad? Tell them!
        <Button
            :disabled="buttonsDisabled"
            class="mb-8"
            @click="sendEmail('I love you mom and dad!')"
        >
            <i class="ri-heart-fill text-4xl mr-5"></i>
            Tell Mom and Dad I love them
        </Button>
        Dont feel very good today? Tell them!

        <Button
            :disabled="buttonsDisabled"
            class="mb-8"
            @click="sendEmail('I don\'t feel very good today.')"
        >
            <i class="ri-thumb-down-fill text-4xl mr-5"></i>
            Tell Mom and Dad I feel bad.
        </Button>
    </div>
</template>
