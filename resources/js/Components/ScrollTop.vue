<template>
    <div
        ref="scrollTopButton"
        class="invisible sticky bottom-0 flex w-full justify-end pb-3 pr-5 transition"
    >
        <div
            class="cursor-pointer bg-gray-50 rounded-full text-orange-800 transition hover:text-green-800 dark:text-purple-900 dark:hover:text-purple-500"
        >
            <button
                role="button"
                aria-label="scroll to top of the page"
                @click="scrollToTop"
            >
                <i class="ri-arrow-up-circle-line text-5xl"></i>
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import debounce from "lodash/debounce";

const scrollTopButton = ref(null);

const handleScroll = () => {
    if (window.scrollY > 0) {
        scrollTopButton.value.classList.remove("invisible");
    } else {
        scrollTopButton.value.classList.add("invisible");
    }
};

const handleDebouncedScroll = debounce(handleScroll, 100);

onMounted(() => {
    window.addEventListener("scroll", handleDebouncedScroll);
});

onBeforeUnmount(() => {
    window.removeEventListener("scroll", handleDebouncedScroll);
});

const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
};
</script>
