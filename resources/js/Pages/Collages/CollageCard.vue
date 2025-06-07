<template>
    <div class="bg-white shadow rounded-lg p-4 flex flex-col space-y-2">
        <div class="grid grid-cols-2 gap-2 mb-3">
            <img
                v-for="page in collage.pages"
                :key="page.id"
                :src="page.media_path"
                class="w-full h-32 object-cover rounded"
                :alt="`Collage image ${page.id}`"
            />
        </div>
        <div class="flex flex-wrap gap-2">
            <button
                v-if="canEditPages"
                class="btn btn-secondary"
                :disabled="printForm.processing"
                @click="printForm.post(route('collages.print', collage.id))"
            >
                Print PDF
            </button>
            <button
                v-if="canEditPages"
                class="btn btn-secondary"
                :disabled="emailForm.processing"
                @click="emailForm.post(route('collages.email', collage.id))"
            >
                Email PDF
            </button>
            <button
                v-if="canEditPages"
                class="btn btn-danger"
                :disabled="deleteForm.processing"
                @click="
                    deleteForm.delete(route('collages.destroy', collage.id), {
                        preserveScroll: true,
                    })
                "
            >
                Delete Collage
            </button>
        </div>
        <div v-if="canEditPages" class="flex flex-wrap gap-1 mt-2">
            <slot name="add-to-collage" :collage="collage" />
        </div>
    </div>
</template>

<script setup>
import { usePermissions } from "@/composables/permissions";
import { useForm } from "@inertiajs/inertia-vue3";

const { canEditPages } = usePermissions();

const props = defineProps({
    collage: { type: Object, required: true },
});

const printForm = useForm();
const emailForm = useForm();
const deleteForm = useForm();
</script>
