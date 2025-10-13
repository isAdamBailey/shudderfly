<script setup>
import Accordion from "@/Components/Accordion.vue";
import Close from "@/Components/svg/Close.vue";
import BreezeValidationErrors from "@/Components/ValidationErrors.vue";
import { usePermissions } from "@/composables/permissions";
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import CategoriesForm from "@/Pages/Dashboard/CategoriesForm.vue";
import SettingsForm from "@/Pages/Dashboard/SettingsForm.vue";
import StatsCard from "@/Pages/Dashboard/StatsCard.vue";
import UsersForm from "@/Pages/Dashboard/UsersForm.vue";
import { Deferred, Head } from "@inertiajs/vue3";
import { ref } from "vue";

defineProps({
    users: { type: [Array, Function], default: () => [] },
    stats: { type: [Object, Function], default: () => ({}) },
    categories: { type: [Array, Function], default: () => [] },
    adminSettings: { type: Array, default: () => [] },
});

const firstClose = ref(false);
const lastClose = ref(false);

const buildTimestamp = __BUILD_TIMESTAMP__;

const { canAdmin } = usePermissions();
</script>

<template>
    <Head title="Admin" />

    <BreezeAuthenticatedLayout>
        <template #header>
            <h2 class="font-heading text-2xl text-theme-title leading-tight">
                The Administrative Duties Of Colin's Books!
            </h2>
        </template>

        <Transition>
            <div
                v-if="!lastClose"
                class="mx-6 mt-3 p-6 flex justify-between bg-white dark:bg-gray-800 sm:rounded-lg"
            >
                <h2
                    class="font-semibold text-lg text-gray-900 dark:text-gray-100 leading-tight w-3/4 md:w-full"
                >
                    <span v-if="!firstClose"
                        >Thank you so much {{ $page.props.auth.user.name }} for
                        helping with Colin's books. Colin and I love you for
                        it.</span
                    >
                    <span v-else>still love you.</span>
                </h2>
                <Close
                    v-if="!firstClose"
                    class="text-gray-900 dark:text-gray-100"
                    @click="firstClose = true"
                />
                <Close
                    v-if="firstClose && !lastClose"
                    class="text-gray-900 dark:text-gray-100"
                    @click="lastClose = true"
                />
            </div>
        </Transition>

        <div class="pb-12">
            <div class="flex justify-center mb-4">
                <BreezeValidationErrors />
            </div>

            <div class="flex flex-wrap justify-around space-y-2">
                <div v-if="canAdmin" class="w-full sm:px-6 lg:px-8">
                    <div
                        class="bg-white overflow-hidden shadow-sm sm:rounded-lg"
                    >
                        <Accordion title="Categories">
                            <Deferred data="categories">
                                <template #fallback>
                                    <div
                                        class="text-gray-900 dark:text-gray-100"
                                    >
                                        Loading...
                                    </div>
                                </template>
                                <CategoriesForm :categories="categories" />
                            </Deferred>
                        </Accordion>
                    </div>
                </div>
                <div v-if="canAdmin" class="w-full sm:px-6 lg:px-8">
                    <div
                        class="bg-white overflow-hidden shadow-sm sm:rounded-lg"
                    >
                        <Accordion title="Users">
                            <Deferred data="users">
                                <template #fallback>
                                    <div
                                        class="text-gray-900 dark:text-gray-100"
                                    >
                                        Loading...
                                    </div>
                                </template>
                                <UsersForm :users="users" />
                            </Deferred>
                        </Accordion>
                    </div>
                </div>

                <div v-if="canAdmin" class="w-full sm:px-6 lg:px-8">
                    <div
                        class="bg-white overflow-hidden shadow-sm sm:rounded-lg"
                    >
                        <Accordion title="Site Settings">
                            <SettingsForm :settings="adminSettings" />
                        </Accordion>
                    </div>
                </div>

                <div class="w-full sm:px-6 lg:px-8">
                    <div
                        class="bg-white overflow-hidden shadow-sm sm:rounded-lg"
                    >
                        <Accordion title="Site Statistics">
                            <Deferred data="stats">
                                <template #fallback>
                                    <div
                                        class="text-gray-900 dark:text-gray-100"
                                    >
                                        Loading...
                                    </div>
                                </template>
                                <StatsCard :stats="stats" />
                            </Deferred>
                        </Accordion>
                    </div>
                    <p class="ml-5 md:ml-0 font-bold mt-12 text-gray-100">
                        Last Deployment: {{ buildTimestamp }}
                    </p>
                </div>
            </div>
        </div>
    </BreezeAuthenticatedLayout>
</template>

<style scoped></style>
