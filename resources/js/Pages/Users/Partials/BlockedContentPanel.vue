<script setup>
/* global route */
import ConfirmDialog from "@/Components/ConfirmDialog.vue";
import { useConfirmDialog } from "@/composables/useConfirmDialog";
import { useFlashMessage } from "@/composables/useFlashMessage";
import { usePermissions } from "@/composables/permissions";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
import { useUnblockAll } from "@/composables/useUnblockAll";
import { usePage } from "@inertiajs/vue3";
import axios from "axios";
import { computed, ref, watch } from "vue";

// After asking, the dialog refuses to re-submit for the rest of the calendar
// day so a normal user can't spam admins; it's allowed again at local
// midnight. The "request was honored" case needs no rule of its own: once an
// admin unblocks, blockedCount is 0 and the section shows the "nothing
// blocked" state instead.
const STORAGE_KEY_PREFIX = "unblockRequestedAt";

const CTA_CLASS =
    "inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-theme-title opacity-70 transition-opacity hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30";

const props = defineProps({
    blockedCount: { type: Number, default: 0 },
});

const { t } = useTranslations();
const { speak } = useSpeechSynthesis();
const { canEditPages } = usePermissions();
const { setFlashMessage } = useFlashMessage();
const {
    show: confirmShow,
    message: confirmMessage,
    ask: askConfirm,
    onConfirmed,
    onCancelled,
} = useConfirmDialog();

// localStorage throws outright in some privacy modes, and the cooldown is only
// a courtesy — losing it must never break the panel.
const safely = (fn, fallback = undefined) => {
    try {
        return fn();
    } catch {
        return fallback;
    }
};

// Per-user key: the server throttles per account, and this device may be shared.
const userId = usePage().props.auth?.user?.id ?? "anon";
const storageKey = `${STORAGE_KEY_PREFIX}:${userId}`;

const readStoredTimestamp = () =>
    safely(() => Number(localStorage.getItem(storageKey)) || 0, 0);

const writeStoredTimestamp = (value) =>
    safely(() => localStorage.setItem(storageKey, String(value)));

const clearStoredTimestamp = () =>
    safely(() => localStorage.removeItem(storageKey));

const requestedAt = ref(readStoredTimestamp());
const { submitting: unblocking, unblockAll } = useUnblockAll();
const submitting = ref(false);

const isSameLocalDay = (a, b) => {
    const da = new Date(a);
    const db = new Date(b);
    return (
        da.getFullYear() === db.getFullYear() &&
        da.getMonth() === db.getMonth() &&
        da.getDate() === db.getDate()
    );
};

// A plain function, not a computed: it must re-check the wall clock on every
// call (a tab left open past midnight should stop being "already asked"),
// and a computed would cache the first Date.now() forever since nothing else
// it reads is reactive.
const requestedToday = () =>
    requestedAt.value > 0 && isSameLocalDay(requestedAt.value, Date.now());

const nothingBlocked = computed(() => props.blockedCount === 0);

const statusText = computed(() => {
    if (nothingBlocked.value) return t("dashboard.blocked_none");
    return t("dashboard.request_unblock_limit");
});

// Once the content is unblocked the request has been honored, so a later block
// should start from a clean slate rather than inherit a stale cooldown.
watch(
    () => props.blockedCount,
    (count) => {
        if (count === 0) {
            requestedAt.value = 0;
            clearStoredTimestamp();
        }
    },
    { immediate: true }
);

const recordRequest = () => {
    const stamp = Date.now();
    requestedAt.value = stamp;
    writeStoredTimestamp(stamp);
};

// Speaks whatever the dialog is about to show, so a non-reader hears the same
// thing that's on screen rather than a separately-worded prompt.
const confirmAndSpeak = (message) => {
    speak(message);
    return askConfirm(message);
};

const confirmUnblockAll = async () => {
    if (unblocking.value || props.blockedCount === 0) return;
    const ok = await confirmAndSpeak(t("dashboard.unlock_all_confirm"));
    if (!ok) return;
    await unblockAll();
};

const requestUnblock = async () => {
    if (submitting.value || nothingBlocked.value) return;
    // Already asked today: say so and let the dialog's confirm button stay
    // disabled rather than silently hiding the whole panel until midnight.
    if (requestedToday()) {
        await confirmAndSpeak(t("dashboard.request_unblock_already_asked"));
        return;
    }
    const ok = await confirmAndSpeak(t("dashboard.request_unblock_confirm"));
    if (!ok) return;
    submitting.value = true;
    try {
        const { data } = await axios.post(
            route("unblock-requests.store"),
            {},
            { headers: { Accept: "application/json" } }
        );
        // Only start the cooldown once the request actually went out, so a
        // failed send doesn't lock the user out for an hour.
        if (data.sent) {
            recordRequest();
        }
        setFlashMessage(data.sent ? "success" : "info", data.message);
        speak(data.message);
    } catch (error) {
        // The server's throttle is looser than the client cooldown, so a user
        // who cleared storage can still be refused. Start the cooldown locally
        // so the UI stops disagreeing with the server, and say what happened.
        if (error?.response?.status === 429) {
            recordRequest();
            setFlashMessage("error", statusText.value);
        } else {
            setFlashMessage("error", t("dashboard.request_unblock_error"));
        }
    } finally {
        submitting.value = false;
    }
};
</script>

<template>
    <div class="inline-flex items-center">
        <ConfirmDialog
            v-model:show="confirmShow"
            :message="confirmMessage"
            confirm-variant="primary"
            :confirm-disabled="requestedToday()"
            @confirm="onConfirmed"
            @cancel="onCancelled"
        />

        <button
            v-if="canEditPages"
            type="button"
            :disabled="unblocking || blockedCount === 0"
            :aria-label="t('dashboard.unlock_all_blocked_pages_aria')"
            :class="CTA_CLASS"
            @click="confirmUnblockAll"
        >
            <i
                v-if="unblocking"
                class="ri-loader-line flex-shrink-0 animate-spin"
            ></i>
            <i v-else class="ri-lock-unlock-line flex-shrink-0"></i>
            {{ t("dashboard.unlock_all_blocked_pages") }} ({{ blockedCount }})
        </button>

        <button
            v-else
            type="button"
            :disabled="submitting || nothingBlocked"
            :title="statusText"
            :aria-label="t('dashboard.request_unblock_aria')"
            :class="CTA_CLASS"
            @click="requestUnblock"
        >
            <i
                v-if="submitting"
                class="ri-loader-line flex-shrink-0 animate-spin"
            ></i>
            <i v-else class="ri-hand-heart-line flex-shrink-0"></i>
            {{ t("dashboard.request_unblock") }} ({{ blockedCount }})
        </button>
    </div>
</template>
