<template>
    <form class="text-center mt-10" @submit.prevent="submit">
        <DangerButton>Delete Fart</DangerButton>
    </form>
</template>

<script setup>
import DangerButton from "@/Components/DangerButton.vue";
import { useForm } from "@inertiajs/inertia-vue3";

const emit = defineEmits(["close-page-form"]);

const props = defineProps({
    page: { type: Object, required: true },
});

const form = useForm({});

const submit = () => {
    if (
        window.confirm(
            "Are you sure you want to delete this fart? The media will also be deleted."
        )
    ) {
        form.delete(route("pages.destroy", props.page), {
            onSuccess: () => {
                form.reset();
                emit("close-page-form");
            },
        });
    }
};
</script>
