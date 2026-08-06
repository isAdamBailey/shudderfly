<script setup>
import {
    ACTION_MENU_ITEM_ACTIVE_CLASS,
    ACTION_MENU_ITEM_CLASS,
} from "@/Components/actionMenuItem";
import { computed } from "vue";

const props = defineProps({
    icon: {
        type: String,
        default: "",
    },
    iconClass: {
        type: String,
        default: "",
    },
    label: {
        type: String,
        required: true,
    },
    active: {
        type: Boolean,
        default: false,
    },
    disabled: {
        type: Boolean,
        default: false,
    },
});

defineEmits(["click"]);

const buttonClass = computed(() => [
    ACTION_MENU_ITEM_CLASS,
    props.active ? ACTION_MENU_ITEM_ACTIVE_CLASS : "",
]);

const iconClasses = computed(() => [
    props.icon,
    props.active ? "text-white" : props.iconClass,
    "shrink-0 text-lg",
]);
</script>

<template>
    <button
        type="button"
        role="menuitem"
        :class="buttonClass"
        :disabled="disabled"
        @click="$emit('click', $event)"
    >
        <i v-if="icon" :class="iconClasses" aria-hidden="true"></i>
        {{ label }}
    </button>
</template>
