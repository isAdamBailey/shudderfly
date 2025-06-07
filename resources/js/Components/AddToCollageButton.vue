<template>
    <button
        class="btn btn-primary"
        :disabled="form.processing"
        @click="
            form.post(route('collage-page.store'), {
                preserveScroll: true,
                onSuccess: () => form.reset(),
            })
        "
    >
        Add to Collage
    </button>
</template>

<script setup>
import { useForm } from "@inertiajs/inertia-vue3";

const props = defineProps({
    pageId: { type: Number, required: true },
    collageId: { type: Number, required: true },
});

const form = useForm({
    collage_id: props.collageId,
    page_id: props.pageId,
});
</script>
