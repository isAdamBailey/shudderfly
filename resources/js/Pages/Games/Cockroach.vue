<script setup>
import { useGameViewportLock } from "@/composables/useGameViewportLock";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { Head } from "@inertiajs/vue3";
import CockroachApp from "./Cockroach/App.vue";

useGameViewportLock();
</script>

<template>
    <Head title="Cockroach Fart" />

    <AuthenticatedLayout>
        <div class="cockroach-page">
            <CockroachApp />
        </div>
    </AuthenticatedLayout>
</template>

<style scoped>
.cockroach-page {
    position: relative;
    width: 100%;
    min-height: calc(100dvh - 4rem);
    overflow: hidden;
}
</style>
