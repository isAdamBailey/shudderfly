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
    users: { type: [Array, Function], default: () => [] },
    stats: { type: [Object, Function], default: () => ({}) },
    categories: { type: [Array, Function], default: () => [] },
    adminSettings: { type: Array, default: () => [] },
    blockedPagesCount: { type: [Number, Function], default: 0 },
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
                            <Deferred data="categories">
                                <template #fallback>
                                    <div
                                        class="text-gray-900 dark:text-gray-100"
                                    >
                                        Loading...
                                    </div>
                                </template>
                                <CategoriesForm :categories="categories" />
                            </Deferred>
                        </Accordion>
                    </div>
                </div>
                <div class="w-full sm:px-6 lg:px-8">
                    <div
                        class="bg-white overflow-visible shadow-sm sm:rounded-lg"
                    >
                        <Accordion title="Users">
                            <Deferred data="users">
                                <template #fallback>
                                    <div
                                        class="text-gray-900 dark:text-gray-100"
                                    >
                                        Loading...
                                    </div>
                                </template>
                                <UsersForm :users="users" />
                            </Deferred>
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

                <div class="w-full sm:px-6 lg:px-8">
                    <div
                        class="bg-white overflow-hidden shadow-sm sm:rounded-lg"
                    >
                        <Accordion :title="t('dashboard.unblock')">
                            <Deferred data="blockedPagesCount">
                                <template #fallback>
                                    <div
                                        class="text-gray-900 dark:text-gray-100"
                                    >
                                        Loading...
                                    </div>
                                </template>
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
                            </Deferred>
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
                                    <div
                                        class="text-gray-900 dark:text-gray-100"
                                    >
                                        Loading...
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
