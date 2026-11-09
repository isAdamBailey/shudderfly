<script setup>
import ConfirmDialog from "@/Components/ConfirmDialog.vue";
import Modal from "@/Components/Modal.vue";
import ShareToChatButton from "@/Components/ShareToChatButton.vue";
import { useSiteSetting } from "@/composables/useSiteSetting";
import { useTranslations } from "@/composables/useTranslations";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { router, useForm } from "@inertiajs/vue3";

/* global route */

const props = defineProps({
    sounds: { type: Array, default: () => [] },
    canManage: { type: Boolean, default: false },
    blockingEnabled: { type: Boolean, default: false },
});
const emit = defineEmits(["cancel"]);

const { t } = useTranslations();
const soundsEnabled = useSiteSetting("sounds_enabled");
const search = ref("");
const playingId = ref(null);
const error = ref("");
const sounds = ref([...props.sounds]);
let audio = null;
const pendingBlock = ref(null);
const blockSubmitting = ref(false);
const pendingDelete = ref(null);
const uploadOpen = ref(false);
const editingId = ref(null);
const uploadFile = ref(null);
const uploadForm = useForm({ title: "", emoji: "", audio: null });
const editForm = useForm({ title: "", emoji: "" });
const titleId = "soundboard-title";
const editTitleId = "soundboard-edit-title";

watch(
    () => props.sounds,
    (nextSounds) => {
        sounds.value = [...nextSounds];
    }
);

const visibleSounds = computed(() => {
    const query = search.value.trim().toLocaleLowerCase();
    if (!query) return sounds.value;
    return sounds.value.filter((sound) =>
        sound.title.toLocaleLowerCase().includes(query)
    );
});
const editingSound = computed(
    () => sounds.value.find((sound) => sound.id === editingId.value) ?? null
);

function stopAudio() {
    if (audio) {
        audio.pause();
        audio.src = "";
        audio = null;
    }
    playingId.value = null;
}

async function toggleSound(sound) {
    error.value = "";
    if (playingId.value === sound.id) {
        stopAudio();
        return;
    }
    stopAudio();
    try {
        audio = new Audio(sound.audio_path);
        audio.preload = "none";
        audio.addEventListener("ended", stopAudio, { once: true });
        audio.addEventListener(
            "error",
            () => {
                error.value = t("soundboard.play_error");
                stopAudio();
            },
            { once: true }
        );
        await audio.play();
        playingId.value = sound.id;
    } catch {
        error.value = t("soundboard.play_error");
        stopAudio();
    }
}

function askToBlock(sound) {
    pendingBlock.value = sound;
}

function blockSound() {
    if (!pendingBlock.value || blockSubmitting.value) return;
    blockSubmitting.value = true;
    const sound = pendingBlock.value;
    if (playingId.value === sound.id) stopAudio();
    router.patch(
        route("sounds.block", sound.id),
        {},
        {
            preserveState: true,
            preserveScroll: true,
            only: ["flash"],
            onSuccess: () => {
                sounds.value = sounds.value.filter((item) => item.id !== sound.id);
                pendingBlock.value = null;
            },
            onFinish: () => {
                blockSubmitting.value = false;
            },
        }
    );
}

function openUpload() {
    uploadForm.reset();
    if (uploadFile.value) uploadFile.value.value = "";
    uploadOpen.value = true;
}

function onAudioFileChange(event) {
    uploadForm.audio = event.target.files?.[0] ?? null;
}

function submitUpload() {
    uploadForm.post(route("sounds.store"), {
        forceFormData: true,
        preserveState: true,
        preserveScroll: true,
        only: ["soundboardSounds", "flash"],
        onSuccess: () => {
            uploadOpen.value = false;
            uploadForm.reset();
            if (uploadFile.value) uploadFile.value.value = "";
        },
    });
}

function startEdit(sound) {
    editingId.value = sound.id;
    editForm.title = sound.title;
    editForm.emoji = sound.emoji ?? "";
}

function cancelEdit() {
    editingId.value = null;
    editForm.reset();
}

