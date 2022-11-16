import {computed} from "vue";
import {usePage} from "@inertiajs/inertia-vue3";

export function usePermissions() {
    const canEditPages = computed(() => {
        return usePage().props.value.auth.user.permissions_list.includes('edit pages');
    })

    return {canEditPages};
}