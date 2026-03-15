<script setup>
import Accordion from "@/Components/Accordion.vue";
import Button from "@/Components/Button.vue";
import BreezeValidationErrors from "@/Components/ValidationErrors.vue";
import { usePermissions } from "@/composables/permissions";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import CategoriesForm from "@/Pages/Dashboard/CategoriesForm.vue";
import SettingsForm from "@/Pages/Dashboard/SettingsForm.vue";
import StatsCard from "@/Pages/Dashboard/StatsCard.vue";
import UsersForm from "@/Pages/Dashboard/UsersForm.vue";
import { Deferred, Head, router } from "@inertiajs/vue3";
import { ref } from "vue";

defineProps({
    users: { type: Array, default: () => [] },
    stats: { type: [Object, Function], default: () => ({}) },
    categories: { type: Array, default: () => [] },
    adminSettings: { type: Array, default: () => [] },
    blockedPagesCount: { type: Number, default: 0 },
});

const buildTimestamp = __BUILD_TIMESTAMP__;

const { canAdmin } = usePermissions();
const { speak, speaking } = useSpeechSynthesis();
const { t } = useTranslations();
const unlockingBlockedPages = ref(false);

const unblockAllPages = () => {
    if (unlockingBlockedPages.value) {
        return;
    }

    unlockingBlockedPages.value = true;
    router.post("/pages/unblock-all", {}, {
        preserveScroll: true,
        onFinish: () => {
            unlockingBlockedPages.value = false;
        },
    });
};
</script>

<template>
    <Head title="Admin" />

    <BreezeAuthenticatedLayout>
        <template #header>
            <h2 class="font-heading text-2xl text-theme-title leading-tight">
                The Administration Dashboard
            </h2>
        </template>

        <div class="pb-12">
            <div class="flex justify-center mb-4">
                <BreezeValidationErrors />
            </div>

            <div class="flex flex-wrap justify-around space-y-2">
                <div v-if="canAdmin" class="w-full sm:px-6 lg:px-8">
                    <div
                        class="bg-white overflow-hidden shadow-sm sm:rounded-lg"
                    >
                        <Accordion title="Categories">
                            <CategoriesForm :categories="categories" />
                        </Accordion>
                    </div>
                </div>
                <div class="w-full sm:px-6 lg:px-8">
                    <div
                        class="bg-white overflow-visible shadow-sm sm:rounded-lg"
                    >
                        <Accordion title="Users">
                            <UsersForm :users="users" />
                        </Accordion>
                    </div>
                </div>

                <div v-if="canAdmin" class="w-full sm:px-6 lg:px-8">
                    <div
                        class="bg-white overflow-hidden shadow-sm sm:rounded-lg"
                    >
                        <Accordion title="Site Settings">
                            <SettingsForm :settings="adminSettings" />
                        </Accordion>
                    </div>
                </div>

                <div v-if="canAdmin" class="w-full sm:px-6 lg:px-8">
                    <div
                        class="bg-white overflow-hidden shadow-sm sm:rounded-lg"
                    >
                        <Accordion :title="t('dashboard.unblock')">
                            <div class="space-y-3">
                                <p class="text-gray-900 dark:text-gray-100">
                                    {{ t("dashboard.blocked_pages_count", { count: blockedPagesCount }) }}
                                </p>
                                <div class="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        :disabled="speaking"
                                        class="h-10 w-10 flex items-center justify-center"
                                        :title="t('dashboard.speak_unblock_all_action')"
                                        :aria-label="t('dashboard.speak_unblock_all_action_aria')"
                                        @click="speak(t('dashboard.speak_unblock_all_action_with_count', { count: blockedPagesCount }))"
                                    >
                                        <i class="ri-speak-fill text-xl"></i>
                                    </Button>
                                    <Button
                                        type="button"
                                        :disabled="unlockingBlockedPages || blockedPagesCount === 0"
                                        :aria-label="t('dashboard.unlock_all_blocked_pages_aria')"
                                        @click="unblockAllPages"
                                    >
                                        <i v-if="unlockingBlockedPages" class="ri-loader-line text-xl animate-spin"></i>
                                        <span v-else>{{ t("dashboard.unlock_all_blocked_pages") }}</span>
                                    </Button>
                                </div>
                            </div>
                        </Accordion>
                    </div>
                </div>

                <div class="w-full sm:px-6 lg:px-8">
                    <div
                        class="bg-white overflow-hidden shadow-sm sm:rounded-lg"
                    >
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
                    <p class="ml-5 md:ml-0 font-bold mt-12 text-gray-100">
                        Last Deployment: {{ buildTimestamp }}
                    </p>
                </div>
            </div>
        </div>
    </BreezeAuthenticatedLayout>
</template>

<style scoped></style>
