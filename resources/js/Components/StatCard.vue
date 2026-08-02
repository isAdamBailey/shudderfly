<script setup>
import { Link } from "@inertiajs/vue3";

defineProps({
    icon: {
        type: String,
        required: true,
    },
    iconColor: {
        type: String,
        default: "text-gray-400",
    },
    label: {
        type: String,
        required: true,
    },
    value: {
        type: [String, Number],
        required: false,
        default: null,
    },
    href: {
        type: String,
        default: null,
    },
    coverImage: {
        type: String,
        default: null,
    },
    subtitle: {
        type: String,
        default: null,
    },
});
</script>

<template>
    <component
        :is="href ? Link : 'div'"
        :href="href"
        class="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-3 flex items-center justify-between shadow-sm"
        :class="
            href
                ? 'hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1'
                : ''
        "
    >
        <div class="flex items-center flex-1 min-w-0">
            <div v-if="coverImage" class="flex-shrink-0 mr-3">
                <img
                    :src="coverImage"
                    :alt="label"
                    width="48"
                    height="48"
                    loading="lazy"
                    decoding="async"
                    class="w-12 h-12 rounded object-cover"
                    @error="(e) => (e.target.style.display = 'none')"
                />
            </div>
            <i
                v-else
                :class="[icon, iconColor, 'text-2xl mr-3 flex-shrink-0']"
            ></i>

            <div class="flex-1 min-w-0">
                <div
                    :title="label"
                    :class="[
                        'text-sm truncate',
                        href
                            ? 'font-medium text-gray-900 dark:text-gray-100'
                            : 'text-gray-600 dark:text-gray-400',
                    ]"
                >
                    {{ label }}
                </div>
                <div
                    v-if="value !== null && value !== undefined"
                    :class="
                        href
                            ? 'text-xs text-gray-600 dark:text-gray-400'
                            : 'text-lg font-semibold text-gray-900 dark:text-gray-100'
                    "
                >
                    {{ value }}
                </div>
                <div
                    v-if="subtitle"
                    :title="subtitle"
                    class="text-xs text-gray-600 dark:text-gray-400 truncate"
                >
                    {{ subtitle }}
                </div>
            </div>
        </div>
        <slot name="action" />
    </component>
</template>
