<template>
    <div>
        <h1 class="text-2xl font-bold mb-4">Collages</h1>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <CollageCard
                v-for="collage in collages"
                :key="collage.id"
                :collage="collage"
            />
        </div>
        <div v-if="canEditPages" class="mt-6">
            <button
                class="btn btn-primary"
                :disabled="createCollageForm.processing"
                @click="createCollageForm.post(route('collages.store'))"
            >
                + Create New Collage
            </button>
        </div>
    </div>
</template>

<script setup>
import { useForm } from "@inertiajs/inertia-vue3";

import { usePermissions } from "@/composables/permissions";
import CollageCard from "./CollageCard.vue";

const { canEditPages } = usePermissions();

const props = defineProps({
    collages: { type: Array, required: true },
});

const createCollageForm = useForm();
</script>
