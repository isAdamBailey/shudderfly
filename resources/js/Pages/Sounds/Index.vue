<script setup>
import Button from "@/Components/Button.vue";
import ConfirmDialog from "@/Components/ConfirmDialog.vue";
import FloatingActionMenu from "@/Components/FloatingActionMenu.vue";
import ScrollTop from "@/Components/ScrollTop.vue";
import TextInput from "@/Components/TextInput.vue";
import { useConfirmDialog } from "@/composables/useConfirmDialog";
import { usePermissions } from "@/composables/permissions";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { Head, router, useForm } from "@inertiajs/vue3";
import { ref, watch, onBeforeUnmount } from "vue";

const props = defineProps({
    sounds: {
        type: Array,
        default: () => [],
    },
});

const { canEditPages } = usePermissions();
const { speak, stopSpeech } = useSpeechSynthesis();

// ── Audio playback ────────────────────────────────────────────────────────────
const playingId = ref(null);
let audioEl = null;

function handleAudioEnded() {
    stopAudio();
}

function stopAudio() {
    if (audioEl) {
        audioEl.removeEventListener("ended", handleAudioEnded);
        audioEl.pause();
        audioEl.src = "";
        audioEl = null;
    }
    playingId.value = null;
}

function toggleSound(sound) {
    if (playingId.value === sound.id) {
        stopAudio();
        return;
    }

    stopAudio();

    audioEl = new Audio(sound.audio_path);
    audioEl.preload = "none";
    audioEl.play().catch(() => {});
    audioEl.addEventListener("ended", handleAudioEnded);
    playingId.value = sound.id;
}

// ── Upload form ───────────────────────────────────────────────────────────────
const showUploadModal = ref(false);
const uploadForm = useForm({
    title: "",
    emoji: "",
    audio: null,
});
const audioFileInput = ref(null);

function openUploadModal() {
    uploadForm.reset();
    showUploadModal.value = true;
}

function closeUploadModal() {
    showUploadModal.value = false;
    uploadForm.reset();
    if (audioFileInput.value) audioFileInput.value.value = "";
}

function submitUpload() {
    uploadForm.post(route("sounds.store"), {
        forceFormData: true,
        onSuccess: () => {
            closeUploadModal();
        },
    });
}

function onAudioFileChange(e) {
    const file = e.target.files?.[0] ?? null;
    uploadForm.audio = file;
}

// ── Edit form ────────────────────────────────────────────────────────────────
const editingSound = ref(null);
const editForm = useForm({ title: "", emoji: "" });

function openEdit(sound) {
    editForm.title = sound.title;
    editForm.emoji = sound.emoji ?? "";
    editingSound.value = sound;
}

function closeEdit() {
    editingSound.value = null;
    editForm.reset();
}

function submitEdit() {
    editForm.put(route("sounds.update", editingSound.value.id), {
        onSuccess: () => {
            closeEdit();
        },
    });
}

// ── Delete ───────────────────────────────────────────────────────────────────
const {
    show: confirmShow,
    message: confirmMessage,
    title: confirmTitle,
    confirmLabel: confirmOkLabel,
    cancelLabel: confirmCancelLabel,
    confirmVariant,
    ask: askConfirm,
    onConfirmed: confirmOnOk,
    onCancelled: confirmOnCancel,
} = useConfirmDialog();

async function deleteSound(sound) {
    if (playingId.value === sound.id) stopAudio();

    const ok = await askConfirm(`Delete "${sound.title}"? This cannot be undone.`);
    if (!ok) return;

    router.delete(route("sounds.destroy", sound.id), {
        preserveScroll: true,
    });
}

const soundMenuOpenId = ref(null);

function toggleSoundMenu(soundId) {
    soundMenuOpenId.value =
        soundMenuOpenId.value === soundId ? null : soundId;
}

function speakTitleFromMenu(sound) {
    soundMenuOpenId.value = null;
    stopSpeech();
    speak(sound.title);
}

function openEditFromMenu(sound) {
    soundMenuOpenId.value = null;
    openEdit(sound);
}

async function deleteSoundFromMenu(sound) {
    soundMenuOpenId.value = null;
    await deleteSound(sound);
}

let soundMenuOutsideTeardown = null;

