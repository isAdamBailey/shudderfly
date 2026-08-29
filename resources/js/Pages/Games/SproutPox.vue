<script setup>
import { useGameViewportLock } from "@/composables/useGameViewportLock";
import { useTranslations } from "@/composables/useTranslations";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { Head } from "@inertiajs/vue3";
import SproutPoxApp from "./SproutPox/App.vue";

useGameViewportLock();
const { t } = useTranslations();
</script>

<template>
    <Head :title="t('games.sprout_pox.title')" />

    <AuthenticatedLayout hide-search>
        <div class="sprout-pox-page game-page">
            <SproutPoxApp />
        </div>
    </AuthenticatedLayout>
</template>

<style scoped>
.sprout-pox-page {
    position: relative;
    width: 100%;
    overflow: hidden;
}
</style>
