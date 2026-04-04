<script setup>
import { useGameViewportLock } from "@/composables/useGameViewportLock";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { Head } from "@inertiajs/vue3";
import CostcoPizzaPoopApp from "./CostcoPizzaPoop/App.vue";

useGameViewportLock();
</script>

<template>
    <Head title="Costco Pizza Poop" />

    <AuthenticatedLayout>
        <div class="costco-pizza-poop-page">
            <CostcoPizzaPoopApp />
        </div>
    </AuthenticatedLayout>
</template>

<style scoped>
.costco-pizza-poop-page {
    position: relative;
    width: 100%;
    min-height: calc(100dvh - 4rem);
    overflow: hidden;
}
</style>
