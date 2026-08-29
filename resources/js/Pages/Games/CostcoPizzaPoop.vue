<script setup>
import { useGameViewportLock } from "@/composables/useGameViewportLock";
import { useTranslations } from "@/composables/useTranslations";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { Head } from "@inertiajs/vue3";
import CostcoPizzaPoopApp from "./CostcoPizzaPoop/App.vue";

useGameViewportLock();
const { t } = useTranslations();
</script>

<template>
    <Head :title="t('games.costco_pizza_poop.title')" />

    <AuthenticatedLayout hide-search>
        <div class="costco-pizza-poop-page game-page">
            <CostcoPizzaPoopApp />
        </div>
    </AuthenticatedLayout>
</template>

<style scoped>
.costco-pizza-poop-page {
    position: relative;
    width: 100%;
    overflow: hidden;
}
</style>
