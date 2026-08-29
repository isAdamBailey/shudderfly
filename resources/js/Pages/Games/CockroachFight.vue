<script setup>
import { useGameViewportLock } from "@/composables/useGameViewportLock";
import { useTranslations } from "@/composables/useTranslations";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { Head } from "@inertiajs/vue3";
import CockroachFightApp from "./CockroachFight/App.vue";

useGameViewportLock();
const { t } = useTranslations();
</script>

<template>
    <Head :title="t('games.cockroach_fight.title')" />

    <AuthenticatedLayout hide-search>
        <div class="cockroach-fight-page game-page">
            <CockroachFightApp />
        </div>
    </AuthenticatedLayout>
</template>

<style scoped>
.cockroach-fight-page {
    position: relative;
    width: 100%;
    overflow: hidden;
}
</style>
