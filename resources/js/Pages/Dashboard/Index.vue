<script setup>
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import BreezeValidationErrors from "@/Components/ValidationErrors.vue";
import { Head } from "@inertiajs/inertia-vue3";
import NewBookForm from "@/Pages/Dashboard/NewBookForm.vue";
import UsersForm from "@/Pages/Dashboard/UsersForm.vue";

const props = defineProps({
    users: Object,
});
</script>

<template>
    <Head title="Dashboard" />

    <BreezeAuthenticatedLayout>
        <template #header>
            <h2
                class="font-semibold text-3xl text-gray-900 dark:text-gray-100 leading-tight"
            >
                Dashboard
            </h2>
        </template>

        <div class="py-12">
            <div class="flex justify-center mb-4">
                <BreezeValidationErrors />
            </div>
            <div class="flex flex-wrap justify-around space-y-2 md:space-y-0">
                <div class="w-full md:w-1/2 sm:px-6 lg:px-8">
                    <div
                        class="bg-white overflow-hidden shadow-sm sm:rounded-lg"
                    >
                        <div class="p-6 bg-white border-b border-gray-200">
                            <h3 class="text-xl font-semibold border-b mb-10">
                                New Book
                            </h3>
                            <NewBookForm :authors="props.users.data" />
                        </div>
                    </div>
                </div>

                <div class="w-full md:w-1/2 sm:px-6 lg:px-8">
                    <div
                        class="bg-white overflow-hidden shadow-sm sm:rounded-lg"
                    >
                        <div class="p-6 bg-white border-b border-gray-200">
                            <h3 class="text-xl font-semibold border-b">
                                Users
                            </h3>
                            <UsersForm :users="users" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </BreezeAuthenticatedLayout>
</template>
