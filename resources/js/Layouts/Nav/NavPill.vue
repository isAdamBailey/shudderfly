<script setup>
import { Link } from "@inertiajs/vue3";

defineProps({
    href: { type: String, required: true },
    label: { type: String, required: true },
    icon: { type: String, required: true },
    active: { type: Boolean, default: false },
});
</script>

<template>
    <Link
        :href="href"
        class="btn-bulge inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-transparent px-3 py-1.5 text-sm font-body font-semibold transition-colors duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 lg:text-base"
        :class="
            active
                ? 'bg-theme-selected'
                : 'text-gray-100 hover:bg-white/10 hover:text-theme-primary'
        "
        :aria-current="active ? 'page' : undefined"
    >
        <i :class="[icon, 'text-lg']" aria-hidden="true"></i>
        <span>{{ label }}</span>
    </Link>
</template>
