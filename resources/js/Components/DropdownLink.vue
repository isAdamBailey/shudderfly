<script setup>
import { Link } from "@inertiajs/vue3";
</script>

<template>
    <Link
        class="block w-full px-4 py-2 text-left text-sm leading-5 text-gray-700 hover:text-gray-50 dark:text-gray-300 hover:dark:text-gray-800 bg-gray-100 dark:bg-gray-800 hover:bg-gray-400 dark:hover:bg-gray-400 focus:outline-none focus:bg-yellow-200 dark:focus:bg-gray-800 transition duration-150 ease-in-out"
    >
        <slot />
    </Link>
</template>
