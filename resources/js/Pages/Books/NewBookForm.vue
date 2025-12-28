<script setup>
import BreezeButton from "@/Components/Button.vue";
import BreezeInput from "@/Components/TextInput.vue";
import BreezeLabel from "@/Components/InputLabel.vue";
import MapPicker from "@/Components/Map/MapPicker.vue";
import Accordion from "@/Components/Accordion.vue";
import { useForm, usePage } from "@inertiajs/vue3";
import Multiselect from "@vueform/multiselect";
import { computed, ref } from "vue";

const props = defineProps({
    authors: {
        type: Array,
        default: null,
    },
    categories: {
        type: Array,
        required: true,
    },
});

const currentUser = usePage().props.auth.user.name;
const isLocationOpen = ref(false);

const categoriesOptions = computed(() => {
    return props.categories.map((category) => {
        return { value: category.id, label: category.name };
    });
});

const undefinedCategory = categoriesOptions.value.find(
    (category) => category.label === "uncategorized"
);

const form = useForm({
    title: "",
    excerpt: "",
    author: currentUser,
    category_id: undefinedCategory?.value,
    latitude: null,
    longitude: null,
});

const authorsOptions = computed(() => {
    return props.authors
        ? props.authors.map((author) => {
              return author.name;
          })
        : [];
});

const handleAddressFocus = () => {
    isLocationOpen.value = true;
};

const submit = () => {
    form.post(route("books.store"), {});
};
</script>

<template>
    <div class="bg-white dark:bg-gray-800 p-5 w-full">
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
                <div class="dark:text-gray-100 text-sm">
                    Any text added to "title" or "excerpt" can be searched to
                    find the book later.
                </div>
            </div>

            <div class="mt-4">
                <MapPicker
                    v-model:latitude="form.latitude"
                    v-model:longitude="form.longitude"
                    :open-map="isLocationOpen"
                    @address-focus="handleAddressFocus"
                />
            </div>

            <div class="flex items-center justify-end mt-4">
                <BreezeButton
                    class="ml-4"
                    :class="{ 'opacity-25': form.processing }"
                    :disabled="form.processing"
                >
                    Create Book!
                </BreezeButton>
            </div>
        </form>
    </div>
</template>

<style
    src="../../../../node_modules/@vueform/multiselect/themes/default.css"
></style>
