<template>
    <form class="text-center mt-10" @submit.prevent="submit">
        <DangerButton>Delete Book</DangerButton>
    </form>
</template>

<script setup>
import DangerButton from "@/Components/DangerButton.vue";
import { useForm } from "@inertiajs/vue3";

const props = defineProps({
    book: Object,
});

const form = useForm({});

const submit = () => {
    if (
        window.confirm(
            "Are you sure you want to delete this book and all its pages?"
        )
    ) {
        form.delete(route("books.destroy", props.book.slug));
    }
};
</script>
