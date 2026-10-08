<script setup>
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { useTranslations } from "@/composables/useTranslations";
import { Head } from "@inertiajs/vue3";
import GamesWorld from "./World/GamesWorld.vue";

const { t } = useTranslations();

defineProps({
    scenes: {
        type: Object,
        required: true,
    },
    // A shared link's { scene, visit } (/games?scene=house.hall), checked
    // against the registry by the server.
    link: {
        type: Object,
        default: null,
    },
});
</script>

<template>
    <Head :title="t('games.world.title')" />

    <AuthenticatedLayout>
        <h2 class="sr-only">{{ t("games.world.title") }}</h2>

        <div class="world-page">
            <GamesWorld :scenes="scenes" :link="link" />
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
