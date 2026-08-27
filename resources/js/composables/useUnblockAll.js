/* global route */
import { useFlashMessage } from "@/composables/useFlashMessage";
import { useTranslations } from "@/composables/useTranslations";
import { router, usePage } from "@inertiajs/vue3";
import axios from "axios";
import { ref } from "vue";

/**
 * The one definition of "an admin unblocks everything".
 *
 * Used from the dashboard panel and from the bell notification, which are on
 * different pages, so the endpoint, the flash copy, and the refresh all need to
 * stay in one place.
 */
export function useUnblockAll() {
    const { t } = useTranslations();
    const { setFlashMessage } = useFlashMessage();
    const submitting = ref(false);

    /**
     * @param {number|string|null} unblockRequestId The ask being honoured, when
     *   the unblock answers one. Scoping it to the row is what stops the same
     *   ask being honoured twice — from the emailed link and then the bell.
     * @returns {Promise<"unblocked"|"already-handled"|"failed">} What the
     *   server did. "already-handled" is not a failure, but nothing was
     *   unblocked — callers must not treat the two alike.
     */
    const unblockAll = async (unblockRequestId = null) => {
        if (submitting.value) return "failed";
        submitting.value = true;
        try {
            const url = unblockRequestId
                ? route("unblock-requests.unblock", unblockRequestId)
                : route("pages.unblock-all");
            const { data } = await axios.post(
                url,
                {},
                { headers: { Accept: "application/json" } }
            );
            setFlashMessage("success", data.message);

            // Unblocking deletes the outstanding unblock-request notifications,
            // so the bell badge is now stale wherever this was triggered from.
            // `blockedCount` is a dashboard prop only, though — asking for it
            // elsewhere re-runs a whole page controller for nothing.
            const props = ["unread_notifications_count"];
            if (usePage().props.blockedCount !== undefined) {
                props.push("blockedCount", "unblockAskedToday");
            }
            router.reload({
                only: props,
                preserveScroll: true,
                async: true,
            });
            return "unblocked";
        } catch (error) {
            // 409 means the ask was already honoured elsewhere. Nothing went
            // wrong and nothing changed, so it reads as a notice, not an
            // error — but nothing was unblocked either.
            if (error?.response?.status === 409) {
                setFlashMessage(
                    "info",
                    error.response.data?.message ??
                        t("unblock_request.already_handled_body")
                );
                return "already-handled";
            }
            setFlashMessage("error", t("dashboard.request_unblock_error"));
            return "failed";
        } finally {
            submitting.value = false;
        }
    };

    return { submitting, unblockAll };
}
