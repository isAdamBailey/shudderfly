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
                                    class="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100"
                                >
                                    Name
                                </th>
                                <th scope="col"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="(category, index) in categories.data"
                                :key="index"
                                class="border-b bg-white"
                            >
                                <td
                                    class="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900"
                                >
                                    {{ category.name }}
                                </td>
                                <td>
                                    <DangerButton
                                        @click="deleteCategory(category)"
                                    >
                                        X
                                    </DangerButton>
                                </td>
                            </tr>
                            <tr class="bg-white">
                                <td class="px-6 py-5">
                                    <InputLabel
                                        for="category-name"
                                        value="New Category"
                                    />
                                    <TextInput
                                        id="category-name"
                                        v-model="form.name"
                                        class="w-3/4"
                                    />
                                    <InputError
                                        v-if="
                                            v$.$errors.length &&
                                            v$.name.required.$invalid
                                        "
                                        class="mt-2"
                                        message="A name is required to add a category."
                                    />
                                </td>
                                <td>
                                    <Button
                                        :class="{
                                            'opacity-25': form.processing,
                                        }"
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
import DangerButton from "@/Components/DangerButton.vue";
import Button from "@/Components/Button.vue";
import TextInput from "@/Components/TextInput.vue";
import InputError from "@/Components/InputError.vue";
import InputLabel from "@/Components/InputLabel.vue";
import { useForm } from "@inertiajs/vue3";
import { useVuelidate } from "@vuelidate/core";
import { required } from "@vuelidate/validators";

defineProps({
    categories: { type: Object, required: true },
});

const rules = {
    name: {
        required,
    },
};

const form = useForm({
    name: null,
});

let v$ = useVuelidate(rules, form);

const updateCategory = (category) => {
    form.category = category;
    form.put(route("categories.update"), {});
};

const addCategory = async () => {
    const validated = await v$.value.$validate();

    if (validated) {
        form.name = form.name.toLowerCase();
        form.post(route("categories.store"), {
            onSuccess: () => {
                form.reset();
                v$.value.$reset();
            },
        });
    }
};

const deleteCategory = (category) => {
    form.delete(route("categories.destroy", category), {
        onBefore: () =>
            confirm(
                `Are you sure you want to delete ${category.name}? If it has existing books, they will be moved to uncategorized.`
            ),
    });
};
</script>