function submitEdit(sound) {
    editForm.put(route("sounds.update", sound.id), {
        preserveState: true,
        preserveScroll: true,
        only: ["soundboardSounds", "flash"],
        onSuccess: () => {
            sounds.value = sounds.value.map((item) =>
                item.id === sound.id
                    ? { ...item, title: editForm.title, emoji: editForm.emoji }
                    : item
            );
            cancelEdit();
        },
    });
}

function deleteSound() {
    const sound = pendingDelete.value;
    if (!sound) return;
    if (playingId.value === sound.id) stopAudio();
    router.delete(route("sounds.destroy", sound.id), {
        preserveState: true,
        preserveScroll: true,
        only: ["soundboardSounds", "flash"],
        onSuccess: () => {
            sounds.value = sounds.value.filter((item) => item.id !== sound.id);
            pendingDelete.value = null;
        },
    });
}

onBeforeUnmount(stopAudio);
</script>

<template>
    <Modal
        :show="true"
        max-width="4xl"
        :labelledby="titleId"
        @close="emit('cancel')"
    >
        <section class="soundboard-shell">
            <header class="soundboard-header">
                <div class="min-w-0">
                    <h2 :id="titleId" class="soundboard-title">
                        {{ t("soundboard.title") }}
                    </h2>
                </div>
                <button
                    type="button"
                    class="btn-bulge soundboard-close"
                    :aria-label="t('soundboard.close')"
                    @click="emit('cancel')"
                >
                    <i class="ri-close-line" aria-hidden="true"></i>
                </button>
            </header>

            <div class="soundboard-toolbar">
                <label class="soundboard-search">
                    <i class="ri-search-line" aria-hidden="true"></i>
                    <input
                        v-model="search"
                        type="search"
                        :placeholder="t('soundboard.search')"
                        :aria-label="t('soundboard.search')"
                    />
                </label>
                <button
                    v-if="canManage"
                    type="button"
                    class="btn-bulge soundboard-add"
                    @click="openUpload"
                >
                    <i class="ri-add-line" aria-hidden="true"></i>
                    {{ t("soundboard.add") }}
                </button>
            </div>

            <form
                v-if="canManage && uploadOpen"
                class="soundboard-upload"
                @submit.prevent="submitUpload"
            >
                <label>
                    <span>{{ t("soundboard.name_label") }}</span>
                    <input v-model="uploadForm.title" required maxlength="255" />
                    <small v-if="uploadForm.errors.title">{{ uploadForm.errors.title }}</small>
                </label>
                <label class="soundboard-emoji-field">
                    <span>{{ t("soundboard.emoji_label") }}</span>
                    <input v-model="uploadForm.emoji" maxlength="20" />
                    <small v-if="uploadForm.errors.emoji">{{ uploadForm.errors.emoji }}</small>
                </label>
                <label class="soundboard-file-field">
                    <span>{{ t("soundboard.file_label") }}</span>
                    <input
                        ref="uploadFile"
                        type="file"
                        accept="audio/*,.mp3,.m4a,.wav"
                        required
                        @change="onAudioFileChange"
                    />
                    <small v-if="uploadForm.errors.audio">{{ uploadForm.errors.audio }}</small>
                </label>
                <div class="soundboard-upload-actions">
                    <button type="button" class="btn-bulge soundboard-secondary" @click="uploadOpen = false">
                        {{ t("common.cancel") }}
                    </button>
                    <button type="submit" class="btn-bulge soundboard-submit" :disabled="uploadForm.processing">
                        {{ uploadForm.processing ? t("soundboard.uploading") : t("soundboard.upload") }}
                    </button>
                </div>
            </form>

            <p v-if="error" class="soundboard-error" role="alert">
                {{ error }}
            </p>

            <div v-if="!soundsEnabled" class="soundboard-empty">
                {{ t("sound.disabled") }}
            </div>
            <div v-else-if="visibleSounds.length" class="soundboard-grid">
                <article
                    v-for="sound in visibleSounds"
                    :key="sound.id"
                    class="soundboard-tile"
                    :class="{ 'is-playing': playingId === sound.id }"
                >
                    <button
                        type="button"
                        class="btn-bulge soundboard-play"
                        :disabled="!sound.audio_path"
                        :title="!sound.audio_path ? t('soundboard.not_ready') : undefined"
                        :aria-label="`${playingId === sound.id ? t('soundboard.stop') : t('soundboard.play')} ${sound.title}`"
                        :aria-pressed="playingId === sound.id"
                        @click="toggleSound(sound)"
                    >
                        <span class="soundboard-emoji" aria-hidden="true">
                            {{ sound.emoji || "🔊" }}
                        </span>
                        <span class="soundboard-name">{{ sound.title }}</span>
                        <i
                            :class="playingId === sound.id ? 'ri-stop-fill' : 'ri-play-fill'"
                            aria-hidden="true"
                        ></i>
                    </button>
                    <div class="soundboard-actions">
                        <ShareToChatButton
                            v-if="sound.audio_path"
                            kind="sound"
                            :sound-id="sound.id"
                            :preserve-world="true"
                            :wrapper-class="'soundboard-share'"
                        />
                        <button
                            v-if="blockingEnabled"
                            type="button"
                            class="btn-bulge soundboard-block"
                            :aria-label="t('soundboard.block_aria', { title: sound.title })"
                            :title="t('soundboard.block')"
                            @click="askToBlock(sound)"
                        >
                            <i class="ri-forbid-line" aria-hidden="true"></i>
                            <span>{{ t("soundboard.block") }}</span>
                        </button>
                        <template v-if="canManage">
                            <button
                                type="button"
                                class="btn-bulge soundboard-admin-action"
                                :aria-label="t('soundboard.edit_aria', { title: sound.title })"
                                :title="t('soundboard.edit')"
                                @click="startEdit(sound)"
                            >
                                <i class="ri-pencil-line" aria-hidden="true"></i>
                            </button>
                            <button
                                type="button"
                                class="btn-bulge soundboard-admin-action is-danger"
                                :aria-label="t('soundboard.delete_aria', { title: sound.title })"
                                :title="t('soundboard.delete')"
                                @click="pendingDelete = sound"
                            >
                                <i class="ri-delete-bin-line" aria-hidden="true"></i>
                            </button>
                        </template>
                    </div>
                </article>
            </div>
            <div v-else class="soundboard-empty">
                <i class="ri-volume-mute-line" aria-hidden="true"></i>
                <p>{{ search ? t("soundboard.no_matches") : t("soundboard.empty") }}</p>
            </div>

        </section>

        <ConfirmDialog
            :show="Boolean(pendingBlock)"
            :title="t('soundboard.block_title')"
            :message="t('sound.block_confirm_dialog')"
            :confirm-label="t('soundboard.block')"
            :confirm-disabled="blockSubmitting"
            confirm-variant="danger"
            @confirm="blockSound"
            @cancel="pendingBlock = null"
            @update:show="(show) => !show && (pendingBlock = null)"
        />
        <ConfirmDialog
            :show="Boolean(pendingDelete)"
            :title="t('soundboard.delete_title')"
            :message="t('soundboard.delete_message', { title: pendingDelete?.title ?? '' })"
            :confirm-label="t('soundboard.delete')"
            confirm-variant="danger"
            @confirm="deleteSound"
            @cancel="pendingDelete = null"
            @update:show="(show) => !show && (pendingDelete = null)"
        />
        <Modal
            :show="Boolean(editingSound)"
            max-width="md"
            :labelledby="editTitleId"
            @close="cancelEdit"
        >
            <form
                v-if="editingSound"
                class="soundboard-edit-dialog"
                @submit.prevent="submitEdit(editingSound)"
            >
                <h2 :id="editTitleId" class="soundboard-edit-title">
                    {{ t("soundboard.edit_title") }}
                </h2>
                <label>
                    <span>{{ t("soundboard.name_label") }}</span>
                    <input v-model="editForm.title" required maxlength="255" />
                    <small v-if="editForm.errors.title">{{ editForm.errors.title }}</small>
                </label>
                <label>
                    <span>{{ t("soundboard.emoji_label") }}</span>
                    <input v-model="editForm.emoji" maxlength="20" />
                    <small v-if="editForm.errors.emoji">{{ editForm.errors.emoji }}</small>
                </label>
                <div class="soundboard-edit-actions">
                    <button
                        type="button"
                        class="btn-bulge soundboard-secondary"
                        @click="cancelEdit"
                    >
                        {{ t("common.cancel") }}
                    </button>
                    <button
                        type="submit"
                        class="btn-bulge soundboard-submit"
                        :disabled="editForm.processing"
                    >
                        {{ t("soundboard.save") }}
                    </button>
                </div>
            </form>
        </Modal>
    </Modal>
