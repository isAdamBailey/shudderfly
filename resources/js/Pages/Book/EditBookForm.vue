<script setup>
/* eslint-disable no-undef */
import Accordion from "@/Components/Accordion.vue";
import BreezeButton from "@/Components/Button.vue";
import BreezeLabel from "@/Components/InputLabel.vue";
import MapPicker from "@/Components/Map/MapPicker.vue";
import TextArea from "@/Components/TextArea.vue";
import BreezeInput from "@/Components/TextInput.vue";
import DeleteForm from "@/Pages/Book/DeleteBookForm.vue";
import { useForm, usePage } from "@inertiajs/vue3";
import Multiselect from "@vueform/multiselect";
import { computed } from "vue";

const props = defineProps({
  book: { type: Object, required: true },
  authors: { type: Array, required: true }
});

const emit = defineEmits(["close-form"]);

const form = useForm({
  title: props.book.title,
  excerpt: props.book.excerpt,
  author: props.book.author,
  category_id: props.book.category_id,
  latitude: props.book.latitude ?? null,
  longitude: props.book.longitude ?? null
});

const authorsOptions = computed(() => {
  return props.authors
    ? props.authors.map((author) => {
        return author.name;
      })
    : [];
});

const categoriesOptions = computed(() => {
  return usePage().props.categories
    ? usePage().props.categories.map((category) => {
        return { value: category.id, label: category.name };
      })
    : [];
});

const submit = () => {
  form.put(route("books.update", props.book.slug), {
    onSuccess: () => {
      form.reset();
      emit("close-form");
    }
  });
};
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded p-5 m-5 md:w-full">
    <h3 class="text-2xl dark:text-gray-100 w-full border-b mb-7">Edit Book</h3>
    <form @submit.prevent="submit">
      <div class="flex flex-col">
        <div class="mr-3">
          <BreezeLabel for="title" value="Title" />
          <BreezeInput
            id="title"
            v-model="form.title"
            type="text"
            class="mt-1 block w-full"
            required
            autocomplete="title"
          />
        </div>
        <div class="mt-4">
          <BreezeLabel for="author" value="Author" />
          <Multiselect
            id="author"
            v-model="form.author"
            :options="authorsOptions"
            placeholder="Author Name"
          />
        </div>
        <div class="mt-4">
          <BreezeLabel for="category" value="Category" />
          <Multiselect
            id="category"
            v-model="form.category_id"
            :options="categoriesOptions"
            track-by="value"
            placeholder="Category"
          />
        </div>
      </div>

      <div class="mt-4">
        <BreezeLabel for="excerpt" value="Excerpt" />
        <TextArea
          id="excerpt"
          v-model="form.excerpt"
          type="text"
          class="mt-1 block w-full"
          size="sm"
          autocomplete="excerpt"
        />
      </div>

      <div class="mt-4">
        <Accordion title="Location">
          <MapPicker
            v-model:latitude="form.latitude"
            v-model:longitude="form.longitude"
          />
        </Accordion>
      </div>

      <div class="flex justify-center mt-4">
        <BreezeButton
          class="w-3/4 py-3 flex justify-center"
          :class="{ 'opacity-25': form.processing }"
          :disabled="form.processing"
        >
          Update Book
        </BreezeButton>
      </div>
    </form>
    <DeleteForm :book="book" />
  </div>
</template>

<style src="@vueform/multiselect/themes/default.css"></style>
