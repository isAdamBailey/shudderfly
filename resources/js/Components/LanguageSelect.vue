<script setup>
import {
    computed,
    nextTick,
    onBeforeUnmount,
    onMounted,
    ref,
    watch,
} from "vue";

const props = defineProps({
    modelValue: {
        type: String,
        default: "",
    },
    options: {
        type: Array,
        required: true,
    },
    disabled: {
        type: Boolean,
        default: false,
    },
    labelledby: {
        type: String,
        default: undefined,
    },
});

const emit = defineEmits(["update:modelValue", "change"]);

const open = ref(false);
const activeIndex = ref(0);
const rootRef = ref(null);
const buttonRef = ref(null);
const listRef = ref(null);
const listboxId = `language-select-${Math.random().toString(36).slice(2, 9)}`;

const selectedIndex = computed(() => {
    const index = props.options.findIndex(
        (option) => option.value === props.modelValue
    );
    return index === -1 ? 0 : index;
});

const selectedOption = computed(() => props.options[selectedIndex.value]);

const optionId = (index) => `${listboxId}-option-${index}`;

async function openList() {
    if (props.disabled) {
        return;
    }

    open.value = true;
    activeIndex.value = selectedIndex.value;

    await nextTick();
    scrollActiveIntoView();
}

function closeList({ focusTrigger = true } = {}) {
    open.value = false;
    if (focusTrigger) {
        buttonRef.value?.focus();
    }
}

function toggleList() {
    if (open.value) {
        closeList();
    } else {
        openList();
    }
}

function selectIndex(index) {
    const option = props.options[index];
    if (!option) {
        return;
    }

    closeList();

    if (option.value !== props.modelValue) {
        emit("update:modelValue", option.value);
        emit("change", option.value);
    }
}

function scrollActiveIntoView() {
    const active = listRef.value?.querySelector('[data-active="true"]');
    active?.scrollIntoView?.({ block: "nearest" });
}

async function moveActive(delta) {
    if (!open.value) {
        await openList();
        return;
    }

    const count = props.options.length;
    activeIndex.value = (activeIndex.value + delta + count) % count;

    await nextTick();
    scrollActiveIntoView();
}

function onKeydown(event) {
    switch (event.key) {
        case "ArrowDown":
            event.preventDefault();
            moveActive(1);
            break;
        case "ArrowUp":
            event.preventDefault();
            moveActive(-1);
            break;
        case "Home":
            if (open.value) {
                event.preventDefault();
                activeIndex.value = 0;
            }
            break;
        case "End":
            if (open.value) {
                event.preventDefault();
                activeIndex.value = props.options.length - 1;
            }
            break;
        case "Enter":
        case " ":
            event.preventDefault();
            if (open.value) {
                selectIndex(activeIndex.value);
            } else {
                openList();
            }
            break;
        case "Escape":
            if (open.value) {
                event.preventDefault();
                closeList();
            }
            break;
        case "Tab":
            if (open.value) {
                closeList({ focusTrigger: false });
            }
            break;
    }
}

function onPointerDownOutside(event) {
    if (open.value && !rootRef.value?.contains(event.target)) {
        closeList({ focusTrigger: false });
    }
}

watch(
    () => props.disabled,
    (disabled) => {
        if (disabled && open.value) {
            closeList({ focusTrigger: false });
        }
    }
);

onMounted(() => document.addEventListener("pointerdown", onPointerDownOutside));
onBeforeUnmount(() =>
    document.removeEventListener("pointerdown", onPointerDownOutside)
);
</script>

<template>
    <div ref="rootRef" class="relative" @keydown="onKeydown">
        <button
            ref="buttonRef"
            type="button"
            role="combobox"
            :aria-expanded="open"
            :aria-controls="listboxId"
            :aria-labelledby="labelledby"
            :disabled="disabled"
            class="flex w-full items-center gap-3 min-h-11 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-left text-gray-900 dark:text-white shadow-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:opacity-60 disabled:cursor-not-allowed"
            @click="toggleList"
        >
            <span aria-hidden="true" class="text-2xl leading-none">{{
                selectedOption?.flag
            }}</span>
            <span class="flex-1 font-medium truncate">{{
                selectedOption?.label
            }}</span>
            <svg
                aria-hidden="true"
                class="h-5 w-5 shrink-0 text-gray-500 dark:text-gray-300 transition-transform"
                :class="{ 'rotate-180': open }"
                viewBox="0 0 20 20"
                fill="currentColor"
            >
                <path
                    fill-rule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clip-rule="evenodd"
                />
            </svg>
        </button>

        <transition
            enter-active-class="transition ease-out duration-150"
            enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition ease-in duration-100"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-1"
        >
            <ul
                v-show="open"
                :id="listboxId"
                ref="listRef"
                role="listbox"
                :aria-labelledby="labelledby"
                :aria-activedescendant="
                    open ? optionId(activeIndex) : undefined
                "
                class="absolute z-50 mt-2 w-full max-h-72 overflow-auto rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
            >
                <li
                    v-for="(option, index) in options"
                    :id="optionId(index)"
                    :key="option.value"
                    role="option"
                    :aria-selected="option.value === modelValue"
                    :data-active="index === activeIndex"
                    class="flex items-center gap-3 min-h-11 px-3 py-2 cursor-pointer text-gray-900 dark:text-white"
                    :class="
                        index === activeIndex
                            ? 'bg-blue-50 dark:bg-gray-600'
                            : ''
                    "
                    @click="selectIndex(index)"
                    @mousemove="activeIndex = index"
                >
                    <span aria-hidden="true" class="text-2xl leading-none">{{
                        option.flag
                    }}</span>
                    <span class="flex-1 font-medium truncate">{{
                        option.label
                    }}</span>
                    <svg
                        v-if="option.value === modelValue"
                        aria-hidden="true"
                        class="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                    >
                        <path
                            fill-rule="evenodd"
                            d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0l-3.5-3.5a1 1 0 111.4-1.4l2.8 2.79 6.8-6.79a1 1 0 011.4 0z"
                            clip-rule="evenodd"
                        />
                    </svg>
                </li>
            </ul>
        </transition>
    </div>
</template>
