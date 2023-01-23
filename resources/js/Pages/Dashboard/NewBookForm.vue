<script setup>
import BreezeButton from "@/Components/Button.vue";
import BreezeInput from "@/Components/TextInput.vue";
import BreezeLabel from "@/Components/InputLabel.vue";
import { useForm, usePage } from "@inertiajs/inertia-vue3";
import Multiselect from "@vueform/multiselect";
import { computed } from "vue";

const props = defineProps({
    authors: {
        type: Array,
        default: null,
    },
});

const currentUser = usePage().props.value.auth.user.name;

const categoriesOptions = computed(() => {
    return usePage().props.value.categories
        ? usePage().props.value.categories.map((category) => {
              return { value: category.id, label: category.name };
          })
        : [];
});

const undefinedCategory = categoriesOptions.value.find(
    (category) => category.label === "uncategorized"
);

const form = useForm({
    title: "",
    excerpt: "",
    author: currentUser,
    category_id: undefinedCategory?.value,
});

const authorsOptions = computed(() => {
    return props.authors
        ? props.authors.map((author) => {
              return author.name;
          })
        : [];
});

const submit = () => {
    form.post(route("books.store"), {});
};
</script>

<template>
    <form @submit.prevent="submit">
        <div>
            <BreezeLabel for="author" value="Author Name" />
            <Multiselect
                id="author"
                v-model="form.author"
                :options="authorsOptions"
                placeholder="Author Name"
            />
        </div>

        <div class="mt-4">
            <BreezeLabel for="category" value="Book Category" />
            <Multiselect
                id="category"
                v-model="form.category_id"
                :options="categoriesOptions"
                track-by="value"
                placeholder="Category"
            />
        </div>

        <div class="mt-4">
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
            <BreezeLabel for="excerpt" value="Excerpt" />
            <BreezeInput
                id="excerpt"
                v-model="form.excerpt"
                type="text"
                class="mt-1 block w-full"
                autocomplete="excerpt"
            />
        </div>

        <div class="my-8 dark:text-gray-100">
            Any text added to "title" or "excerpt" can be searched to find the
            book later.
        </div>

        <div class="flex items-center justify-end mt-4">
            <BreezeButton
                class="ml-4"
                :class="{ 'opacity-25': form.processing }"
                :disabled="form.processing"
            >
                Create!
            </BreezeButton>
        </div>
    </form>
</template>

<style src="@vueform/multiselect/themes/default.css"></style>
