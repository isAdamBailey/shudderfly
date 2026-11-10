<script setup>
import { useTranslations } from "@/composables/useTranslations";
import { computed, nextTick, onMounted, ref, watch } from "vue";

// What the Butt can do, in the same panel as the invite picker. One other
// person here is picked, and a wiggle or a toot is aimed at that person only.
const props = defineProps({
    others: { type: Array, default: () => [] },
});

const emit = defineEmits(["wiggle", "toot", "close"]);

const { t } = useTranslations();

const picked = ref(null);
const panelRef = ref(null);

const target = computed(() =>
    props.others.find((person) => person.id === picked.value)
);

watch(
    () => props.others.map((person) => person.id).join("\0"),
    () => {
        if (props.others.some((person) => person.id === picked.value)) return;
        picked.value = props.others.length === 1 ? props.others[0].id : null;
    },
    { immediate: true }
);

onMounted(() => {
    nextTick(() => panelRef.value?.querySelector("input")?.focus());
});

function close() {
    emit("close");
}

function send(kind) {
    if (!target.value) return;
    emit(kind, target.value.id);
}
</script>

<template>
    <div
        id="butt-actions"
        ref="panelRef"
        class="butt-actions"
        role="dialog"
        aria-labelledby="butt-actions-title"
        @keydown.esc.stop.prevent="close"
    >
        <fieldset>
            <legend id="butt-actions-title" class="butt-actions-title">
                {{ t("games.world.actions") }}
            </legend>
            <p v-if="others.length === 0" class="butt-actions-hint">
                {{ t("games.world.roster_empty") }}
            </p>
            <label
                v-for="person in others"
                :key="person.id"
                class="butt-actions-pick"
            >
                <input
                    v-model="picked"
                    type="radio"
                    name="butt-target"
                    :value="person.id"
                />
                <span class="butt-actions-name">{{ person.name }}</span>
            </label>
        </fieldset>
        <div class="butt-actions-buttons">
            <button
                type="button"
                class="butt-actions-action"
                :disabled="!target"
                @click="send('wiggle')"
            >
                {{
                    target
                        ? t("games.world.wiggle_at", { name: target.name })
                        : t("games.world.wiggle")
                }}
            </button>
            <button
                type="button"
                class="butt-actions-action"
                :disabled="!target"
                @click="send('toot')"
            >
                {{
                    target
                        ? t("games.world.toot_at", { name: target.name })
                        : t("games.world.toot")
                }}
            </button>
            <button type="button" class="butt-actions-action" @click="close">
                {{ t("common.cancel") }}
            </button>
        </div>
    </div>
</template>

<style scoped>
/* The invite picker's panel: a dark list hung from its button. */
.butt-actions {
    width: 16rem;
    max-width: 100%;
    max-height: 50vh;
    overflow-y: auto;
    padding: 0.75rem;
    border-radius: 0.75rem;
    background: rgb(0 0 0 / 0.7);
    color: #fff;
    box-shadow: 0 2px 6px rgb(0 0 0 / 0.3);
}

.butt-actions-title {
    margin-bottom: 0.5rem;
    font-weight: 700;
}

.butt-actions-hint {
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    opacity: 0.85;
}

.butt-actions-pick {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    padding: 0.375rem 0;
}

.butt-actions-pick input {
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
}

.butt-actions-name {
    overflow: hidden;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.butt-actions-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.75rem;
}

.butt-actions-action {
    width: 100%;
    padding: 0.375rem 0.75rem;
    overflow: hidden;
    border-radius: 9999px;
    background: rgb(255 255 255 / 0.15);
    color: #fff;
    font-size: 0.8125rem;
    font-weight: 600;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.butt-actions-action:disabled {
    opacity: 0.5;
}

.butt-actions-action:hover:not(:disabled) {
    background: rgb(255 255 255 / 0.3);
}

.butt-actions-action:focus-visible,
.butt-actions-pick input:focus-visible {
    outline: 3px solid #1d4ed8;
    outline-offset: 2px;
}
</style>
