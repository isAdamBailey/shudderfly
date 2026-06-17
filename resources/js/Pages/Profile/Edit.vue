<script setup>
import Accordion from "@/Components/Accordion.vue";
import Button from "@/Components/Button.vue";
import NotificationToggle from "@/Components/NotificationToggle.vue";
import Close from "@/Components/svg/Close.vue";
import { useFlashMessage } from "@/composables/useFlashMessage";
import { usePermissions } from "@/composables/permissions";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import AvatarSelectionForm from "./Partials/AvatarSelectionForm.vue";
import CategoriesForm from "./Partials/CategoriesForm.vue";
import ClocksSection from "./Partials/ClocksSection.vue";
import DeleteUserForm from "./Partials/DeleteUserForm.vue";
import SettingsForm from "./Partials/SettingsForm.vue";
import StatsCard from "./Partials/StatsCard.vue";
import UpdatePasswordForm from "./Partials/UpdatePasswordForm.vue";
import UpdateProfileInformationForm from "./Partials/UpdateProfileInformationForm.vue";
import UsersForm from "./Partials/UsersForm.vue";
import VoiceSettingsForm from "./Partials/VoiceSettingsForm.vue";
import { Deferred, Head, router } from "@inertiajs/vue3";
import axios from "axios";
import { ref } from "vue";

const { speak } = useSpeechSynthesis();
const { canAdmin, canEditPages, canEditProfile } = usePermissions();
const { t } = useTranslations();
const { setFlashMessage } = useFlashMessage();

const updatesClosed = ref(false);
const unlockingBlockedPages = ref(false);
const settingsAccordionOpen = ref(false);

const closeUpdates = () => {
  speak("fart");
  updatesClosed.value = true;
};

const updates = [
  {
    title: "Black Circles",
    href: "https://records.adambailey.io/",
    description: "New app to see and hear dads music!"
  }
];

const unblockAllPages = async () => {
  if (unlockingBlockedPages.value) return;
  unlockingBlockedPages.value = true;
  try {
    const { data } = await axios.post(
      route("pages.unblock-all"),
      {},
      { headers: { Accept: "application/json" } }
    );
    setFlashMessage("success", data.message);
    router.reload({ only: ["blockedCount"], preserveScroll: true, async: true });
  } finally {
    unlockingBlockedPages.value = false;
  }
};

defineProps({
  mustVerifyEmail: { type: Boolean, default: false },
  status: { type: Boolean, default: false },
  adminUsers: { type: Array, default: () => [] },
  users: { type: Array, default: () => [] },
  stats: { type: [Object, Function], default: () => ({}) },
  categories: { type: Array, default: () => [] },
  adminSettings: { type: Array, default: () => [] },
  blockedCount: { type: Number, default: 0 },
  defaultCities: { type: Array, default: () => [] },
  maxCities: { type: Number, default: 6 },
  timezoneLabels: { type: Object, default: () => ({}) },
  worldClock: { type: Object, default: null },
});
</script>

<template>
  <Head title="Account" />

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
        <Accordion title="Notification Settings">
          <NotificationToggle />
        </Accordion>
        <Accordion title="Clocks">
          <ClocksSection
            :default-cities="defaultCities"
            :max-cities="maxCities"
            :timezone-labels="timezoneLabels"
            :world-clock="worldClock"
          />
        </Accordion>
        <Accordion title="Users">
          <UsersForm :users="users" />
        </Accordion>
        <Accordion title="Site Statistics">
          <Deferred data="stats">
            <template #fallback>
              <div class="space-y-4 py-2" role="status" aria-live="polite" aria-label="Loading statistics">
                <div class="flex items-center gap-3 text-gray-900 dark:text-gray-100">
                  <i class="ri-loader-4-line text-2xl animate-spin"></i>
                  <span class="font-medium">Loading statistics...</span>
                </div>
                <div class="space-y-2">
                  <div class="h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                  <div class="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                  <div class="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                </div>
              </div>
            </template>
            <StatsCard :stats="stats" />
          </Deferred>
        </Accordion>
      </div>

      <div v-if="canEditPages || canAdmin" class="space-y-6">
        <h3 class="font-heading text-2xl text-theme-title px-1">Administration</h3>
        <Accordion v-if="canEditPages" :title="t('dashboard.unblock')">
          <div class="space-y-3">
            <p class="text-gray-900 dark:text-gray-100">
              {{ t("dashboard.blocked_pages_count", { count: blockedCount }) }}
            </p>
            <div class="flex items-center gap-2">
              <Button
                type="button"
                :disabled="unlockingBlockedPages || blockedCount === 0"
                :aria-label="t('dashboard.unlock_all_blocked_pages_aria')"
                @click="unblockAllPages"
              >
                <i v-if="unlockingBlockedPages" class="ri-loader-line text-xl animate-spin"></i>
                <span v-else>{{ t("dashboard.unlock_all_blocked_pages") }}</span>
              </Button>
            </div>
          </div>
        </Accordion>
        <Accordion v-if="canAdmin" title="Categories">
          <CategoriesForm :categories="categories" />
        </Accordion>
        <Accordion v-if="canAdmin" v-model="settingsAccordionOpen" title="Site Settings">
          <SettingsForm :settings="adminSettings" @submitted="settingsAccordionOpen = false" />
        </Accordion>
      </div>

      <div v-if="canEditProfile" class="space-y-6">
        <h3 class="font-heading text-2xl text-theme-title px-1">Profile</h3>
        <Accordion title="Profile Information">
          <UpdateProfileInformationForm
            :must-verify-email="mustVerifyEmail"
            :status="status"
            class="max-w-xl"
          />
        </Accordion>
        <Accordion title="Password">
          <UpdatePasswordForm class="max-w-xl" />
        </Accordion>
        <Accordion title="Delete Account">
          <DeleteUserForm class="max-w-xl" />
        </Accordion>
      </div>
    </div>
  </AuthenticatedLayout>
</template>
