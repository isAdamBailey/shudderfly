<script setup>
import { useGameViewportLock } from "@/composables/useGameViewportLock";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { Head } from "@inertiajs/vue3";
import CockroachFightApp from "./CockroachFight/App.vue";

useGameViewportLock();
</script>

<template>
    <Head title="Cockroach Fight" />

    <AuthenticatedLayout>
        <div class="cockroach-fight-page">
            <CockroachFightApp />
        </div>
    </AuthenticatedLayout>
</template>

<style scoped>
.cockroach-fight-page {
    position: relative;
    width: 100%;
    min-height: calc(100dvh - 4rem);
    overflow: hidden;
}
</style>
