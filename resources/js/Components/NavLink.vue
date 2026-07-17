<script setup>
import { Link } from "@inertiajs/vue3";
import { computed } from "vue";

const props = defineProps(["href", "active"]);

const classes = computed(() =>
    props.active
        ? "inline-flex items-center whitespace-nowrap px-1 pt-1 border-b-2 border-theme-primary text-base sm:text-xl font-heading font-medium leading-5 text-theme-primary focus:outline-none transition duration-150 ease-in-out"
        : "inline-flex items-center whitespace-nowrap px-1 pt-1 border-b-4 border-transparent text-base sm:text-xl font-heading leading-5 text-white hover:text-theme-primary hover:border-theme-primary focus:outline-none transition duration-150 ease-in-out"
);
</script>

<template>
    <Link :href="href" :class="classes">
        <slot />
    </Link>
</template>
