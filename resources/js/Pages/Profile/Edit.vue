<script setup>
import Close from "@/Components/svg/Close.vue";
import { usePermissions } from "@/composables/permissions";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { Head, usePage } from "@inertiajs/vue3";
import { computed, onMounted, ref } from "vue";
import ContactAdminsForm from "./Partials/ContactAdminsForm.vue";
import DeleteUserForm from "./Partials/DeleteUserForm.vue";
import UpdatePasswordForm from "./Partials/UpdatePasswordForm.vue";
import UpdateProfileInformationForm from "./Partials/UpdateProfileInformationForm.vue";
import VoiceSettingsForm from "./Partials/VoiceSettingsForm.vue";

const { speak } = useSpeechSynthesis();
const { canEditProfile } = usePermissions();

const close = ref(false);

const title = computed(() => {
    return ` Hi ${
        usePage().props.auth.user.name
    }! We love you! Welcome to your profile page`;
});

onMounted(() => {
    speak(title.value);
});

const closeMessage = () => {
    speak("fart");
    close.value = true;
};

defineProps({
    mustVerifyEmail: Boolean,
    status: Boolean,
});
</script>

<template>
    <Head title="Profile" />

    <AuthenticatedLayout>
        <template #header>
            <h2
                class="font-heading text-4xl text-theme-title leading-tight"
            >
                Profile
            </h2>
        </template>

        <div class="py-10">
            <Transition>
                <div
                    v-if="!close"
                    class="mx-6 mb-3 p-6 flex justify-between bg-white dark:bg-gray-800 sm:rounded-lg"
                >
                    <h2
                        class="font-semibold text-lg text-gray-900 dark:text-gray-100 leading-tight w-3/4 md:w-full"
                    >
                        {{ title }} 😘❤️
                    </h2>
                    <Close
                        v-if="!close"
                        class="text-gray-900 dark:text-gray-100"
                        @click="closeMessage"
                    />
                </div>
            </Transition>
            <div class="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                <div
                    class="p-4 sm:p-8 bg-white dark:bg-gray-800 shadow sm:rounded-lg"
                >
                    <ContactAdminsForm />
                </div>
                <div
                    class="p-4 sm:p-8 bg-white dark:bg-gray-800 shadow sm:rounded-lg"
                >
                    <VoiceSettingsForm />
                </div>
                <div
                    v-if="canEditProfile"
                    class="p-4 sm:p-8 bg-white dark:bg-gray-800 shadow sm:rounded-lg"
                >
                    <UpdateProfileInformationForm
                        :must-verify-email="mustVerifyEmail"
                        :status="status"
                        class="max-w-xl"
                    />
                </div>

                <div
                    v-if="canEditProfile"
                    class="p-4 sm:p-8 bg-white dark:bg-gray-800 shadow sm:rounded-lg"
                >
                    <UpdatePasswordForm class="max-w-xl" />
                </div>

                <div
                    v-if="canEditProfile"
                    class="p-4 sm:p-8 bg-white dark:bg-gray-800 shadow sm:rounded-lg"
                >
                    <DeleteUserForm class="max-w-xl" />
                </div>
            </div>
        </div>
    </AuthenticatedLayout>
</template>
