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

    <AuthenticatedLayout>
        <div class="sprout-pox-page">
            <SproutPoxApp />
        </div>
    </AuthenticatedLayout>
</template>

<style scoped>
.sprout-pox-page {
    position: relative;
    width: 100%;
    /*
     * AuthenticatedLayout's content column adds `pb-20` (5rem) below sm and
     * `sm:pb-0` at/above it (space for the mobile bottom nav). If this page
     * only reserved `100dvh - 4rem`, that extra 5rem pushed the whole page
     * taller than the viewport on short mobile screens, scrolling the
     * bottom of the stage — where the sprout launches — out of view.
     */
    min-height: calc(100dvh - 4rem - 5rem);
    overflow: hidden;
}

@media (min-width: 640px) {
    .sprout-pox-page {
        min-height: calc(100dvh - 4rem);
    }
}
</style>
