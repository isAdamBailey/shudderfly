<script setup>
import { Link } from "@inertiajs/vue3";
import { ref } from "vue";

const props = defineProps({
  href: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: ""
  },
  active: {
    type: Boolean,
    default: false
  },
  method: {
    type: String,
    default: undefined
  },
  as: {
    type: String,
    default: undefined
  },
  useActiveStyle: {
    type: Boolean,
    default: true
  }
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
  <Link
    :href="props.href"
    :method="props.method"
    :as="props.as"
    class="btn-bulge flex min-h-14 items-center gap-3 rounded-xl border px-4 py-2 text-lg font-heading transition-colors duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200"
    :class="[
      props.useActiveStyle
        ? props.active
          ? 'border-yellow-400 bg-yellow-200 text-gray-900 dark:border-yellow-200'
          : 'border-gray-200 bg-gray-100 text-gray-900 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700'
        : 'border-gray-200 bg-gray-100 text-gray-900 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700',
      { 'btn-bulge--tap': tapping }
    ]"
    :aria-current="props.active ? 'page' : undefined"
    @pointerdown="onPointerDown"
    @pointerup="onPointerEnd"
    @pointercancel="onPointerEnd"
    @pointerleave="onPointerEnd"
    @click="emit('click')"
  >
    <i v-if="props.icon" :class="[props.icon, 'text-xl']" aria-hidden="true"></i>
    <span>{{ props.label }}</span>
  </Link>
</template>
