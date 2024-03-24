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
            <h2
                class="font-semibold text-xl text-gray-800 dark:text-gray-100 leading-tight"
            >
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
                        <li>
                            Inappropriate means no naked people, no hurting
                            people, no hurting animals, no hurting the
                            environment, no hurting yourself.
                        </li>
                    </ul>
                    <h3 class="pt-5 pb-2 text-xl">Huge Farts!</h3>
                    <ul class="pl-8 list-disc">
                        <li>
                            Sometimes the videos take a long time to load! Be
                            patient if you want to see them.
                        </li>
                        <li>
                            We have to limit the size of what can be uploaded to
                            {{ appName }}. If you have a video that is too big,
                            you can use a video editor to make it smaller.
                        </li>
                    </ul>
                    <h3 class="pt-5 pb-2 text-xl">Stinky Names!</h3>
                    <ul class="pl-8 list-disc">
                        <li>
                            Poops are collections of farts. Farts are the
                            pictures and videos you upload.
                        </li>
                        <li>
                            If you search poops in the Poops page, you get all
                            poops with that word in the title or excerpt.
                        </li>
                        <li>
                            If you search farts in the Farts page, you get all
                            farts with that word in the fart page.
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </AuthenticatedLayout>
</template>

<style scoped></style>
