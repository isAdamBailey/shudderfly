<template>
    <div
        v-if="links.length > 3"
        class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6"
    >
        <div class="flex flex-1 justify-between sm:hidden">
            <Link
                v-if="links[0].url"
                :href="links[0].url"
                class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
                Previous
            </Link>
            <span
                v-else
                class="relative inline-flex items-center rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
            >
                Previous
            </span>

            <Link
                v-if="links[links.length - 1].url"
                :href="links[links.length - 1].url"
                class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
                Next
            </Link>
            <span
                v-else
                class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
            >
                Next
            </span>
        </div>
        <div
            class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between"
        >
            <div>
                <p class="text-sm text-gray-700">
                    Showing
                    {{ " " }}
                    <span class="font-medium">{{ from || 0 }}</span>
                    {{ " " }}
                    to
                    {{ " " }}
                    <span class="font-medium">{{ to || 0 }}</span>
                    {{ " " }}
                    of
                    {{ " " }}
                    <span class="font-medium">{{ total || 0 }}</span>
                    {{ " " }}
                    results
                </p>
            </div>
            <div>
                <nav
                    class="isolate inline-flex -space-x-px rounded-md shadow-sm"
                    aria-label="Pagination"
                >
                    <template v-for="(link, index) in links" :key="index">
                        <Link
                            v-if="link.url"
                            :href="link.url"
                            :class="[
                                'relative inline-flex items-center px-4 py-2 text-sm font-semibold',
                                index === 0 ? 'rounded-l-md' : '',
                                index === links.length - 1
                                    ? 'rounded-r-md'
                                    : '',
                                link.active
                                    ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                                    : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0',
                            ]"
                            v-html="link.label"
                        />
                        <span
                            v-else
                            :class="[
                                'relative inline-flex items-center px-4 py-2 text-sm font-semibold cursor-not-allowed opacity-50',
                                index === 0 ? 'rounded-l-md' : '',
                                index === links.length - 1
                                    ? 'rounded-r-md'
                                    : '',
                                link.active
                                    ? 'z-10 bg-indigo-600 text-white'
                                    : 'text-gray-900 ring-1 ring-inset ring-gray-300 bg-gray-50',
                            ]"
                            v-html="link.label"
                        />
                    </template>
                </nav>
            </div>
        </div>
    </div>
</template>

<script setup>
import { Link } from "@inertiajs/vue3";

const props = defineProps({
    links: {
        type: Array,
        required: true,
    },
    from: Number,
    to: Number,
    total: Number,
});
</script>
