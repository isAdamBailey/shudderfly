<script setup>
import Close from "@/Components/svg/Close.vue";
import BreezeValidationErrors from "@/Components/ValidationErrors.vue";
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import CategoriesForm from "@/Pages/Dashboard/CategoriesForm.vue";
import StatsCard from "@/Pages/Dashboard/StatsCard.vue";
import UsersForm from "@/Pages/Dashboard/UsersForm.vue";
import { Head } from "@inertiajs/vue3";
import { ref } from "vue";

defineProps({
    users: { type: Object, required: true },
    stats: { type: Object, required: true },
    categories: { type: Object, required: true },
});

const firstClose = ref(false);
const lastClose = ref(false);

const buildTimestamp = __BUILD_TIMESTAMP__;
</script>

<template>
    <Head title="Admin" />

    <BreezeAuthenticatedLayout>
        <template #header>
            <h2
                class="font-heading text-2xl text-yellow-200 dark:text-gray-100 christmas:text-christmas-berry leading-tight"
            >
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
                <div class="w-full sm:px-6 lg:px-8">
                    <div
                        class="bg-white overflow-hidden shadow-sm sm:rounded-lg"
                    >
                        <div class="p-6 bg-white dark:bg-gray-800">
                            <h3
                                class="text-xl dark:text-gray-100 font-semibold border-b"
                            >
                                Categories
                            </h3>
                            <CategoriesForm :categories="categories" />
                        </div>
                    </div>
                </div>
                <div class="w-full sm:px-6 lg:px-8">
                    <div
                        class="bg-white overflow-hidden shadow-sm sm:rounded-lg"
                    >
                        <div class="p-6 bg-white dark:bg-gray-800">
                            <h3
                                class="text-xl dark:text-gray-100 font-semibold border-b"
                            >
                                Users
                            </h3>
                            <UsersForm :users="users" />
                        </div>
                    </div>
                </div>
                <div class="w-full sm:px-6 lg:px-8">
                    <div
                        class="bg-white overflow-hidden shadow-sm sm:rounded-lg"
                    >
                        <div class="p-6 bg-white dark:bg-gray-800">
                            <h3
                                class="text-xl dark:text-gray-100 font-semibold border-b"
                            >
                                Stats
                            </h3>
                            <StatsCard :stats="stats" />
                        </div>
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
