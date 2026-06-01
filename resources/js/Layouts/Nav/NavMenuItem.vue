<script setup>
import { Link } from "@inertiajs/vue3";

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
</script>

<template>
  <Link
    :href="props.href"
    :method="props.method"
    :as="props.as"
    class="flex min-h-14 items-center gap-3 rounded-xl border px-4 py-2 text-lg font-heading transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200"
    :class="
      props.useActiveStyle
        ? props.active
          ? 'border-yellow-200 bg-yellow-200 text-gray-900'
          : 'border-gray-700 bg-gray-800 text-gray-100 hover:bg-gray-700'
        : 'border-gray-700 bg-gray-800 text-gray-100 hover:bg-gray-700'
    "
    :aria-current="props.active ? 'page' : undefined"
    @click="emit('click')"
  >
    <i v-if="props.icon" :class="[props.icon, 'text-xl']" aria-hidden="true"></i>
    <span>{{ props.label }}</span>
  </Link>
</template>
