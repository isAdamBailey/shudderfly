<template>
  <Guest>
    <Head :title="status"/>
    <div class="py-20 px-10">
      <h2 class="text-3xl text-gray-700 dark:text-blue-500">{{ title }}</h2>
      <div class="text-xl text-gray-700 dark:text-gray-500">
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
import Guest from "@/Layouts/GuestLayout";
import Button from "@/Components/Button";
import {Link, Head} from "@inertiajs/inertia-vue3";
import {computed} from "vue";

const props = defineProps({
  status: Number,
})

const title = computed(() => {
  return {
    503: "503: Service Unavailable",
    500: "500: Server Error",
    404: "404: Page Not Found",
    403: "403: Forbidden",
  }[props.status];
})

const description = computed(() => {
  return {
    503: "Sorry, we are doing some maintenance. Please check back soon.",
    500: "Whoops, something went wrong on our servers.",
    404: "Sorry, the page you are looking for could not be found.",
    403: "Sorry, you are forbidden from accessing this page.",
  }[props.status];
})
</script>
