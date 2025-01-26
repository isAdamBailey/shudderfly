<script setup>
import Button from "@/Components/Button.vue";
import Checkbox from "@/Components/Checkbox.vue";
import Input from "@/Components/TextInput.vue";
import { useForm } from "@inertiajs/vue3";

const props = defineProps({
    settings: {
        type: Array,
        required: true,
    },
});

const form = useForm({
    settings: props.settings.reduce((acc, setting) => {
        acc[setting.key] =
            setting.type === "boolean"
                ? Boolean(Number(setting.value))
                : setting.value;
        return acc;
    }, {}),
});

const isBooleanSetting = (setting) => {
    return setting.type === "boolean";
};

const submit = () => {
    const formData = {
        settings: Object.entries(form.data().settings).reduce((acc, [key, value]) => {
            acc[key] = typeof value === 'boolean' ? (value ? '1' : '0') : value;
            return acc;
        }, {})
    };
    
    form.put(route("settings.update"), formData, {
        preserveScroll: true,
    });
};
</script>

<template>
    <form class="p-6" @submit.prevent="submit">
        <div v-if="form.processing">Processing...</div>
        <Transition
            enter-from-class="opacity-0"
            leave-to-class="opacity-0"
            class="transition ease-in-out"
        >
            <div
                v-if="form.recentlySuccessful"
                class="mb-4 p-4 bg-green-100 text-green-700 rounded-lg"
            >
                Settings updated successfully
            </div>
        </Transition>

        <div
            v-if="form.errors.settings"
            class="mb-4 p-4 bg-red-100 text-red-700 rounded-lg"
        >
            {{ form.errors.settings }}
        </div>

        <div class="space-y-4">
            <div
                v-for="setting in settings"
                :key="setting.key"
                class="space-y-2"
            >
                <label
                    class="block font-medium text-sm text-gray-700 dark:text-gray-300"
                >
                    {{ setting.key }}
                </label>

                <template v-if="isBooleanSetting(setting)">
                    <Checkbox
                        v-model:checked="form.settings[setting.key]"
                        :value="setting.key"
                    />
                </template>
                <template v-else>
                    <Input
                        v-model="form.settings[setting.key]"
                        type="text"
                        class="mt-1 block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow-sm"
                    />
                </template>
            </div>
        </div>

        <div class="mt-6">
            <Button
                type="submit"
            >
                Save Settings
            </button>
        </div>
    </form>
</template>
