<script setup>
import { useGameViewportLock } from "@/composables/useGameViewportLock";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { Head } from "@inertiajs/vue3";
import BigPoopApp from "./BigPoop/App.vue";

useGameViewportLock();
</script>

<template>
    <Head title="Big Poop" />

    <AuthenticatedLayout>
        <div class="big-poop-page">
            <BigPoopApp />
        </div>
    </AuthenticatedLayout>
</template>

<style scoped>
.big-poop-page {
    position: relative;
    width: 100%;
    min-height: calc(100dvh - 4rem);
    overflow: hidden;
}
</style>
