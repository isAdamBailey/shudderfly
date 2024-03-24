<script setup>
import { computed } from "vue";
import { Link } from "@inertiajs/vue3";

const props = defineProps(["href", "active"]);

const classes = computed(() =>
    props.active
        ? "block w-full pl-3 pr-4 py-2 border-l-4 border-yellow-200 dark:border-indigo-600 text-left text-base font-medium text-yellow-200 dark:text-indigo-300 dark:bg-indigo-900/50 focus:outline-none focus:text-yellow-200 dark:focus:text-indigo-200 focus:bg-indigo-100 dark:focus:bg-indigo-900 focus:border-yellow-200 dark:focus:border-indigo-300 transition duration-150 ease-in-out"
        : "block w-full pl-3 pr-4 py-2 border-l-4 border-transparent text-left text-base font-medium text-white dark:text-gray-400 hover:text-yellow-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 hover:border-yellow-200 dark:hover:border-gray-600 focus:outline-none focus:text-white dark:focus:text-gray-200 dark:focus:bg-gray-700 focus:border-yellow-200 dark:focus:border-gray-600 transition duration-150 ease-in-out"
);
</script>

<template>
    <Link :href="href" :class="classes">
        <slot />
    </Link>
</template>
