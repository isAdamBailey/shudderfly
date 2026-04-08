import { usePage } from "@inertiajs/vue3";
import { computed } from "vue";

export function useCollageMaxPages() {
    const page = usePage();

    return computed(() => {
        const n = Number(page.props.collageMaxPages);
        if (Number.isFinite(n) && n > 0) {
            return n;
        }
        return 16;
    });
}
