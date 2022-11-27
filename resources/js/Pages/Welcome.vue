<script setup>
import { Head, Link } from "@inertiajs/inertia-vue3";
import ApplicationLogo from "@/Components/ApplicationLogo.vue";
import { usePermissions } from "@/permissions";
import Button from "@/Components/Button.vue";

const { canEditPages } = usePermissions();

defineProps({
    appName: String,
});
</script>

<template>
    <Head title="Welcome" />

    <div
        class="flex justify-center min-h-screen bg-gradient-to-r from-blue-500 dark:from-pink-500 dark:via-red-500 to-green-300 dark:to-yellow-500 items-center"
    >
        <div class="container flex-col md:flex-row flex px-6 py-4 md:py-20">
            <div class="flex flex-col items-center w-full md:flex-row md:w-3/4">
                <div
                    class="border-4 border-gray-900 bg-gradient-to-r from-white dark:from-gray-700 dark:via-gray-900 to-yellow-100 dark:to-black h-full p-10 rounded-lg"
                >
                    <h1
                        class="text-3xl tracking-wide text-gray-800 dark:text-gray-100 md:text-7xl font-bold"
                    >
                        {{ appName }}
                    </h1>
                    <p
                        class="mt-4 text-gray-300 dark:text-gray-100 text-2xl text-gray-600 font-bold"
                    >
                        Colin's very own "ShutterFly" app to save picture books!
                    </p>
                    <div class="mt-20">
                        <div v-if="$page.props.auth.user">
                            <Link :href="route('books.index')">
                                <Button> View Books </Button>
                            </Link>
                        </div>
                        <div v-else class="flex justify-around">
                            <Link :href="route('login')">
                                <Button> Log In </Button>
                            </Link>
                            <Link :href="route('register')">
                                <Button> Register </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div class="w-full mt-10 md:mt-0 max-w-sm">
                <ApplicationLogo />
            </div>
        </div>
    </div>
</template>
