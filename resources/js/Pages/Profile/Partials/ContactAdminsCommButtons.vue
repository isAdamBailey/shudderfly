<script setup>
import Button from "@/Components/Button.vue";
import { useButtonState } from "@/composables/useDisableButtonState";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { router } from "@inertiajs/vue3";

const { buttonsDisabled, setTimestamp } = useButtonState();
const { speak, speaking } = useSpeechSynthesis();

defineProps({
  message: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: "ri-hearts-fill"
  }
});

function sendEmail(message) {
  const emailMessage = `sending message ${message}`;
  speak(emailMessage);
  router.post(route("profile.contact-admins-email", { message }));
  setTimestamp();
}
</script>

<template>
  <div class="flex mb-3 text-gray-700 dark:text-gray-100">
    <i :class="`${icon} text-5xl mr-3 text-red-500`"></i
    ><span class="text-2xl font-bold">{{ title }}</span>
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
