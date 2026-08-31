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
        class="btn-bulge snap-center flex min-h-14 min-w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-[0.65rem] font-body font-semibold leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        :class="
            active
                ? 'bg-theme-selected'
                : 'text-gray-300 hover:bg-white/10 hover:text-theme-primary'
        "
        :aria-current="active ? 'page' : undefined"
    >
        <i :class="[icon, 'text-xl']" aria-hidden="true"></i>
        <span class="whitespace-nowrap">{{ label }}</span>
    </Link>
</template>
