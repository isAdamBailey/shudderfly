<script setup>
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { Head } from "@inertiajs/vue3";
import CockroachApp from "./Cockroach/App.vue";
</script>

<template>
    <Head title="Cockroach Fart" />

    <AuthenticatedLayout>
        <!-- The game fills the viewport below the nav bar using fixed positioning -->
        <div class="cockroach-page">
            <CockroachApp />
        </div>
    </AuthenticatedLayout>
</template>

<style scoped>
/*
 * Position the game area to fill from directly below the nav bar (h-16 = 4rem)
 * to the bottom of the viewport. Using fixed here keeps the game flush against
 * the nav and prevents the footer / search bar from being visible.
 */
.cockroach-page {
    position: fixed;
    top: 4rem;
    left: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
}
</style>
