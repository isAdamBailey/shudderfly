<script setup>
import { useTranslations } from "@/composables/useTranslations";
import { computed, ref } from "vue";

// Who else is in the Games World right now, and where (issue #174): a
// button with how many, opening a list of names, each with the place
// they're in and a button to follow them there. While following, a chip
// says who and stops it. Names are other people's, so only ever text.
const props = defineProps({
    /** useWorldPresence's roster: [{ id, name, scene }] (you left out). */
    roster: { type: Array, required: true },
    /** The scene registry, for each place's name. */
    scenes: { type: Object, required: true },
    /** Who is being followed (useFollow's leader: one of `roster`), or
     * null. */
    leader: { type: Object, default: null },
});

const emit = defineEmits(["follow", "stop"]);

const { t } = useTranslations();

const open = ref(false);

const people = computed(() =>
    props.roster.map((person) => ({
        ...person,
        place:
            props.scenes[person.scene]?.label ??
            t("games.world.roster_arriving"),
        followed: person.id === props.leader?.id,
    }))
);

function follow(person) {
    emit("follow", person.id);
    open.value = false;
}
</script>

<template>
    <div class="world-roster">
        <button
            type="button"
            class="roster-toggle bg-theme-primary text-theme-button hover:bg-theme-button"
            :aria-expanded="open"
            aria-controls="world-roster-list"
            :aria-label="t('games.world.roster_aria', { count: people.length })"
            @click="open = !open"
        >
            <span aria-hidden="true">👥 {{ people.length }}</span>
        </button>

        <div v-if="leader && !open" class="roster-chip" role="status">
            <span class="roster-name">{{
                t("games.world.following", { name: leader.name })
            }}</span>
            <button
                type="button"
                class="roster-stop"
                :aria-label="t('games.world.stop_following')"
                @click="emit('stop')"
            >
                <span aria-hidden="true">✕</span>
            </button>
        </div>

        <div v-show="open" id="world-roster-list" class="roster-panel">
            <p class="roster-title">{{ t("games.world.roster_title") }}</p>
            <p v-if="people.length === 0" class="roster-empty">
                {{ t("games.world.roster_empty") }}
            </p>
            <ul v-else>
                <li v-for="person in people" :key="person.id">
                    <span class="roster-who">
                        <span class="roster-name">{{ person.name }}</span>
                        <span class="roster-place">{{ person.place }}</span>
                    </span>
                    <button
                        v-if="person.followed"
                        type="button"
                        class="roster-action"
                        @click="emit('stop')"
                    >
                        {{ t("games.world.stop_following") }}
                    </button>
                    <button
                        v-else
                        type="button"
                        class="roster-action"
                        :aria-label="
                            t('games.world.follow_aria', { name: person.name })
                        "
                        @click="follow(person)"
                    >
                        {{ t("games.world.follow") }}
                    </button>
                </li>
            </ul>
        </div>
    </div>
</template>

<style scoped>
/* Top right of the stage, across from the back button; under the veil. */
.world-roster {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
    max-width: calc(100% - 5.5rem);
}

.roster-toggle {
    min-width: 3rem;
    height: 3rem;
    padding: 0 0.875rem;
    border-radius: 9999px;
    font-size: 1.125rem;
    font-weight: 700;
    line-height: 1;
    box-shadow: 0 2px 6px rgb(0 0 0 / 0.3);
}

.roster-chip,
.roster-panel {
    border-radius: 0.75rem;
    background: rgb(0 0 0 / 0.7);
    color: #fff;
    box-shadow: 0 2px 6px rgb(0 0 0 / 0.3);
}

.roster-chip {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    max-width: 100%;
    padding: 0.25rem 0.25rem 0.25rem 0.75rem;
    font-size: 0.875rem;
    font-weight: 600;
}

.roster-panel {
    width: 16rem;
    max-width: 100%;
    max-height: 50vh;
    overflow-y: auto;
    padding: 0.75rem;
}

.roster-title {
    margin-bottom: 0.5rem;
    font-weight: 700;
}

.roster-empty {
    font-size: 0.875rem;
    opacity: 0.85;
}

.roster-panel li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.375rem 0;
}

.roster-panel li + li {
    border-top: 1px solid rgb(255 255 255 / 0.15);
}

.roster-who {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.roster-name,
.roster-place {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.roster-name {
    font-weight: 600;
}

.roster-place {
    font-size: 0.8125rem;
    opacity: 0.8;
}

.roster-action,
.roster-stop {
    flex-shrink: 0;
    border-radius: 9999px;
    background: rgb(255 255 255 / 0.15);
    color: #fff;
    font-size: 0.8125rem;
    font-weight: 600;
}

.roster-action {
    padding: 0.375rem 0.75rem;
}

.roster-stop {
    width: 2rem;
    height: 2rem;
}

.roster-action:hover,
.roster-stop:hover {
    background: rgb(255 255 255 / 0.3);
}

.roster-toggle:focus-visible,
.roster-action:focus-visible,
.roster-stop:focus-visible {
    outline: 3px solid #1d4ed8;
    outline-offset: 2px;
}
</style>
