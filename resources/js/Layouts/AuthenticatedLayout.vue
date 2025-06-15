<script setup>
import Footer from "@/Layouts/Nav/Footer.vue";
import Navigation from "@/Layouts/Nav/Navigation.vue";
import { ref } from "vue";

const showFlash = ref(true);
</script>

<template>
    <div class="flex flex-col min-h-screen">
        <div class="flex flex-col flex-grow bg-gray-900">
            <Navigation />

            <!-- Flash Message -->
            <div
                v-if="$page.props.flash?.success && showFlash"
                class="fixed top-0 left-0 right-0 z-50"
            >
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                    <div
                        class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative shadow-lg"
                        role="alert"
                    >
                        <span class="block sm:inline">{{
                            $page.props.flash.success
                        }}</span>
                        <button
                            class="absolute top-0 right-0 px-4 py-3 focus:outline-none"
                            @click="showFlash = false"
                        >
                            <i class="ri-close-line text-lg"></i>
                        </button>
                    </div>
                </div>
            </div>

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
