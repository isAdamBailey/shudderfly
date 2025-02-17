<script setup>
import ApplicationLogo from "@/Components/ApplicationLogo.vue";
import Button from "@/Components/Button.vue";
import SearchInput from "@/Components/SearchInput.vue";
import { Head, Link } from "@inertiajs/vue3";
import { ref } from "vue";

const bookClicked = ref(false);
const name = "Colin";

defineProps({
    appName: { type: String, default: "" },
});
</script>

<template>
    <Head title="Welcome" />

    <div class="min-h-screen bg-gray-900 items-center">
        <div class="flex">
            <div
                class="container flex-col flex items-center px-6 py-4 md:py-20"
            >
                <div class="flex flex-col items-center w-full">
                    <div
                        class="border-4 border-gray-900 bg-blue-600 christmas:bg-christmas-holly p-10 rounded-lg"
                    >
                        <h1
                            class="text-5xl tracking-wide text-gray-100 christmas:text-christmas-gold md:text-7xl font-heading"
                        >
                            {{ appName }}
                        </h1>
                        <p
                            class="mt-10 text-gray-100 christmas:text-christmas-gold text-2xl font-bold"
                        >
                            <span
                                :class="
                                    bookClicked
                                        ? 'text-blue-600 dark:text-yellow-400 christmas:text-christmas-silver'
                                        : null
                                "
                                @click="bookClicked = !bookClicked"
                                >{{ name }}</span
                            >'s very own app to make books!
                        </p>
                        <div class="mt-12">
                            <div v-if="$page.props.auth.user">
                                <div class="flex justify-around">
                                    <Link :href="route('books.index')">
                                        <Button>Books</Button>
                                    </Link>
                                    <Link :href="route('pictures.index')">
                                        <Button> Uploads</Button>
                                    </Link>
                                </div>
                                <SearchInput
                                    class="mt-12"
                                    route-name="books.index"
                                    label="Books"
                                />
                            </div>
                            <div v-else class="flex justify-around">
                                <Link :href="route('login')">
                                    <Button> Log In</Button>
                                </Link>
                                <Link :href="route('register')">
                                    <Button> Register</Button>
                                </Link>
                            </div>
                            <div
                                class="w-full max-h-sm mt-10 max-w-sm cursor-pointer"
                                @click="bookClicked = !bookClicked"
                            >
                                <img
                                    v-if="bookClicked"
                                    height="400"
                                    width="321"
                                    src="/img/colin.png"
                                    :alt="`Picture of ${name}`"
                                    class="border-4 border-black rounded-full cover md:ml-5"
                                />
                                <ApplicationLogo v-else title="click me!" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
