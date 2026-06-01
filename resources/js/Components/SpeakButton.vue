<script setup>
import { ref } from "vue";

defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
  ariaLabel: {
    type: String,
    required: true,
  },
  iconClass: {
    type: String,
    default: "ri-speak-fill text-xl",
  },
});

const emit = defineEmits(["click"]);

const tapping = ref(false);

function onPointerDown(event) {
  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }

  tapping.value = true;
}

function onPointerEnd() {
  tapping.value = false;
}
</script>

<template>
  <button
    type="button"
    :disabled="disabled"
    :aria-label="ariaLabel"
    class="speak-btn btn-bulge inline-flex shrink-0 items-center justify-center rounded-full border border-theme-primary bg-theme-primary p-2.5 text-theme-button shadow-sm transition-colors duration-150 ease-in-out hover:bg-theme-button hover:text-theme-button-hover active:bg-theme-button focus-visible:outline-none focus:border-theme-button focus:shadow-theme-button focus-visible:ring-2 focus-visible:ring-theme-primary disabled:cursor-not-allowed disabled:opacity-25 min-h-11 min-w-11"
    :class="{ 'btn-bulge--tap': tapping }"
    @pointerdown="onPointerDown"
    @pointerup="onPointerEnd"
    @pointercancel="onPointerEnd"
    @pointerleave="onPointerEnd"
    @click="emit('click', $event)"
  >
    <i
      :class="[
        iconClass,
        'transition-transform duration-150 ease-out',
        tapping ? 'scale-125' : '',
        disabled ? 'animate-pulse' : '',
      ]"
      aria-hidden="true"
    />
  </button>
</template>
