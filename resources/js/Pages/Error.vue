<template>
    <Guest>
        <Head :title="status" />
        <LostMan v-if="status === 404" class="w-96 h-96"/>
        <NotAllowed v-if="status === 403" class="w-96 h-96"/>
        <div class="py-20 px-10">
            <h2 class="text-4xl text-gray-700 dark:text-orange-400">
              {{ title }}
            </h2>
            <div class="text-xl text-gray-700 dark:text-gray-100">
              {{ description }}
            </div>

            <div class="mt-10 flex justify-center">
              <Link :href="route('books.index')">
                <Button>Back</Button>
              </Link>
            </div>
          </div>
    </Guest>
</template>

<script setup>
import Guest from "@/Layouts/GuestLayout.vue";
import Button from "@/Components/Button.vue";
import { Link, Head } from "@inertiajs/inertia-vue3";
import { computed } from "vue";
import LostMan from "@/Components/svg/LostMan.vue";
import NotAllowed from "@/Components/svg/NotAllowed.vue";

const props = defineProps({
    status: Number,
});

const title = computed(() => {
    return {
        503: "503: Service Unavailable",
        500: "500: Server Error",
        404: "We couldn't find anything here.",
        403: "Private Property!",
    }[props.status];
});

const description = computed(() => {
    return {
        503: "Sorry, we are doing some maintenance. Please check back soon.",
        500: "Whoops, something went wrong on our servers.",
        404: "Now we're lost. Throughout the entire internet, this page does not exist",
        403: "Yeah, not a chance. This is not where you should be.",
    }[props.status];
});
</script>
