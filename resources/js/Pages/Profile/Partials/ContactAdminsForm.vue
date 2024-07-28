<script setup>
import { router } from "@inertiajs/vue3";
import Button from "@/Components/Button.vue";
import { ref, onMounted } from "vue";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
const { speak } = useSpeechSynthesis();

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
    <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">
        Contact Admins
    </h2>
    <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Send messages to mom and dad! You can email them or say it out loud.
    </p>
    <p class="mb-8 text-sm text-gray-600 dark:text-gray-400">
        You can only send one email every hour.
    </p>
    <div>
        <div class="flex align-bottom mb-3 text-gray-700 dark:text-gray-100">
            <i class="ri-emotion-sad-fill text-4xl mr-3"></i
            ><span class="text-2xl font-bold"
                >Dont feel very good today? Tell them!</span
            >
        </div>
        <div>
            <Button
                class="mb-8 mr-3"
                @click="speak('I don\'t feel very good today.')"
            >
                <i class="ri-speak-fill text-4xl mr-3"></i>Say it
            </Button>
            <Button
                :disabled="buttonsDisabled"
                class="mb-8"
                @click="sendEmail('I don\'t feel very good today.')"
            >
                <i class="ri-mail-fill text-4xl mr-3"></i>Email it
            </Button>
        </div>

        <div class="flex align-bottom mb-3 text-gray-700 dark:text-gray-100">
            <i class="ri-emotion-fill text-4xl mr-3"></i
            ><span class="text-2xl font-bold"
                >Feel excited today? Tell them!</span
            >
        </div>
        <div>
            <Button
                class="mb-8 mr-3"
                @click="speak('I feel very excited today!')"
            >
                <i class="ri-speak-fill text-4xl mr-3"></i>Say it
            </Button>
            <Button
                :disabled="buttonsDisabled"
                class="mb-8"
                @click="sendEmail('I feel very excited today!')"
            >
                <i class="ri-mail-fill text-4xl mr-3"></i>Email it
            </Button>
        </div>

        <div class="flex align-bottom mb-3 text-gray-700 dark:text-gray-100">
            <i class="ri-emotion-laugh-fill text-4xl mr-3"></i
            ><span class="text-2xl font-bold"
                >Do you feel really silly today? Tell them!</span
            >
        </div>
        <div>
            <Button
                class="mb-8 mr-3"
                @click="speak('I feel really silly today!')"
            >
                <i class="ri-speak-fill text-4xl mr-3"></i>Say it
            </Button>
            <Button
                :disabled="buttonsDisabled"
                class="mb-8"
                @click="sendEmail('I feel really silly today!')"
            >
                <i class="ri-mail-fill text-4xl mr-3"></i>Email it
            </Button>
        </div>
        <div class="flex align-bottom mb-3 text-gray-700 dark:text-gray-100">
            <i class="ri-heart-fill text-4xl mr-3"></i>
            <span class="text-2xl font-bold">Love mom and dad? Tell them!</span>
        </div>
        <div class="flex">
            <Button class="mb-8 mr-3" @click="speak('I love you mom and dad!')">
                <i class="ri-speak-fill text-4xl mr-3"></i> Say it
            </Button>
            <Button
                :disabled="buttonsDisabled"
                class="mb-8"
                @click="sendEmail('I love you mom and dad!')"
            >
                <i class="ri-mail-fill text-4xl mr-3"></i>Email it
            </Button>
        </div>
    </div>
</template>
