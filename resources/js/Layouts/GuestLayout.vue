<script setup>
import ApplicationLogo from "@/Components/ApplicationLogo.vue";
import { Link } from "@inertiajs/vue3";

const currentYear = new Date().getFullYear();
</script>

<template>
    <div
        class="min-h-screen flex flex-col sm:justify-center items-center pt-6 sm:pt-0 bg-gray-900"
    >
        <div>
            <Link href="/">
                <ApplicationLogo class="h-20" />
            </Link>
        </div>

        <div
            class="w-full sm:max-w-md mt-6 px-6 py-4 bg-gray-100 dark:bg-gray-800 shadow-md overflow-hidden sm:rounded-lg"
        >
            <slot />
        </div>

        <footer class="mt-8 text-center text-xs text-gray-400">
            &copy; {{ currentYear }}
            <a
                href="https://adambailey.io?utm_source=shudderfly&utm_medium=referral"
                target="_blank"
                rel="noopener"
                class="hover:text-gray-200 underline"
            >
                Adam Bailey
            </a>
        </footer>
    </div>
</template>
