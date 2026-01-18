<script setup>
const props = defineProps({
    users: {
        type: Array,
        default: () => [],
    },
    selectedIndex: {
        type: Number,
        default: -1,
    },
    selectedUserId: {
        type: [Number, String],
        default: null,
    },
    showNone: {
        type: Boolean,
        default: false,
    },
    noneLabel: {
        type: String,
        default: "None",
    },
    noneSelected: {
        type: Boolean,
        default: false,
    },
    showAtSymbol: {
        type: Boolean,
        default: true,
    },
});

const emit = defineEmits(["select", "select-none"]);

const handleSelect = (user) => {
    if (!user) return;
    emit("select", user);
};

const handleSelectNone = () => {
    emit("select-none");
};

const isSelected = (user, index) => {
    if (props.selectedIndex >= 0) {
        return props.selectedIndex === index;
    }
    if (props.selectedUserId !== null && props.selectedUserId !== undefined) {
        return Number(props.selectedUserId) === Number(user.id);
    }
    return false;
};
</script>

<template>
    <div class="space-y-1">
        <button
            v-if="showNone"
            type="button"
            tabindex="0"
            class="w-full px-4 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700"
            :class="{
                'bg-gray-100 dark:bg-gray-700': noneSelected,
            }"
            @mousedown.prevent="handleSelectNone"
        >
            <span class="font-semibold text-gray-900 dark:text-gray-100">
                {{ noneLabel }}
            </span>
        </button>
        <button
            v-for="(user, index) in users"
            :key="user.id"
            type="button"
            tabindex="0"
            class="w-full px-4 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700"
            :class="{
                'bg-gray-100 dark:bg-gray-700': isSelected(user, index),
            }"
            @mousedown.prevent.stop="handleSelect(user)"
            @click.prevent.stop="handleSelect(user)"
        >
            <span class="font-semibold text-gray-900 dark:text-gray-100">
                <span v-if="showAtSymbol">@</span>{{ user.name }}
            </span>
        </button>
    </div>
</template>
