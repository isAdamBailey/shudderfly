<script setup>
/* global route */
import ConfirmDialog from "@/Components/ConfirmDialog.vue";
import { useConfirmDialog } from "@/composables/useConfirmDialog";
import { useFlashMessage } from "@/composables/useFlashMessage";
import { usePermissions } from "@/composables/permissions";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
import { useUnblockAll } from "@/composables/useUnblockAll";
import axios from "axios";
import { computed, ref } from "vue";

const CTA_CLASS =
    "inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-theme-title opacity-70 transition-opacity hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30";

const props = defineProps({
    blockedCount: { type: Number, default: 0 },
    // Whether the server has already logged an ask from this user today. It
    // owns the once-a-day rule, so the panel reads its answer rather than
    // keeping its own copy in a different clock.
    unblockAskedToday: { type: Boolean, default: false },
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

const { submitting: unblocking, unblockAll } = useUnblockAll();
const submitting = ref(false);

// Covers the gap between a successful post and the prop catching up, and the
// 429 a stale page can still earn.
const justAsked = ref(false);

const askedToday = computed(() => props.unblockAskedToday || justAsked.value);

// The CTA is rendered only when the ask would actually go through, so a child
// never sees a button that can't do anything: nothing to unblock, or today's
// ask already spent. Privileged users have no such limit.
const canRequest = computed(() => props.blockedCount > 0 && !askedToday.value);

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
    if (submitting.value || !canRequest.value) return;
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
        // failed send doesn't lock the user out for the day.
        if (data.sent) {
            justAsked.value = true;
        }
        setFlashMessage(data.sent ? "success" : "info", data.message);
        speak(data.message);
    } catch (error) {
        // Two different things return 429: the controller refusing a second
        // ask today, and the route's per-minute abuse cap. Only the former
        // carries `sent`, and only it means the day is used up — treating a
        // rate-limited retry as "already asked" would be a lie.
        if (error?.response?.data?.sent === false) {
            justAsked.value = true;
            setFlashMessage("error", t("dashboard.request_unblock_limit"));
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
            v-else-if="canRequest"
            type="button"
            :disabled="submitting"
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
