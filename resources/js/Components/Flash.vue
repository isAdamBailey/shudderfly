<script setup>
import { usePage } from "@inertiajs/vue3";
import { onMounted, ref, watch } from "vue";

const page = usePage();
const show = ref(true);

const close = () => {
    show.value = false;
};

watch(
    () => page.props.flash?.success,
    (newValue) => {
        if (newValue) {
            show.value = true;
            setTimeout(close, 5000);
        }
    }
);

onMounted(() => {
    if (page.props.flash?.success) {
        setTimeout(close, 5000);
    }
});
</script>

<template>
    <div
        v-if="show && page.props.flash?.success"
        class="fixed top-0 left-0 right-0 z-50"
    >
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div
                class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative shadow-lg"
                role="alert"
            >
                <span class="block sm:inline">{{
                    page.props.flash.success
                }}</span>
                <button
                    class="absolute top-0 right-0 px-4 py-3 focus:outline-none"
                    @click="close"
                >
                    <i class="ri-close-line text-lg"></i>
                </button>
            </div>
        </div>
    </div>
</template>
