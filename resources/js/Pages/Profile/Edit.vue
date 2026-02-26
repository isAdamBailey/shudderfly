<script setup>
import Accordion from "@/Components/Accordion.vue";
import NotificationToggle from "@/Components/NotificationToggle.vue";
import Close from "@/Components/svg/Close.vue";
import { usePermissions } from "@/composables/permissions";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { Head } from "@inertiajs/vue3";
import { ref } from "vue";
import AvatarSelectionForm from "./Partials/AvatarSelectionForm.vue";
import DeleteUserForm from "./Partials/DeleteUserForm.vue";
import UpdatePasswordForm from "./Partials/UpdatePasswordForm.vue";
import UpdateProfileInformationForm from "./Partials/UpdateProfileInformationForm.vue";
import VoiceSettingsForm from "./Partials/VoiceSettingsForm.vue";

const { speak } = useSpeechSynthesis();
const { canEditProfile } = usePermissions();
const updatesClosed = ref(false);

const closeUpdates = () => {
  speak("fart");
  updatesClosed.value = true;
};

const updates = [
  {
    title: "Cockroach Hiss",
    href: "https://cockroach.adambailey.io",
    description: "New game — try it out!"
  },
  {
    title: "Black Circles",
    href: "https://records.adambailey.io/",
    description: "New app to see and hear dads music!"
  }
];

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

    <div class="py-10 max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
      <Transition>
        <div
          v-if="!updatesClosed"
          class="bg-white dark:bg-gray-800 sm:rounded-lg overflow-hidden"
        >
          <div
            class="w-full flex justify-between items-center font-semibold text-xl p-6 border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
          >
            <h2>Updates</h2>
            <Close
              class="text-gray-900 dark:text-gray-100 shrink-0"
              @click="closeUpdates"
            />
          </div>
          <ul class="divide-y divide-gray-200 dark:divide-gray-700">
            <li v-for="update in updates" :key="update.href" class="group">
              <a
                :href="update.href"
                target="_blank"
                rel="noopener noreferrer"
                class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 p-6 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <span
                  class="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"
                >
                  {{ update.title }}
                  <i
                    class="ri-external-link-line text-base opacity-70 group-hover:opacity-100"
                  />
                </span>
                <span class="text-gray-600 dark:text-gray-400 sm:text-right">
                  {{ update.description }}
                </span>
              </a>
            </li>
          </ul>
        </div>
      </Transition>
      <div class="space-y-6">
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
