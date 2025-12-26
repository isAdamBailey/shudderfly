<script setup>
import Accordion from "@/Components/Accordion.vue";
import NotificationToggle from "@/Components/NotificationToggle.vue";
import Close from "@/Components/svg/Close.vue";
import { usePermissions } from "@/composables/permissions";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { Head, usePage } from "@inertiajs/vue3";
import { computed, ref } from "vue";
import AvatarSelectionForm from "./Partials/AvatarSelectionForm.vue";
import DeleteUserForm from "./Partials/DeleteUserForm.vue";
import UpdatePasswordForm from "./Partials/UpdatePasswordForm.vue";
import UpdateProfileInformationForm from "./Partials/UpdateProfileInformationForm.vue";
import VoiceSettingsForm from "./Partials/VoiceSettingsForm.vue";

const { speak } = useSpeechSynthesis();
const { canEditProfile } = usePermissions();

const close = ref(false);

const title = computed(() => {
  return ` Hi ${
    usePage().props.auth.user.name
  }! We love you! Welcome to your account page`;
});

const closeMessage = () => {
  speak("fart");
  close.value = true;
};

defineProps({
  mustVerifyEmail: {
    type: Boolean,
    default: false
  },
  status: {
    type: Boolean,
    default: false
  },
  adminUsers: {
    type: Array,
    default: () => []
  }
});
</script>

<template>
  <Head title="Profile" />

  <AuthenticatedLayout>
    <template #header>
      <h2 class="font-heading text-4xl text-theme-title leading-tight">
        Account
      </h2>
    </template>

    <div class="py-10">
      <Transition>
        <div
          v-if="!close"
          class="mx-6 mb-5 p-6 flex justify-between bg-white dark:bg-gray-800 sm:rounded-lg"
        >
          <h2
            class="font-semibold text-lg text-gray-900 dark:text-gray-100 leading-tight w-3/4 md:w-full"
          >
            {{ title }} 😘❤️
          </h2>
          <Close
            v-if="!close"
            class="text-gray-900 dark:text-gray-100"
            @click="closeMessage"
          />
        </div>
      </Transition>
      <div class="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
        <Accordion title="Avatar">
          <AvatarSelectionForm />
        </Accordion>
        <Accordion title="Voice Settings">
          <VoiceSettingsForm />
        </Accordion>
        <Accordion title="Push Notifications">
          <NotificationToggle />
        </Accordion>
        <Accordion v-if="canEditProfile" title="Profile Information">
          <UpdateProfileInformationForm
            :must-verify-email="mustVerifyEmail"
            :status="status"
            class="max-w-xl"
          />
        </Accordion>

        <Accordion v-if="canEditProfile" title="Password">
          <UpdatePasswordForm class="max-w-xl" />
        </Accordion>

        <Accordion v-if="canEditProfile" title="Delete Account">
          <DeleteUserForm class="max-w-xl" />
        </Accordion>
      </div>
    </div>
  </AuthenticatedLayout>
</template>
