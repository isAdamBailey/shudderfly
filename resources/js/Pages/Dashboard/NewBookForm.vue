<script setup>
import BreezeButton from '@/Components/Button.vue';
import BreezeInput from '@/Components/TextInput.vue';
import BreezeLabel from '@/Components/InputLabel.vue';
import {useForm} from '@inertiajs/inertia-vue3';
import Multiselect from '@vueform/multiselect';
import {computed} from "vue";

const props = defineProps({
  authors: {
    type: Array,
    default: null
  }
});

const form = useForm({
  title: '',
  excerpt: '',
  author: ''
});

const authorsOptions = computed(() => {
  return props.authors
      ? props.authors.map((author) => {
        return author.name;
      })
      : [];
});

const submit = () => {
  form.post(route('books.store'), {});
};
</script>

<template>
  <form @submit.prevent="submit">
    <div>
      <BreezeLabel for="author" value="Author Name"/>
      <Multiselect
          id="author"
          v-model="form.author"
          :options="authorsOptions"
          placeholder="Author Name"
      />
    </div>

    <div class="mt-4">
      <BreezeLabel for="title" value="Title"/>
      <BreezeInput id="title" type="text" class="mt-1 block w-full" v-model="form.title" required autofocus
                   autocomplete="title"/>
    </div>

    <div class="mt-4">
      <BreezeLabel for="excerpt" value="Excerpt"/>
      <BreezeInput id="excerpt" type="text" class="mt-1 block w-full" v-model="form.excerpt"
                   autocomplete="excerpt"/>
    </div>

    <div class="flex items-center justify-end mt-4">
      <BreezeButton class="ml-4" :class="{ 'opacity-25': form.processing }" :disabled="form.processing">
        Create!
      </BreezeButton>
    </div>
  </form>
</template>

<style src="@vueform/multiselect/themes/default.css"></style>