<script setup>
// eslint-disable-next-line no-unused-vars
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
    <div
        class="bg-white dark:bg-gray-800 border rounded-lg p-3 flex items-center justify-between shadow-sm"
    >
        <div class="flex items-center flex-1 min-w-0">
            <!-- Cover Image or Icon -->
            <div v-if="coverImage" class="flex-shrink-0 mr-3">
                <img
                    :src="coverImage"
                    :alt="label"
                    class="w-12 h-12 rounded object-cover"
                />
            </div>
            <i
                v-else
                :class="[icon, iconColor, 'text-2xl mr-3 flex-shrink-0']"
            ></i>

            <div class="flex-1 min-w-0">
                <Link
                    v-if="href"
                    :href="href"
                    class="text-base text-gray-500 dark:text-gray-400 truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors block"
                >
                    {{ label }}
                </Link>
                <div
                    v-else
                    class="text-base text-gray-500 dark:text-gray-400 truncate"
                >
                    {{ label }}
                </div>
                <div
                    v-if="value"
                    class="font-bold text-2xl text-gray-900 dark:text-gray-100"
                >
                    {{ value }}
                </div>
                <div
                    v-if="subtitle"
                    class="text-sm text-gray-500 dark:text-gray-400 truncate"
                >
                    {{ subtitle }}
                </div>
            </div>
        </div>
        <slot name="action" />
    </div>
</template>
