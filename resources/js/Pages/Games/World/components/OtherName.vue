<script setup>
// Someone else's name over their butt in the Games World (issue #174). Its
// box is anchored at the middle of its bottom edge: place it with `left` and
// `top` at the top of their head. The name is theirs, so it is only ever
// text.
defineProps({
    name: { type: String, required: true },
});
</script>

<template>
    <span class="other-name" aria-hidden="true">{{ name }}</span>
</template>

<style scoped>
.other-name {
    position: absolute;
    transform: translate(-50%, calc(-100% - 0.25rem));
    max-width: 10rem;
    overflow: hidden;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    background: rgb(0 0 0 / 0.55);
    color: #fff;
    font-size: 0.8125rem;
    font-weight: 600;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
    pointer-events: none;
}
</style>
