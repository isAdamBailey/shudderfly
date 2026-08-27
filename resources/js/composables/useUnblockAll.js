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

    const unblockAll = async () => {
        if (submitting.value) return false;
        submitting.value = true;
        try {
            const { data } = await axios.post(
                route("pages.unblock-all"),
                {},
                { headers: { Accept: "application/json" } }
            );
            setFlashMessage("success", data.message);

            // The bell is mounted on every page, but `blockedCount` is a prop of
            // the dashboard only — reloading it anywhere else re-runs a whole
            // page controller for nothing.
            if (usePage().props.blockedCount !== undefined) {
                router.reload({
                    only: ["blockedCount", "unblockAskedToday"],
                    preserveScroll: true,
                    async: true,
                });
            }
            return true;
        } catch {
            setFlashMessage("error", t("dashboard.request_unblock_error"));
            return false;
        } finally {
            submitting.value = false;
        }
    };

    return { submitting, unblockAll };
}
