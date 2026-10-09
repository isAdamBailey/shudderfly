<script setup>
import CastMember from "@/Components/Games/Cast/CastMember.vue";
import { useTranslations } from "@/composables/useTranslations";
import WorldCard from "./WorldCard.vue";

// A game's card: its landmark, name and description, read aloud, with Play
// and Cancel.
const props = defineProps({
    game: { type: Object, required: true },
});

defineEmits(["cancel"]);

const { t } = useTranslations();

const titleId = `game-confirm-title-${props.game.slug}`;
</script>

<template>
    <WorldCard
        :title-id="titleId"
        :script="`${game.name}. ${game.description}`"
        :href="route('games.show', game.slug)"
        :action="t('games.world.play')"
        @cancel="$emit('cancel')"
    >
        <div class="text-[clamp(3rem,14vmin,4.5rem)] leading-none">
            <CastMember v-if="game.cast" :id="game.cast" :move="null" />
            <template v-else>{{ game.landmark }}</template>
        </div>
        <h2
            :id="titleId"
            class="font-heading mt-1 text-[clamp(1.35rem,5vmin,1.9rem)] font-black leading-tight tracking-wide text-theme-book-title"
        >
            <span aria-hidden="true">{{ game.emoji }}</span>
            {{ game.name }}
        </h2>
        <p
            class="mt-2 text-[clamp(0.9rem,2.6vmin,1.05rem)] font-semibold leading-relaxed text-gray-700"
        >
            {{ game.description }}
        </p>
    </WorldCard>
</template>
