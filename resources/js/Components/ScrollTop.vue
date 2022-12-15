<template>
    <div
        ref="scrollTopButton"
        class="invisible sticky bottom-0 flex w-full justify-end pb-3 pr-5 transition lg:pr-16"
    >
        <div
            class="bg-white bg-opacity-70 cursor-pointer rounded-full text-gray-700 transition hover:text-gray-500"
        >
            <button
                role="button"
                aria-label="scroll to top of the page"
                @click="scrollToTop"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="w-6 h-6"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M15 11.25l-3-3m0 0l-3 3m3-3v7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
            </button>
        </div>
    </div>
</template>

<script>
import debounce from "lodash/debounce";
import { defineComponent } from "vue";

export default defineComponent({
    data() {
        return {
            handleDebouncedScroll: null,
        };
    },
    mounted() {
        this.handleDebouncedScroll = debounce(this.handleScroll, 100);
        window.addEventListener("scroll", this.handleDebouncedScroll);
    },

    beforeUnmount() {
        window.removeEventListener("scroll", this.handleDebouncedScroll);
    },
    methods: {
        scrollToTop() {
            window.scrollTo({ top: 0, behavior: "smooth" });
        },
        handleScroll() {
            const scrollBtn = this.$refs.scrollTopButton;

            if (window.scrollY > 0) {
                scrollBtn.classList.remove("invisible");
            } else {
                scrollBtn.classList.add("invisible");
            }
        },
    },
});
</script>
