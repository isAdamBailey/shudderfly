<script setup>
import Footer from "@/Layouts/Nav/Footer.vue";
import Navigation from "@/Layouts/Nav/Navigation.vue";
</script>

<template>
    <div class="flex flex-col min-h-screen">
        <div
            class="flex flex-col flex-grow bg-gradient-to-r from-indigo-600 to-blue-200 dark:from-gray-900 dark:to-purple-500 christmas:bg-gradient-to-r christmas:from-christmas-snow christmas:to-christmas-gold"
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
