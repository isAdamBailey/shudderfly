<script setup>
import { Head } from "@inertiajs/vue3";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";

defineProps({
    appName: { type: String, default: "" },
});
const name = "Colin";
</script>

<template>
    <Head title="Rules" />

    <AuthenticatedLayout>
        <template #header>
            <h2 class="font-heading text-2xl text-gray-100 leading-tight">
                Rules of {{ appName }}
            </h2>
        </template>

        <div class="py-12">
            <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
                <div
                    class="p-6 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg"
                >
                    <h3 class="pb-2 text-xl">You're Special!</h3>
                    <ul class="pl-8 list-disc">
                        <li>
                            This is a place for {{ name }} to remember all the
                            things he has done!
                        </li>
                        <li>
                            Have fun, you are the only one on the internet who
                            can see your books, don't worry about personal
                            information.
                        </li>
                    </ul>
                    <h3 class="pt-5 pb-2 text-xl">Only Appropriate!</h3>
                    <ul class="pl-8 list-disc">
                        <li>
                            {{ appName }} is a place only for {{ name }}, but we
                            can't put any inappropriate pictures here.
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </AuthenticatedLayout>
</template>

<style scoped></style>
