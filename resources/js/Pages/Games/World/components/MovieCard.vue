<script setup>
import { useTranslations } from "@/composables/useTranslations";
import WorldCard from "./WorldCard.vue";

// A favourite movie from the Library hall's movie rack: its poster and
// title, read aloud, with Watch (the movie on the Movies page) and Cancel.
// `movie` is as movie-cast.favorites.index sends it.
const props = defineProps({
    movie: { type: Object, required: true },
});

defineEmits(["cancel"]);

const { t } = useTranslations();

const titleId = `movie-card-title-${props.movie.id}`;
</script>

<template>
    <WorldCard
        :title-id="titleId"
        :script="movie.title"
        :href="
            route('movie-cast.index', { movieId: movie.id, title: movie.title })
        "
        :action="t('games.world.watch')"
        @cancel="$emit('cancel')"
    >
        <img
            v-if="movie.cover"
            :src="movie.cover"
            alt=""
            class="movie-card-poster mx-auto max-h-[32vh] rounded-lg object-cover shadow-md"
        />
        <h2
            :id="titleId"
            class="font-heading mt-3 text-[clamp(1.35rem,5vmin,1.9rem)] font-black leading-tight tracking-wide text-theme-book-title"
        >
            {{ movie.title }}
        </h2>
    </WorldCard>
</template>
