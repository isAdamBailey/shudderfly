<script setup>
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { useTranslations } from "@/composables/useTranslations";
import { Head } from "@inertiajs/vue3";
import GamesWorld from "./World/GamesWorld.vue";

const { t } = useTranslations();

defineProps({
    games: {
        type: Array,
        required: true,
    },
});
</script>

<template>
    <Head :title="t('games.world.title')" />

    <AuthenticatedLayout hide-search>
        <h2 class="sr-only">{{ t("games.world.title") }}</h2>

        <div class="world-page">
            <GamesWorld :games="games" />
        </div>
    </AuthenticatedLayout>
</template>

<style scoped>
/* The stage measures itself and sets its own height, so the page wrapper just
   has to stop the world from spilling sideways. */
.world-page {
    position: relative;
    width: 100%;
    overflow: hidden;
}
</style>
