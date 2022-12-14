<script setup>
import BreezeButton from "@/Components/Button.vue";
import BreezeInput from "@/Components/TextInput.vue";
import BreezeLabel from "@/Components/InputLabel.vue";
import DeleteForm from "@/Pages/Book/DeleteBookForm.vue";
import { useForm } from "@inertiajs/inertia-vue3";
import TextArea from "@/Components/TextArea.vue";
import Multiselect from "@vueform/multiselect";
import { computed } from "vue";

const props = defineProps({
    book: Object,
    authors: Array,
});

const form = useForm({
    title: props.book.title,
    excerpt: props.book.excerpt,
    author: props.book.author,
});

const authorsOptions = computed(() => {
    return props.authors
        ? props.authors.map((author) => {
              return author.name;
          })
        : [];
});

const submit = () => {
    form.put(route("books.update", props.book.slug));
};
</script>

<template>
    <div class="bg-white dark:bg-gray-800 rounded p-5 md:w-1/4">
        <h3 class="text-2xl dark:text-gray-100 w-full border-b mb-7">
            Edit Book
        </h3>
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
                <div>
                    <BreezeLabel for="author" value="Author" />
                    <Multiselect
                        id="author"
                        v-model="form.author"
                        :options="authorsOptions"
                        placeholder="Author Name"
                    />
                </div>
            </div>

            <div>
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

            <div class="dark:text-white text-sm mt-3">
                Updating information here will also put the book at the top of
                the page
            </div>

            <div class="flex justify-center mt-4">
                <BreezeButton
                    class="w-3/4 py-3 flex justify-center"
                    :class="{ 'opacity-25': form.processing }"
                    :disabled="form.processing"
                >
                    Save
                </BreezeButton>
            </div>
        </form>
        <DeleteForm :book="book" />
    </div>
</template>

<style src="@vueform/multiselect/themes/default.css"></style>
