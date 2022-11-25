<script setup>
import { Link } from '@inertiajs/inertia-vue3';
</script>

<template>
    <Link class="block w-full px-4 py-2 text-left text-sm leading-5 text-gray-700 dark:text-gray-300 bg-yellow-200 hover:bg-yellow-400 dark:hover:bg-gray-800 focus:outline-none focus:bg-yellow-200 dark:focus:bg-gray-800 transition duration-150 ease-in-out">
        <slot />
    </Link>
</template>
