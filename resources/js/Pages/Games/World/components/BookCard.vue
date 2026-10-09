<script setup>
import { useTranslations } from "@/composables/useTranslations";
import { stripTags } from "@/utils/text";
import WorldCard from "./WorldCard.vue";

// A book from a Library shelf: its cover, title and excerpt, read aloud,
// with Read (the book's page) and Cancel. `book` is as books.category
// sends it. The cover is a plain <img>, so it needs nothing from WebGL.
const props = defineProps({
    book: { type: Object, required: true },
});

defineEmits(["cancel"]);

const { t } = useTranslations();

const titleId = `book-card-title-${props.book.id}`;
const cover = props.book.cover_image?.media_path;
// Without any markup, as the book's page speaks them.
const script = [props.book.title, props.book.excerpt]
    .filter(Boolean)
    .map(stripTags)
    .join(". ");
</script>

<template>
    <WorldCard
        :title-id="titleId"
        :script="script"
        :href="route('books.show', book.slug)"
        :action="t('games.world.read')"
        @cancel="$emit('cancel')"
    >
        <img
            v-if="cover"
            :src="cover"
            alt=""
            class="book-card-cover mx-auto max-h-[28vh] rounded-lg object-cover shadow-md"
        />
        <h2
            :id="titleId"
            class="font-heading mt-3 text-[clamp(1.35rem,5vmin,1.9rem)] font-black leading-tight tracking-wide text-theme-book-title"
        >
            {{ book.title }}
        </h2>
        <p
            v-if="book.excerpt"
            class="mt-2 text-[clamp(0.9rem,2.6vmin,1.05rem)] font-semibold leading-relaxed text-gray-700"
        >
            {{ book.excerpt }}
        </p>
    </WorldCard>
</template>
