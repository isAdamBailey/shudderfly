<template>
  <div class="mt-10 flex flex-col">
    <div class="overflow-x-auto sm:-mx-6 lg:-mx-8">
      <div class="inline-block min-w-full sm:px-6 lg:px-8">
        <div class="overflow-hidden">
          <table class="min-w-full">
            <thead class="border-b">
              <tr>
                <th
                  scope="col"
                  class="px-6 py-4 text-left text-gray-900 dark:text-gray-100"
                >
                  Name
                </th>
                <th
                  scope="col"
                  class="px-6 py-4 text-right text-gray-900 dark:text-gray-100"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(category, index) in categories"
                :key="index"
                class="border-b bg-white"
              >
                <td
                  class="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900"
                  @click="editCategory(index)"
                >
                  <template v-if="editingIndex === index">
                    <InputLabel
                      for="category-list-name"
                      value="Change Category Name"
                    />
                    <TextInput
                      id="category-list-name"
                      v-model="localCategoryNames[index]"
                      class="w-3/4"
                      @keyup.enter="updateCategory(category)"
                    />
                  </template>
                  <template v-else>
                    <span>{{ capitalizeFirstLetter(category.name) }}</span>
                    <span class="ml-3">({{ category.books_count }} books)</span>
                  </template>
                </td>
                <td class="text-right">
                  <DangerButton class="mr-8" @click="deleteCategory(category)">
                    X
                  </DangerButton>
                </td>
              </tr>
              <tr class="bg-white">
                <td class="px-6 py-5">
                  <InputLabel for="category-name" value="New Category" />
                  <TextInput
                    id="category-name"
                    v-model="form.name"
                    class="w-3/4"
                  />
                  <InputError
                    v-if="v$.$errors.length && v$.name.required.$invalid"
                    class="mt-2"
                    message="A name is required to add a category."
                  />
                </td>
                <td class="text-right">
                  <Button
                    :class="{
                      'opacity-25': form.processing
                    }"
                    class="mr-8"
                    :disabled="form.processing || v$.$error"
                    @click="addCategory(form.name)"
                  >
                    Add
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import Button from "@/Components/Button.vue";
import DangerButton from "@/Components/DangerButton.vue";
import InputError from "@/Components/InputError.vue";
import InputLabel from "@/Components/InputLabel.vue";
import TextInput from "@/Components/TextInput.vue";
import { router, useForm } from "@inertiajs/vue3";
import { useVuelidate } from "@vuelidate/core";
import { required } from "@vuelidate/validators";
import { ref } from "vue";

const props = defineProps({
  categories: { type: Array, required: true }
});

const rules = {
  name: {
    required
  }
};

const form = useForm({
  name: null
});

const localCategoryNames = ref(
  props.categories?.map((category) => category.name)
);

let v$ = useVuelidate(rules, form);

const editingIndex = ref(null);

const editCategory = (index) => {
  editingIndex.value = index;
};

const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const updateCategory = async (category) => {
  const name = localCategoryNames.value[editingIndex.value];
  router.put(
    route("categories.update", category.id),
    { name },
    {
      onBefore: () =>
        confirm(`Are you sure you want to change ${category.name}?`),
      onSuccess: () => {
        editingIndex.value = null;
      }
    }
  );
};

const addCategory = async () => {
  const validated = await v$.value.$validate();

  if (validated) {
    form.name = form.name.toLowerCase();
    form.post(route("categories.store"), {
      onSuccess: () => {
        form.reset();
        v$.value.$reset();
        editingIndex.value = null;
      }
    });
  }
};

const deleteCategory = (category) => {
  form.delete(route("categories.destroy", category.id), {
    onBefore: () =>
      confirm(
        `Are you sure you want to delete ${category.name}? If it has existing books, they will be moved to uncategorized.`
      ),
    onSuccess: () => {
      editingIndex.value = null;
    }
  });
};
</script>
