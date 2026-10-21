<script setup>
import { useTranslations } from "@/composables/useTranslations";
import { computed, nextTick, ref } from "vue";

// Who else is in the Games World right now, and where (issue #174): a
// button with how many, opening a list of names, each with the place
// they're in and a button to follow them there. While following, a chip
// says who and stops it. Below the list, where messaging is on, inviting
// people into the place you're in: pick who, and they get a chat message
// linking here. Names are other people's, so only ever text.
const props = defineProps({
    /** useWorldPresence's roster: [{ id, name, scene }] (you left out). */
    roster: { type: Array, required: true },
    /** The scene registry, for each place's name. */
    scenes: { type: Object, required: true },
    /** Who is being followed (useFollow's leader: one of `roster`), or
     * null. */
    leader: { type: Object, default: null },
    /** Who can be invited ({ id, name }, you left out); none while
     * messaging is off. */
    invitees: { type: Array, default: () => [] },
    /** The name of the place you're in, which an invite brings them to. */
    place: { type: String, default: "" },
});

const emit = defineEmits(["follow", "stop", "invite"]);

const { t } = useTranslations();

const open = ref(false);
// Picking who to invite, in place of the list; the ids picked.
const inviting = ref(false);
const picked = ref([]);
const toggleEl = ref(null);
const inviteForm = ref(null);

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

function toggle() {
    open.value = !open.value;
    inviting.value = false;
}

// The button pressed goes away, so focus moves on with it: to the first
// name to pick, and back to the toggle after.
async function startInviting() {
    picked.value = [];
    inviting.value = true;
    await nextTick();
    inviteForm.value?.querySelector("input")?.focus();
}

function stopInviting() {
    inviting.value = false;
    toggleEl.value?.focus();
}

function invite() {
    emit("invite", [...picked.value]);
    open.value = false;
    stopInviting();
}
</script>

<template>
    <div class="world-roster">
        <button
            ref="toggleEl"
            type="button"
            class="roster-toggle bg-theme-primary text-theme-button hover:bg-theme-button"
            :aria-expanded="open"
            aria-controls="world-roster-list"
            :aria-label="t('games.world.roster_aria', { count: people.length })"
            @click="toggle"
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

        <!-- Escape closes the picker, not the room behind it. -->
        <form
            v-if="open && inviting"
            ref="inviteForm"
            class="roster-panel"
            @submit.prevent="invite"
            @keydown.escape.stop="stopInviting"
        >
            <fieldset>
                <legend class="roster-title">
                    {{ t("games.world.invite_title", { place }) }}
                </legend>
                <label
                    v-for="person in invitees"
                    :key="person.id"
                    class="roster-pick"
                >
                    <input
                        v-model="picked"
                        type="checkbox"
                        :value="person.id"
                    />
                    <span class="roster-name">{{ person.name }}</span>
                </label>
            </fieldset>
            <div class="roster-buttons">
                <button
                    type="button"
                    class="roster-action"
                    @click="stopInviting"
                >
                    {{ t("common.cancel") }}
                </button>
                <button
                    type="submit"
                    class="roster-action"
                    :disabled="picked.length === 0"
                >
                    {{ t("games.world.invite_send") }}
                </button>
            </div>
        </form>

        <div
            v-show="open && !inviting"
            id="world-roster-list"
            class="roster-panel"
        >
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
            <button
                v-if="invitees.length"
                type="button"
                class="roster-action roster-invite"
                @click="startInviting"
            >
                {{ t("games.world.invite") }}
            </button>
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

.roster-action:disabled {
    opacity: 0.5;
}

.roster-invite {
    width: 100%;
    margin-top: 0.75rem;
}

.roster-pick {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    padding: 0.375rem 0;
}

.roster-pick input {
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
}

.roster-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.75rem;
}

.roster-stop {
    width: 2rem;
    height: 2rem;
}

.roster-action:hover:not(:disabled),
.roster-stop:hover {
    background: rgb(255 255 255 / 0.3);
}

.roster-toggle:focus-visible,
.roster-action:focus-visible,
.roster-stop:focus-visible,
.roster-pick input:focus-visible {
    outline: 3px solid #1d4ed8;
    outline-offset: 2px;
}
</style>
