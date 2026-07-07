<script setup>
import Accordion from "@/Components/Accordion.vue";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import DeleteUserForm from "./Partials/DeleteUserForm.vue";
import UpdatePasswordForm from "./Partials/UpdatePasswordForm.vue";
import UpdateProfileInformationForm from "./Partials/UpdateProfileInformationForm.vue";
import { Head } from "@inertiajs/vue3";

defineProps({
    mustVerifyEmail: { type: Boolean, default: false },
    status: { type: Boolean, default: false },
});
</script>

<template>
    <Head title="Account" />

    <AuthenticatedLayout>
        <template #header>
            <h2 class="font-heading text-4xl text-theme-title leading-tight">
                Account
            </h2>
        </template>

        <div class="py-10 max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
            <Accordion title="Profile Information">
                <UpdateProfileInformationForm
                    :must-verify-email="mustVerifyEmail"
                    :status="status"
                    class="max-w-xl"
                />
            </Accordion>
            <Accordion title="Password">
                <UpdatePasswordForm class="max-w-xl" />
            </Accordion>
            <Accordion title="Delete Account">
                <DeleteUserForm class="max-w-xl" />
            </Accordion>
        </div>
    </AuthenticatedLayout>
</template>
