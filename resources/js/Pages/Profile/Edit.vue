<script setup>
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import DeleteUserForm from "./Partials/DeleteUserForm.vue";
import UpdatePasswordForm from "./Partials/UpdatePasswordForm.vue";
import UpdateProfileInformationForm from "./Partials/UpdateProfileInformationForm.vue";
import ContactAdminsForm from "./Partials/ContactAdminsForm.vue";
import VoiceSettingsForm from "./Partials/VoiceSettingsForm.vue";
import { Head } from "@inertiajs/vue3";
import { usePermissions } from "@/composables/permissions";

const { canEditPages } = usePermissions();

defineProps({
    mustVerifyEmail: Boolean,
    status: Boolean,
});
</script>

<template>
    <Head title="Profile" />

    <AuthenticatedLayout>
        <template #header>
            <h2 class="font-bold text-2xl text-gray-100 leading-tight">
                Profile
            </h2>
        </template>

        <div class="py-10">
            <div class="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                <div
                    class="p-4 sm:p-8 bg-white dark:bg-gray-800 shadow sm:rounded-lg"
                >
                    <div
                        v-if="!canEditPages"
                        class="mb-10 text-gray-700 dark:text-gray-100"
                    >
                        Hi {{ $page.props.auth.user.name }}! Mommy and daddy
                        love you! 😘
                    </div>
                    <ContactAdminsForm />
                </div>
                <div
                    class="p-4 sm:p-8 bg-white dark:bg-gray-800 shadow sm:rounded-lg"
                >
                    <VoiceSettingsForm />
                </div>
                <div
                    v-if="canEditPages"
                    class="p-4 sm:p-8 bg-white dark:bg-gray-800 shadow sm:rounded-lg"
                >
                    <UpdateProfileInformationForm
                        :must-verify-email="mustVerifyEmail"
                        :status="status"
                        class="max-w-xl"
                    />
                </div>

                <div
                    v-if="canEditPages"
                    class="p-4 sm:p-8 bg-white dark:bg-gray-800 shadow sm:rounded-lg"
                >
                    <UpdatePasswordForm class="max-w-xl" />
                </div>

                <div
                    v-if="canEditPages"
                    class="p-4 sm:p-8 bg-white dark:bg-gray-800 shadow sm:rounded-lg"
                >
                    <DeleteUserForm class="max-w-xl" />
                </div>
            </div>
        </div>
    </AuthenticatedLayout>
</template>
