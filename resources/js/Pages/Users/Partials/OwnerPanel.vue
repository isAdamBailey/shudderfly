<script setup>
import Accordion from "@/Components/Accordion.vue";
import Button from "@/Components/Button.vue";
import NotificationToggle from "@/Components/NotificationToggle.vue";
import SpeakButton from "@/Components/SpeakButton.vue";
import { useFlashMessage } from "@/composables/useFlashMessage";
import { usePermissions } from "@/composables/permissions";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
import AvatarSelectionForm from "@/Pages/Profile/Partials/AvatarSelectionForm.vue";
import CategoriesForm from "@/Pages/Profile/Partials/CategoriesForm.vue";
import ClocksSection from "@/Pages/Profile/Partials/ClocksSection.vue";
import SettingsForm from "@/Pages/Profile/Partials/SettingsForm.vue";
import StatsCard from "@/Pages/Profile/Partials/StatsCard.vue";
import UsersForm from "@/Pages/Profile/Partials/UsersForm.vue";
import VoiceSettingsForm from "@/Pages/Profile/Partials/VoiceSettingsForm.vue";
import { router } from "@inertiajs/vue3";
import axios from "axios";
import { ref } from "vue";

const { speak, speaking } = useSpeechSynthesis();
const { canAdmin, canEditPages } = usePermissions();
const { t } = useTranslations();
const { setFlashMessage } = useFlashMessage();

const unlockingBlockedPages = ref(false);
const settingsAccordionOpen = ref(false);

const props = defineProps({
    adminUsers: { type: Array, default: () => [] },
    users: { type: Array, default: () => [] },
    siteStats: { type: Object, default: () => ({}) },
    categories: { type: Array, default: () => [] },
    adminSettings: { type: Array, default: () => [] },
    blockedCount: { type: Number, default: 0 },
    defaultCities: { type: Array, default: () => [] },
    maxCities: { type: Number, default: 6 },
    timezoneLabels: { type: Object, default: () => ({}) },
    worldClock: { type: Object, default: null },
});

const speakBlockedCount = () => {
    speak(t("dashboard.blocked_pages_count", { count: props.blockedCount }));
};

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
        router.reload({
            only: ["blockedCount"],
            preserveScroll: true,
            async: true,
        });
    } finally {
        unlockingBlockedPages.value = false;
    }
};
</script>

<template>
    <div class="space-y-6">
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
                <StatsCard :stats="siteStats" />
            </Accordion>
        </div>

        <div v-if="canEditPages || canAdmin" class="space-y-6">
            <h3 class="font-heading text-2xl text-theme-title px-1">
                Administration
            </h3>
            <Accordion v-if="canEditPages" :title="t('dashboard.unblock')">
                <div class="space-y-3">
                    <div class="flex items-center gap-2">
                        <p class="text-gray-900 dark:text-gray-100">
                            {{
                                t("dashboard.blocked_pages_count", {
                                    count: blockedCount,
                                })
                            }}
                        </p>
                        <SpeakButton
                            :disabled="speaking"
                            aria-label="Speak blocked pages count"
                            icon-class="ri-speak-fill text-lg"
                            @click="speakBlockedCount"
                        />
                    </div>
                    <div class="flex items-center gap-2">
                        <Button
                            type="button"
                            :disabled="
                                unlockingBlockedPages || blockedCount === 0
                            "
                            :aria-label="
                                t('dashboard.unlock_all_blocked_pages_aria')
                            "
                            @click="unblockAllPages"
                        >
                            <i
                                v-if="unlockingBlockedPages"
                                class="ri-loader-line text-xl animate-spin"
                            ></i>
                            <span v-else>{{
                                t("dashboard.unlock_all_blocked_pages")
                            }}</span>
                        </Button>
                    </div>
                </div>
            </Accordion>
            <Accordion v-if="canAdmin" title="Categories">
                <CategoriesForm :categories="categories" />
            </Accordion>
            <Accordion
                v-if="canAdmin"
                v-model="settingsAccordionOpen"
                title="Site Settings"
            >
                <SettingsForm
                    :settings="adminSettings"
                    @submitted="settingsAccordionOpen = false"
                />
            </Accordion>
        </div>
    </div>
</template>
