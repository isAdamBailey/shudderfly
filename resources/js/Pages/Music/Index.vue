<template>
    <Head title="Music" />

    <BreezeAuthenticatedLayout>
        <template #header>
            <div class="flex justify-between items-center mb-10">
                <Link class="w-1/2" :href="route('music.index')">
                    <h2
                        class="font-heading text-3xl text-theme-title leading-tight"
                    >
                        Music
                    </h2>
                </Link>
            </div>

            <!-- Search Bar -->
            <div class="mb-6 w-full md:w-1/2 mx-auto">
                <form @submit.prevent="search">
                    <div class="relative">
                        <input
                            v-model="searchQuery"
                            type="text"
                            placeholder="Search songs by title, description, or artist..."
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                            type="submit"
                            class="absolute right-2 top-2 px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Search
                        </button>
                    </div>
                </form>
                <button
                    v-if="props.search"
                    class="mt-2 text-sm text-gray-600 hover:text-gray-800"
                    @click="clearSearch"
                >
                    Clear search
                </button>
            </div>

            <!-- Sync Button for Admins -->
            <div v-if="canSync" class="mb-6 w-full md:w-1/2 mx-auto">
                <Button
                    :disabled="syncing"
                    class="w-full bg-green-600 hover:bg-green-700"
                    @click="syncPlaylist"
                >
                    <span v-if="syncing">Syncing YouTube Playlist...</span>
                    <span v-else>Sync YouTube Playlist</span>
                </Button>
            </div>
        </template>

        <!-- Songs Grid -->
        <div
            v-if="songs.data.length > 0"
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
            <SongCard v-for="song in songs.data" :key="song.id" :song="song" />
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-12">
            <div class="max-w-md mx-auto">
                <h3 class="text-lg font-medium text-gray-900 mb-2">
                    No songs found
                </h3>
                <p class="text-gray-600 mb-4">
                    <span v-if="props.search">
                        No songs match your search criteria. Try a different
                        search term.
                    </span>
                    <span v-else>
                        No songs have been added yet.
                        <span v-if="canSync"
                            >Sync your YouTube playlist to get started.</span
                        >
                    </span>
                </p>
            </div>
        </div>

        <!-- Pagination -->
        <div v-if="songs.data.length > 0" class="mt-8">
            <Pagination
                :links="songs.links"
                :from="songs.from"
                :to="songs.to"
                :total="songs.total"
            />
        </div>
    </BreezeAuthenticatedLayout>
</template>

<script setup>
import { Head, Link, router } from "@inertiajs/vue3";
import { ref, computed } from "vue";
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import Button from "@/Components/Button.vue";
import SongCard from "@/Pages/Music/SongCard.vue";
import Pagination from "@/Components/Pagination.vue";

const props = defineProps({
    songs: Object,
    search: String,
    canSync: Boolean,
});

const searchQuery = ref(props.search || "");
const syncing = ref(false);

const search = () => {
    router.get(
        route("music.index"),
        {
            search: searchQuery.value || undefined,
        },
        {
            preserveState: true,
            replace: true,
        }
    );
};

const clearSearch = () => {
    searchQuery.value = "";
    router.get(
        route("music.index"),
        {},
        {
            preserveState: true,
            replace: true,
        }
    );
};

const syncPlaylist = () => {
    if (syncing.value) return;

    syncing.value = true;
    router.post(
        route("music.sync"),
        {},
        {
            onFinish: () => {
                syncing.value = false;
            },
        }
    );
};
</script>
