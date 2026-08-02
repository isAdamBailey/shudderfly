<script setup>
import Accordion from "@/Components/Accordion.vue";
import NotificationToggle from "@/Components/NotificationToggle.vue";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { usePermissions } from "@/composables/permissions";
import AvatarSelectionForm from "./Partials/AvatarSelectionForm.vue";
import DeleteUserForm from "./Partials/DeleteUserForm.vue";
import UpdatePasswordForm from "./Partials/UpdatePasswordForm.vue";
import UpdateProfileInformationForm from "./Partials/UpdateProfileInformationForm.vue";
import VoiceSettingsForm from "./Partials/VoiceSettingsForm.vue";
import { Head } from "@inertiajs/vue3";

defineProps({
    mustVerifyEmail: { type: Boolean, default: false },
    status: { type: Boolean, default: false },
});

const { canEditProfile } = usePermissions();
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
            <Accordion title="Avatar">
                <AvatarSelectionForm />
            </Accordion>
            <Accordion title="Voice">
                <VoiceSettingsForm />
            </Accordion>
            <Accordion title="Notifications">
                <NotificationToggle />
            </Accordion>
            <template v-if="canEditProfile">
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
            </template>
        </div>
    </AuthenticatedLayout>
</template>