watch(soundMenuOpenId, (id) => {
    if (soundMenuOutsideTeardown) {
        soundMenuOutsideTeardown();
        soundMenuOutsideTeardown = null;
    }
    if (id === null) return;
    const onPointerDown = (e) => {
        const root = e.target.closest?.("[data-sound-menu-root]");
        if (root && Number(root.dataset.soundId) === id) return;
        soundMenuOpenId.value = null;
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    soundMenuOutsideTeardown = () =>
        document.removeEventListener("pointerdown", onPointerDown, true);
});

onBeforeUnmount(() => {
    stopAudio();
    soundMenuOutsideTeardown?.();
});
</script>

<template>
    <Head title="Sounds" />

    <AuthenticatedLayout>
        <template #header>
            <div class="flex items-center justify-between flex-wrap gap-3">
                <h2 class="font-heading text-2xl text-theme-title leading-tight">
                    Sounds
                </h2>
                <p class="text-gray-300 text-sm">
                    Tap a tile to play. Tap again to stop.
                </p>
            </div>
        </template>

        <div class="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <!-- Empty state -->
            <div
                v-if="sounds.length === 0"
                class="text-center py-16 text-gray-400 dark:text-gray-500"
            >
                <i class="ri-volume-mute-line text-5xl mb-4 block"></i>
                <p class="text-xl">No sounds yet.</p>
                <p v-if="canEditPages" class="mt-2 text-sm">
                    Use the menu below to upload the first sound.
                </p>
            </div>

            <!-- Sound grid -->
            <div
                v-else
                class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
            >
                <div
                    v-for="sound in sounds"
                    :key="sound.id"
                    class="relative"
                >
                    <button
                        type="button"
                        class="w-full flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-theme-primary min-h-[110px]"
                        :class="
                            playingId === sound.id
                                ? 'border-theme-primary bg-theme-primary/20 text-theme-primary shadow-lg scale-105'
                                : 'border-gray-600 bg-gray-800 hover:border-gray-400 hover:bg-gray-700 text-gray-100'
                        "
                        :aria-label="`${playingId === sound.id ? 'Stop' : 'Play'} ${sound.title}`"
                        :aria-pressed="playingId === sound.id"
                        @click="toggleSound(sound)"
                    >
                        <span class="text-4xl leading-none">
                            {{ sound.emoji || "🔊" }}
                        </span>
                        <span class="text-sm font-medium text-center leading-tight break-words w-full">
                            {{ sound.title }}
                        </span>
                        <i
                            v-if="playingId === sound.id"
                            class="ri-equalizer-line text-xl animate-pulse"
                            aria-hidden="true"
                        ></i>
                    </button>

                    <div
                        class="absolute top-1 right-1 z-20"
                        data-sound-menu-root
                        :data-sound-id="sound.id"
                        @click.stop
                    >
                        <button
                            type="button"
                            class="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full border border-gray-500/80 bg-gray-800/95 text-gray-200 shadow-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-theme-primary"
                            :aria-expanded="soundMenuOpenId === sound.id"
                            aria-haspopup="menu"
                            :aria-label="`More actions for ${sound.title}`"
                            @click.stop="toggleSoundMenu(sound.id)"
                        >
                            <i class="ri-more-2-fill text-2xl leading-none" aria-hidden="true"></i>
                        </button>
                        <div
                            v-if="soundMenuOpenId === sound.id"
                            class="absolute right-0 top-full z-30 mt-1 min-w-[12rem] overflow-hidden rounded-xl border border-gray-600 bg-gray-800 py-1 shadow-xl"
                            role="menu"
                        >
                            <button
                                type="button"
                                role="menuitem"
                                class="flex min-h-[52px] w-full touch-manipulation items-center gap-3 px-4 py-3 text-left text-base font-medium text-gray-100 active:bg-gray-700/80 hover:bg-gray-700"
                                @click="speakTitleFromMenu(sound)"
                            >
                                <i class="ri-speak-fill text-lg text-sky-400" aria-hidden="true"></i>
                                Speak title
                            </button>
                            <button
                                v-if="canEditPages"
                                type="button"
                                role="menuitem"
                                class="flex min-h-[52px] w-full touch-manipulation items-center gap-3 border-t border-gray-600/80 px-4 py-3 text-left text-base font-medium text-gray-100 active:bg-gray-700/80 hover:bg-gray-700"
                                @click="openEditFromMenu(sound)"
                            >
                                <i class="ri-pencil-line text-lg text-emerald-400" aria-hidden="true"></i>
                                Edit
                            </button>
                            <button
                                v-if="canEditPages"
                                type="button"
                                role="menuitem"
                                class="flex min-h-[52px] w-full touch-manipulation items-center gap-3 border-t border-gray-600/80 px-4 py-3 text-left text-base font-medium text-red-300 active:bg-gray-700/80 hover:bg-gray-700"
                                @click="deleteSoundFromMenu(sound)"
                            >
                                <i class="ri-delete-bin-line text-lg" aria-hidden="true"></i>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Floating action menu (admin only) -->
        <FloatingActionMenu v-if="canEditPages">
            <button
                type="button"
                class="flex min-h-[48px] w-full items-center border-b border-gray-200 px-5 py-4 text-left text-base text-gray-700 transition first:border-t-0 hover:bg-gray-200 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                @click="openUploadModal"
            >
                <i class="ri-upload-2-line mr-3 shrink-0 text-lg text-emerald-600 dark:text-emerald-400"></i>
                Upload Sound
            </button>
        </FloatingActionMenu>

        <ScrollTop />

        <!-- Upload modal -->
        <Teleport to="body">
            <div
                v-if="showUploadModal"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                @click.self="closeUploadModal"
            >
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
                    <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                        Upload Sound
                    </h3>

                    <div class="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-sm text-blue-700 dark:text-blue-300">
                        <i class="ri-information-line mr-1"></i>
                        Uploads are converted to <strong>M4A (AAC)</strong> on the server.
                        You can send MP3, WAV, OGG, or M4A; MP3 and other formats are normalized for Safari/iOS.
                    </div>

                    <form @submit.prevent="submitUpload" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Title <span class="text-red-500">*</span>
                            </label>
                            <TextInput
                                v-model="uploadForm.title"
                                type="text"
                                placeholder="e.g. Squeaky Fart"
                                class="w-full"
                                required
                            />
                            <p v-if="uploadForm.errors.title" class="mt-1 text-sm text-red-500">
                                {{ uploadForm.errors.title }}
                            </p>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Emoji (optional)
                            </label>
                            <TextInput
                                v-model="uploadForm.emoji"
                                type="text"
                                placeholder="e.g. 💨"
                                class="w-full"
                                maxlength="10"
                            />
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Audio File <span class="text-red-500">*</span>
                                <span class="text-xs text-gray-500 ml-1">(MP3, WAV, OGG, or M4A)</span>
                            </label>
                            <input
                                ref="audioFileInput"
                                type="file"
                                accept="audio/mpeg,audio/mp4,audio/aac,audio/x-m4a,.mp3,.m4a,.aac,.wav,.ogg"
                                class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-theme-primary file:text-white hover:file:opacity-80 cursor-pointer"
                                required
                                @change="onAudioFileChange"
                            />
                            <p v-if="uploadForm.errors.audio" class="mt-1 text-sm text-red-500">
                                {{ uploadForm.errors.audio }}
                            </p>
                        </div>

                        <div class="flex gap-3 pt-2">
                            <Button
                                type="submit"
                                :disabled="uploadForm.processing"
                                class="flex-1"
                            >
                                <i class="ri-upload-2-line mr-2"></i>
                                {{ uploadForm.processing ? "Uploading…" : "Upload" }}
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                @click="closeUploadModal"
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </Teleport>

        <!-- Edit modal -->
        <Teleport to="body">
            <div
                v-if="editingSound"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                @click.self="closeEdit"
            >
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
                    <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                        Edit Sound
                    </h3>

                    <form @submit.prevent="submitEdit" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Title <span class="text-red-500">*</span>
                            </label>
                            <TextInput
                                v-model="editForm.title"
                                type="text"
                                class="w-full"
                                required
                            />
                            <p v-if="editForm.errors.title" class="mt-1 text-sm text-red-500">
                                {{ editForm.errors.title }}
                            </p>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Emoji (optional)
                            </label>
                            <TextInput
                                v-model="editForm.emoji"
                                type="text"
                                placeholder="e.g. 💨"
                                class="w-full"
                                maxlength="10"
                            />
                        </div>

                        <div class="flex gap-3 pt-2">
                            <Button
                                type="submit"
                                :disabled="editForm.processing"
                                class="flex-1"
                            >
                                {{ editForm.processing ? "Saving…" : "Save" }}
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                @click="closeEdit"
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </Teleport>

        <!-- Confirm delete dialog -->
        <ConfirmDialog
            v-model:show="confirmShow"
            :title="confirmTitle"
            :message="confirmMessage"
            :confirm-label="confirmOkLabel || 'Delete'"
            :cancel-label="confirmCancelLabel || 'Cancel'"
            :confirm-variant="confirmVariant"
            @confirm="confirmOnOk"
            @cancel="confirmOnCancel"
        />
    </AuthenticatedLayout>
</template>
