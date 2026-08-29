<script setup>
import { useGameViewportLock } from "@/composables/useGameViewportLock";
import { useTranslations } from "@/composables/useTranslations";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { Head } from "@inertiajs/vue3";
import TootFoodsApp from "./TootFoods/App.vue";

useGameViewportLock();
const { t } = useTranslations();
</script>

<template>
    <Head :title="t('games.toot_foods.title')" />

    <AuthenticatedLayout hide-search>
        <div class="toot-foods-page game-page">
            <TootFoodsApp />
        </div>
    </AuthenticatedLayout>
</template>

<style scoped>
.toot-foods-page {
    position: relative;
    width: 100%;
    overflow: hidden;
}
</style>
