<script setup>
import Navigation from "@/Layouts/Nav/Navigation.vue";
import Footer from "@/Layouts/Nav/Footer.vue";
</script>

<template>
    <div class="flex flex-col min-h-screen">
        <div
            class="flex flex-col flex-grow bg-gradient-to-r from-yellow-900 dark:from-purple-900 via-green-500 dark:via-red-500 to-yellow-300 dark:to-yellow-500"
        >
            <Navigation />

            <!-- Page Heading -->
            <header v-if="$slots.header" class="border-gray-900">
                <div class="max-w-7xl mx-auto py-2 px-4 sm:px-6 lg:px-8 mt-3">
                    <slot name="header" />
                </div>
            </header>

            <!-- Page Content -->
            <main>
                <slot />
            </main>

            <Footer />
        </div>
    </div>
</template>
