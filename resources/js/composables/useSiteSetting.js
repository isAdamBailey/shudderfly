import { usePage } from "@inertiajs/vue3";
import { computed } from "vue";

// Boolean settings are shared from HandleInertiaRequests as the raw database
// value (a "0"/"1" string, not a real boolean), so a plain truthy check
// always passes — this is the strict form every boolean setting needs.
export function useSiteSetting(key) {
    return computed(() => {
        const value = usePage().props.settings?.[key];

        return value === "1" || value === 1 || value === true;
    });
}
