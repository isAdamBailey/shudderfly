import { router, usePage } from "@inertiajs/vue3";
import { onMounted, onUnmounted, ref } from "vue";

export function useInfiniteScroll(initialItems, paginationData) {
    const items = ref(
        initialItems.map((item) => ({ ...item, loading: false }))
    );
    const infiniteScrollRef = ref(null);
    const fetchedPages = new Set();
    let observer = null;
    const initialUrl = usePage().url;

    const fetchMore = () => {
        const nextPageUrl = paginationData.value.next_page_url;
        if (!nextPageUrl || fetchedPages.has(nextPageUrl)) {
            return;
        }

        fetchedPages.add(nextPageUrl);
        router.get(
            nextPageUrl,
            {},
            {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    window.history.replaceState({}, "", initialUrl);
                    const newItems = paginationData.value.data.map((item) => ({
                        ...item,
                        loading: false,
                    }));
                    items.value = [...items.value, ...newItems];
                },
            }
        );
    };

    function setItemLoading(item) {
        item.loading = true;
    }

    onMounted(() => {
        observer = new IntersectionObserver(
            (entries) =>
                entries.forEach((entry) => entry.isIntersecting && fetchMore()),
            { rootMargin: "0px 0px 500px 0px" }
        );

        if (infiniteScrollRef.value) {
            observer.observe(infiniteScrollRef.value);
        }
    });

    onUnmounted(() => {
        if (observer) {
            observer.disconnect();
        }
    });

    return {
        items,
        infiniteScrollRef,
        setItemLoading,
    };
}
