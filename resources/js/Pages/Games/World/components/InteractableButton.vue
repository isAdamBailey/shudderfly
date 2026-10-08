<script setup>
import { computed, ref } from "vue";

// One interactable in the WebGL world's DOM overlay (issue #130). WebGL has
// no buttons, so each thing you can visit is a real, transparent <button>
// laid over where the renderer draws it: it takes focus, Enter, clicks and a
// translated label like any button. The scene places it from the projection
// of the thing's feet (composables/projection.js); only its transform moves
// as the camera does.
const props = defineProps({
    /** Screen px of the drawn thing's feet (bottom centre). */
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    /** The drawn thing's size (it is square), px. The button is never
     * smaller than a tap target. */
    size: { type: Number, required: true },
    label: { type: String, required: true },
});

const MIN_TARGET = 48; // px

const el = ref(null);

const style = computed(() => {
    const size = Math.max(MIN_TARGET, props.size);
    return {
        width: `${size}px`,
        height: `${size}px`,
        transform: `translate3d(${props.x - size / 2}px, ${
            props.y - size
        }px, 0)`,
    };
});

defineExpose({
    focus: (options) => el.value?.focus(options),
});
</script>

<template>
    <button
        ref="el"
        type="button"
        class="interactable"
        :aria-label="label"
        :style="style"
    >
        <slot />
    </button>
</template>

<style scoped>
.interactable {
    position: absolute;
    left: 0;
    top: 0;
    pointer-events: auto;
    background: none;
    border: 0;
    padding: 0;
    cursor: pointer;
    will-change: transform;
}

.interactable:focus-visible {
    outline: 3px solid #1d4ed8;
    outline-offset: 4px;
    border-radius: 0.75rem;
}
</style>
