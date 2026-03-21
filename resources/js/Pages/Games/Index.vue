<script setup>
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { Head, Link } from "@inertiajs/vue3";

const games = [
    {
        slug: "boom",
        name: "Poop Boom",
        emoji: "💩",
        description: "Drag the poop into the toilet. 5 misses and it's game over!",
    },
    {
        slug: "cockroach",
        name: "Cockroach Fart",
        emoji: "🪳",
        description: "Tap the cockroach's head to make it hiss its way to the toilet.",
    },
];
</script>

<template>
    <Head title="Games" />

    <AuthenticatedLayout>
        <template #header>
            <h2 class="font-semibold text-xl text-gray-100 leading-tight">
                Games
            </h2>
        </template>

        <div class="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Link
                    v-for="game in games"
                    :key="game.slug"
                    :href="route('games.show', game.slug)"
                    class="flex flex-col items-center gap-4 p-8 rounded-2xl bg-gray-800 hover:bg-gray-700 transition-colors cursor-pointer text-center"
                >
                    <span class="text-8xl leading-none select-none">{{ game.emoji }}</span>
                    <div>
                        <h3 class="text-2xl font-bold text-gray-100">{{ game.name }}</h3>
                        <p class="mt-1 text-sm text-gray-400">{{ game.description }}</p>
                    </div>
                </Link>
            </div>
        </div>
    </AuthenticatedLayout>
</template>
