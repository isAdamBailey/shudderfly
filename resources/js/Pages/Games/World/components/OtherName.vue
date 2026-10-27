<script setup>
import Avatar from "@/Components/Avatar.vue";

// Someone else's name over their butt in the Games World (issue #174), after
// the avatar they have everywhere else in the app (issue #208): their preset
// or, with none picked, their initials. Its box is anchored at the middle of
// its bottom edge: place it with `left` and `top` at the top of their head.
// The name is theirs, so it is only ever text.
defineProps({
    // { id, name, avatar }, as the world's presence members are.
    user: { type: Object, required: true },
});
</script>

<template>
    <span class="other-name" aria-hidden="true">
        <Avatar :user="user" size="xs" />
        <span class="other-name-text">{{ user.name }}</span>
    </span>
</template>

<style scoped>
.other-name {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    transform: translate(-50%, calc(-100% - 0.25rem));
    max-width: 10rem;
    padding: 0.125rem 0.5rem 0.125rem 0.125rem;
    border-radius: 9999px;
    background: rgb(0 0 0 / 0.55);
    color: #fff;
    font-size: 0.8125rem;
    font-weight: 600;
    line-height: 1.25;
    white-space: nowrap;
    pointer-events: none;
}

.other-name-text {
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>
