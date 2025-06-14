<template>
    <Head title="Collages" />

    <AuthenticatedLayout>
        <template #header>
            <div class="flex justify-between items-center mb-3">
                <h2
                    class="font-heading text-2xl text-theme-title leading-tight"
                >
                    Collages
                </h2>
            </div>
        </template>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <CollageCard
                v-for="(collage, index) in collages"
                :key="collage.id"
                :collage="collage"
                :collage-number="index + 1"
            />
        </div>
        <div v-if="canEditPages" class="my-6">
            <Button
                :disabled="createCollageForm.processing"
                @click="createCollageForm.post(route('collages.store'))"
                ><i class="ri-add-line text-xl mr-3"></i>
                Create New Collage
            </Button>
        </div>
    </AuthenticatedLayout>
</template>

<script setup>
import Button from "@/Components/Button.vue";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { Head, useForm } from "@inertiajs/vue3";

import { usePermissions } from "@/composables/permissions";
import CollageCard from "@/Pages/Collages/CollageCard.vue";

const { canEditPages } = usePermissions();

defineProps({
    collages: { type: Array, required: true },
});

const createCollageForm = useForm();
</script>