</template>

<style scoped>
.soundboard-shell {
    max-height: min(88vh, 900px);
    overflow-y: auto;
    background: #111827;
    color: #f9fafb;
    scrollbar-color: #6b7280 #1f2937;
    scrollbar-width: thin;
}

.soundboard-header,
.soundboard-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.25rem;
}

.soundboard-header {
    border-bottom: 1px solid #374151;
    background: #172235;
}

.soundboard-title {
    color: #fcd34d;
    font-family: "Spicy Rice", "Nunito", sans-serif;
    font-size: 1.65rem;
    line-height: 1.2;
}

.soundboard-close {
    display: grid;
    width: 2.75rem;
    height: 2.75rem;
    flex: 0 0 auto;
    place-items: center;
    border: 1px solid #64748b;
    border-radius: 0.7rem;
    color: #f9fafb;
    font-size: 1.4rem;
}

.soundboard-toolbar {
    flex-wrap: wrap;
    background: #1f2937;
}

.soundboard-search {
    display: flex;
    min-width: min(100%, 18rem);
    min-height: 2.9rem;
    flex: 1 1 18rem;
    align-items: center;
    gap: 0.65rem;
    border: 1px solid #6b7280;
    border-radius: 0.65rem;
    background: #111827;
    padding: 0 0.8rem;
    color: #fcd34d;
}

