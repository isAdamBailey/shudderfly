<script setup>
import { computed } from "vue";
import { Link } from "@inertiajs/vue3";

const props = defineProps(["href", "active"]);

const classes = computed(() =>
    props.active
        ? "inline-flex items-center px-1 pt-1 border-b-2 border-yellow-200 text-xl font-heading dark:border-indigo-600 font-medium leading-5 text-yellow-200 dark:text-gray-100 focus:outline-none focus:border-indigo-700 transition duration-150 ease-in-out"
        : "inline-flex items-center px-1 pt-1 border-b-4 border-transparent text-xl font-heading leading-5 text-white dark:text-gray-400 hover:text-yellow-200 hover:border-yellow-200 focus:outline-none focus:text-white focus:border-gray-300 dark:focus:border-gray-700 transition duration-150 ease-in-out"
);
</script>

<template>
    <Link :href="href" :class="classes">
        <slot />
    </Link>
</template>
