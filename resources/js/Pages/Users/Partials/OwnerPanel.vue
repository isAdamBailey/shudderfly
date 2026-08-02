<script setup>
import Accordion from "@/Components/Accordion.vue";
import { usePermissions } from "@/composables/permissions";
import CategoriesForm from "@/Pages/Profile/Partials/CategoriesForm.vue";
import ClocksSection from "@/Pages/Profile/Partials/ClocksSection.vue";
import SettingsForm from "@/Pages/Profile/Partials/SettingsForm.vue";
import StatsCard from "@/Pages/Profile/Partials/StatsCard.vue";
import UsersForm from "@/Pages/Profile/Partials/UsersForm.vue";
import { ref } from "vue";

const { canAdmin } = usePermissions();

const settingsAccordionOpen = ref(false);

defineProps({
    adminUsers: { type: Array, default: () => [] },
    users: { type: Array, default: () => [] },
    siteStats: { type: Object, default: () => ({}) },
    categories: { type: Array, default: () => [] },
    adminSettings: { type: Array, default: () => [] },
    defaultCities: { type: Array, default: () => [] },
    maxCities: { type: Number, default: 6 },
    timezoneLabels: { type: Object, default: () => ({}) },
    worldClock: { type: Object, default: null },
});
</script>

<template>
    <div class="space-y-6">
        <div class="space-y-6">
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

        <div v-if="canAdmin" id="administration" class="space-y-6">
            <h3 class="font-heading text-2xl text-theme-title px-1">
                Administration
            </h3>
            <Accordion title="Categories">
                <CategoriesForm :categories="categories" />
            </Accordion>
            <Accordion v-model="settingsAccordionOpen" title="Site">
                <SettingsForm
                    :settings="adminSettings"
                    @submitted="settingsAccordionOpen = false"
                />
            </Accordion>
        </div>
    </div>
</template>
