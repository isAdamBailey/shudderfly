<script setup>
/* global route */
import ConfirmDialog from "@/Components/ConfirmDialog.vue";
import SpeakButton from "@/Components/SpeakButton.vue";
import { useConfirmDialog } from "@/composables/useConfirmDialog";
import { useFlashMessage } from "@/composables/useFlashMessage";
import { usePermissions } from "@/composables/permissions";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
import { useUnblockAll } from "@/composables/useUnblockAll";
import { usePage } from "@inertiajs/vue3";
import axios from "axios";
import { computed, onUnmounted, ref, watch } from "vue";

// After asking, the whole request section is hidden for the rest of the
// calendar day so a normal user can't spam admins; it reappears at local
// midnight. The "request was honored" case needs no rule of its own: once an
// admin unblocks, blockedCount is 0 and the section shows the "nothing
// blocked" state instead.
const TICK_MS = 30 * 1000;
const STORAGE_KEY_PREFIX = "unblockRequestedAt";

const CTA_CLASS =
    "btn-bulge inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md bg-amber-700 px-3 py-2.5 text-center text-sm font-semibold leading-tight text-amber-50 transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50";

const props = defineProps({
    blockedCount: { type: Number, default: 0 },
});

const { t } = useTranslations();
const { speak, speaking } = useSpeechSynthesis();
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
const storageKey = () =>
    `${STORAGE_KEY_PREFIX}:${usePage().props.auth?.user?.id ?? "anon"}`;

const readStoredTimestamp = () =>
    safely(() => Number(localStorage.getItem(storageKey())) || 0, 0);

const writeStoredTimestamp = (value) =>
    safely(() => localStorage.setItem(storageKey(), String(value)));

const clearStoredTimestamp = () =>
    safely(() => localStorage.removeItem(storageKey()));

const requestedAt = ref(readStoredTimestamp());
const now = ref(Date.now());
// Admins never confirm: clicking unblocks straight away.
const { submitting: unblocking, unblockAll } = useUnblockAll();
const submitting = ref(false);
let ticker = null;

const isSameLocalDay = (a, b) => {
    const da = new Date(a);
    const db = new Date(b);
    return (
        da.getFullYear() === db.getFullYear() &&
        da.getMonth() === db.getMonth() &&
        da.getDate() === db.getDate()
    );
};

const requestedToday = computed(
    () => requestedAt.value > 0 && isSameLocalDay(requestedAt.value, now.value)
);

// Only used to keep the ticker running until local midnight passes, so a tab
// left open overnight re-shows the section without a reload.
const cooldownRemaining = computed(() => {
    if (!requestedToday.value) return 0;
    const midnight = new Date(now.value);
    midnight.setHours(24, 0, 0, 0);
    return Math.max(0, midnight.getTime() - now.value);
});

const nothingBlocked = computed(() => props.blockedCount === 0);

const canRequest = computed(
    () => !nothingBlocked.value && !requestedToday.value
);

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

// Tick only while a cooldown is actually counting down: admins never read the
// countdown, and with no pending request there is nothing to advance.
const stopTicker = () => {
    if (ticker) {
        clearInterval(ticker);
        ticker = null;
    }
};

watch(
    () => !canEditPages.value && cooldownRemaining.value > 0,
    (counting) => {
        if (!counting) {
            stopTicker();
            return;
        }
        if (!ticker) {
            ticker = setInterval(() => {
                now.value = Date.now();
            }, TICK_MS);
        }
    },
    { immediate: true }
);

onUnmounted(stopTicker);

const recordRequest = () => {
    const stamp = Date.now();
    requestedAt.value = stamp;
    // The ticker is idle when nothing is counting down, so `now` can be hours
    // stale; refresh it here or the first check against midnight is nonsense.
    now.value = stamp;
    writeStoredTimestamp(stamp);
};

const requestUnblock = async () => {
    if (submitting.value || !canRequest.value) return;
    speak(t("dashboard.request_unblock_speak", { count: props.blockedCount }));
    const ok = await askConfirm(t("dashboard.request_unblock_confirm"));
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

const speakStatus = () => speak(statusText.value);
</script>

<template>
    <div class="w-full sm:flex-1">
        <ConfirmDialog
            v-model:show="confirmShow"
            :message="confirmMessage"
            confirm-variant="primary"
            @confirm="onConfirmed"
            @cancel="onCancelled"
        />

        <button
            v-if="canEditPages"
            type="button"
            :disabled="unblocking || blockedCount === 0"
            :aria-label="t('dashboard.unlock_all_blocked_pages_aria')"
            :class="CTA_CLASS"
            @click="unblockAll"
        >
            <i
                v-if="unblocking"
                class="ri-loader-line flex-shrink-0 animate-spin"
            ></i>
            <i v-else class="ri-lock-unlock-line flex-shrink-0"></i>
            {{ t("dashboard.unlock_all_blocked_pages") }} ({{ blockedCount }})
        </button>

        <template v-else-if="!requestedToday">
            <button
                type="button"
                :disabled="submitting || !canRequest"
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

            <div class="mt-1.5 flex items-center gap-1.5">
                <SpeakButton
                    :disabled="speaking"
                    :aria-label="t('dashboard.request_unblock_speak_status')"
                    icon-class="ri-speak-fill text-base"
                    @click.stop="speakStatus"
                />
                <p class="text-xs leading-tight text-amber-100/80">
                    {{ statusText }}
                </p>
            </div>
        </template>
    </div>
</template>
