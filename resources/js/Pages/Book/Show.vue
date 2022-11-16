<template>
  <Head :title="book.title"/>

  <BreezeAuthenticatedLayout>
    <template #header>
      <Link :href="pages.first_page_url"
            class="w-full"
      >
        <div class="flex">
          <h2 class="font-semibold text-3xl text-gray-900 leading-tight">
            {{ book.title }} <span v-if="book.author" class="text-base text-gray-500">by: {{ book.author }}</span>
          </h2>
        </div>
      </Link>

    </template>

    <div v-if="canEditPages" class="flex mb-10 mt-5 mx-5">
      <div v-if="!settingsOpen" class="w-full">
        <Button @click="settingsOpen = true" class="w-full flex justify-center py-5 font-bold">
          Add Page / Edit Book
        </Button>
      </div>
      <div v-else class="w-full">
        <div>
          <BreezeValidationErrors class="mb-4"/>
        </div>
        <div class="flex flex-col md:flex-row justify-around">
          <NewPageForm @close-form="settingsOpen = false" :book="book"/>
          <EditForm :book="book"
                    :authors="authors"/>
        </div>
      </div>
    </div>

    <div class="flex justify-around mt-3" v-if="pages.total > 0">
      <p class="border border-gray-900 rounded-full w-8 h-8 text-sm text-center pt-1.5 bg-yellow-100 font-bold">
        {{ pages.from }}
      </p>
      <p v-if="pages.from !== pages.to"
         class="border border-gray-900 rounded-full w-8 h-8 text-sm text-center pt-1.5 bg-yellow-100 font-bold">
        {{ pages.to }}
      </p>
    </div>

    <div
        class="mx-auto grid max-w-7xl grid-cols-[repeat(auto-fit,minmax(22rem,1fr))] gap-2 pt-3 md:p-3"
    >
      <div v-for="page in pages.data" :key="pages.id" class="bg-yellow-100 overflow-hidden">
        <Page :page="page"/>
      </div>
    </div>
    <div v-if="pages.per_page < pages.total" class="flex justify-around pb-20 mt-5">
      <Link :href="pages.prev_page_url || pages.last_page_url"
            as="button"
            @click="prevButtonDisabled = true"
            :disabled="prevButtonDisabled"
            class="inline-flex border border-white items-center px-8 py-4 bg-blue-500 border border-transparent rounded-md text-white hover:bg-blue-700 active:bg-blue-900 focus:outline-none focus:border-blue-900 focus:shadow-outline-blue transition ease-in-out duration-150"
            aria-label="previous page">
        <ArrowIcon class="rotate-180"/>
      </Link>
      <Link :href="pages.next_page_url || pages.first_page_url"
            as="button"
            @click="nextButtonDisabled = true"
            :disabled="nextButtonDisabled"
            class="inline-flex border border-white items-center px-8 py-4 bg-blue-500 border border-transparent rounded-md text-white hover:bg-blue-700 active:bg-blue-900 focus:outline-none focus:border-blue-900 focus:shadow-outline-blue transition ease-in-out duration-150"
            aria-label="next page">
        <ArrowIcon/>
      </Link>
    </div>
  </BreezeAuthenticatedLayout>
</template>

<script setup>
import BreezeAuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import BreezeValidationErrors from '@/Components/ValidationErrors.vue';
import {Head, Link} from '@inertiajs/inertia-vue3';
import Button from "@/Components/Button";
import {onMounted, ref} from "vue";
import NewPageForm from "@/Pages/Book/NewPageForm";
import EditForm from "@/Pages/Book/EditBookForm";
import {usePermissions} from "@/permissions";
import Page from "@/Pages/Book/Page";
import ArrowIcon from '@/Components/svg/ArrowIcon';

const {canEditPages} = usePermissions();

const props = defineProps({
  book: Object,
  pages: Object,
  authors: Array
});

const prevButtonDisabled = ref(false)
const nextButtonDisabled = ref(false)
const beginningButtonDisabled = ref(false)
let settingsOpen = ref(false)

onMounted(() => {
  if (props.pages.total === 0) {
    settingsOpen.value = true
  }
})
</script>