.soundboard-search input {
    width: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    color: #f9fafb;
}

.soundboard-search:focus-within {
    outline: 2px solid #fbbf24;
    outline-offset: 2px;
}

.soundboard-search input::placeholder {
    color: #cbd5e1;
    opacity: 1;
}

.soundboard-add {
    display: inline-flex;
    min-height: 2.9rem;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border: 1px solid #64748b;
    border-radius: 0.65rem;
    padding: 0.5rem 0.85rem;
    color: #f9fafb;
    cursor: pointer;
}

.soundboard-upload {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.8rem;
    border-top: 1px solid #475569;
    background: #172235;
    padding: 1rem 1.25rem;
}

.soundboard-upload label,
.soundboard-edit-dialog label {
    display: grid;
    gap: 0.35rem;
    color: #f9fafb;
    font-size: 0.85rem;
    font-weight: 700;
}

.soundboard-upload input:not([type="file"]),
.soundboard-edit-dialog input {
    min-height: 2.75rem;
    border: 1px solid #64748b;
    border-radius: 0.5rem;
    background: #111827;
    padding: 0.5rem 0.65rem;
    color: #f9fafb;
}

.soundboard-upload input[type="file"] {
    min-height: 2.75rem;
    max-width: 100%;
    color: #f9fafb;
}

.soundboard-upload small,
.soundboard-edit-dialog small {
    color: #fecaca;
    font-weight: 500;
}

.soundboard-file-field,
.soundboard-upload-actions {
    grid-column: 1 / -1;
}

.soundboard-upload-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
}

.soundboard-edit-dialog {
    display: grid;
    gap: 1rem;
    background: #111827;
    padding: 1.4rem;
    color: #f9fafb;
}

.soundboard-edit-title {
    color: #fcd34d;
    font-family: "Spicy Rice", "Nunito", sans-serif;
    font-size: 1.35rem;
    line-height: 1.25;
}

.soundboard-edit-dialog label {
    display: grid;
    gap: 0.4rem;
    font-size: 0.9rem;
    font-weight: 700;
}

.soundboard-edit-dialog input {
    width: 100%;
    min-height: 2.9rem;
}

.soundboard-edit-dialog input:focus-visible {
    outline: 2px solid #fbbf24;
    outline-offset: 2px;
}

.soundboard-edit-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.65rem;
    padding-top: 0.25rem;
}

.soundboard-secondary,
.soundboard-submit {
    min-height: 2.75rem;
    border: 1px solid #64748b;
    border-radius: 0.55rem;
    padding: 0.45rem 0.85rem;
    color: #f9fafb;
}

