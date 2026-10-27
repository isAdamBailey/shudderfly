<script setup>
import { useTranslations } from "@/composables/useTranslations";
import OtherName from "./OtherName.vue";

// Someone else in the Games World (issue #174): a button over them, their
// avatar and name over its top (issue #208), `lift` px higher (their walking
// bob), and anything drawn of them in the slot (the DOM road's butt).
// Tapping it follows them; the scene places it (class, style) and listens
// for the click.
defineProps({
    // { id, name, avatar }, as the world's presence members are.
    user: { type: Object, required: true },
    lift: { type: Number, default: 0 },
});

const { t } = useTranslations();
</script>

<template>
    <button
        type="button"
        class="other-button"
        :aria-label="t('games.world.follow_aria', { name: user.name })"
    >
        <OtherName :user="user" :style="{ left: '50%', top: `${-lift}px` }" />
        <slot />
    </button>
</template>

<style scoped>
.other-button {
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
}
</style>
