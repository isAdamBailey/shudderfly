<script setup>
import { useGameViewportLock } from "@/composables/useGameViewportLock";
import { useTranslations } from "@/composables/useTranslations";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { Head } from "@inertiajs/vue3";
import CockroachApp from "./Cockroach/App.vue";

useGameViewportLock();
const { t } = useTranslations();
</script>

<template>
    <Head :title="t('games.cockroach.title')" />

    <AuthenticatedLayout hide-search>
        <div class="cockroach-page game-page">
            <CockroachApp />
        </div>
    </AuthenticatedLayout>
</template>

<style scoped>
.cockroach-page {
    position: relative;
    width: 100%;
    overflow: hidden;
}
</style>