.soundboard-secondary {
    background: #273449;
}

.soundboard-submit {
    border-color: #eab308;
    background: #854d0e;
}

.soundboard-submit:disabled {
    cursor: wait;
    opacity: 0.65;
}

.soundboard-error {
    margin: 0.75rem 1.25rem 0;
    border: 1px solid #f87171;
    border-radius: 0.6rem;
    background: #451a1a;
    padding: 0.65rem 0.8rem;
    color: #fee2e2;
}

.soundboard-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.8rem;
    padding: 1.1rem 1.25rem;
}

.soundboard-tile {
    min-width: 0;
    border: 1px solid #475569;
    border-radius: 0.85rem;
    background: #1f2937;
    overflow: visible;
}

.soundboard-tile.is-playing {
    border-color: #fbbf24;
    background: #2a3445;
}

.soundboard-play {
    display: flex;
    width: 100%;
    min-height: 5.2rem;
    align-items: center;
    gap: 0.65rem;
    border: 0;
    border-radius: 0.8rem 0.8rem 0 0;
    background: transparent;
    padding: 0.75rem;
    color: #f9fafb;
    text-align: left;
}

.soundboard-play:hover,
.soundboard-play:focus-visible {
    background: #374151;
}

.soundboard-play:focus-visible,
.soundboard-close:focus-visible,
.soundboard-add:focus-visible,
.soundboard-block:focus-visible,
.soundboard-admin-action:focus-visible,
.soundboard-secondary:focus-visible,
.soundboard-submit:focus-visible {
    outline: 2px solid #fbbf24;
    outline-offset: 2px;
}

.soundboard-play:disabled {
    cursor: not-allowed;
    opacity: 0.62;
}

.soundboard-play:disabled:hover {
    background: transparent;
}

.soundboard-emoji {
    flex: 0 0 auto;
    font-size: 1.8rem;
    line-height: 1;
}

.soundboard-name {
    flex: 1 1 auto;
    overflow-wrap: anywhere;
    font-size: 0.95rem;
    font-weight: 700;
    line-height: 1.25;
}

.soundboard-play > i:last-child {
    color: #fcd34d;
    font-size: 1.4rem;
}

.soundboard-actions {
    display: flex;
    min-height: 3.15rem;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5rem;
    border-top: 1px solid #475569;
    padding: 0.4rem 0.55rem;
}

.soundboard-share :deep(button) {
    min-width: 2.75rem;
    min-height: 2.75rem;
    border-color: #64748b;
    background: #273449;
    color: #f9fafb;
}

.soundboard-block {
    display: inline-flex;
    min-height: 2.75rem;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    border: 1px solid #64748b;
    border-radius: 0.5rem;
    background: #273449;
    padding: 0.45rem 0.65rem;
    color: #fca5a5;
    font-size: 0.8rem;
    font-weight: 700;
}

.soundboard-admin-action {
    display: grid;
    width: 2.75rem;
    min-height: 2.75rem;
    place-items: center;
    border: 1px solid #64748b;
    border-radius: 0.5rem;
    background: #273449;
    color: #e5e7eb;
    font-size: 1rem;
}

.soundboard-admin-action.is-danger {
    color: #fca5a5;
}

.soundboard-empty {
    display: grid;
    min-height: 12rem;
    place-content: center;
    gap: 0.6rem;
    padding: 1.5rem;
    color: #e5e7eb;
    text-align: center;
}

.soundboard-empty > i {
    color: #fcd34d;
    font-size: 2rem;
}

@media (min-width: 640px) {
    .soundboard-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1rem;
    }
}

@media (min-width: 900px) {
    .soundboard-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }
}

@media (max-width: 480px) {
    .soundboard-header,
    .soundboard-toolbar,
    .soundboard-grid {
        padding-left: 0.85rem;
        padding-right: 0.85rem;
    }

    .soundboard-grid {
        gap: 0.55rem;
    }

    .soundboard-actions {
        gap: 0.3rem;
        padding: 0.35rem;
    }

    .soundboard-block span {
        display: none;
    }
}
</style>
