import { computed } from "vue";
import { usePage } from "@inertiajs/vue3";

export function usePermissions() {
    const canEditPages = computed(() => {
        return usePage().props.auth.user.permissions_list.includes(
            "edit pages"
        );
    });

    return { canEditPages };
}
