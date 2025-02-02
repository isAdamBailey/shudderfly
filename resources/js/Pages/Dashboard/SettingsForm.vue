<script setup>
import Button from "@/Components/Button.vue";
import DangerButton from "@/Components/DangerButton.vue";
import Checkbox from "@/Components/Checkbox.vue";
import Input from "@/Components/TextInput.vue";
import { useForm } from "@inertiajs/vue3";
import { ref, watch } from 'vue';

const props = defineProps({
    settings: {
        type: Array,
        required: true,
    },
});

const editingDescription = ref(null);
const showNewSettingForm = ref(false);

const form = useForm({
    settings: props.settings.reduce((acc, setting) => {
        acc[setting.key] = {
            value: setting.type === "boolean" ? Boolean(Number(setting.value)) : (setting.value || ''),
            description: setting.description || '',
            type: setting.type
        };
        return acc;
    }, {}),
});

// Watch for settings changes and update form data
watch(() => props.settings, (newSettings) => {
    form.settings = newSettings.reduce((acc, setting) => {
        acc[setting.key] = {
            value: setting.type === "boolean" ? Boolean(Number(setting.value)) : (setting.value || ''),
            description: setting.description || '',
            type: setting.type
        };
        return acc;
    }, {});
}, { deep: true });

const newSettingForm = useForm({
    key: '',
    value: '',
    description: '',
    type: 'text'
});

// Watch for type changes in the new setting form
watch(() => newSettingForm.type, (newType) => {
    newSettingForm.value = newType === 'boolean' ? false : '';
});

const deleteForm = useForm({});

const startEditing = (key) => {
    editingDescription.value = key;
};

const stopEditing = () => {
    editingDescription.value = null;
};

const submit = () => {
    if (!confirm('Are you sure you want to update these settings?')) {
        return;
    }

    form.put('/settings', {
        preserveScroll: true,
    });
};

const submitNewSetting = () => {
    newSettingForm.post('/settings', {
        preserveScroll: true,
        onSuccess: () => {
            showNewSettingForm.value = false;
            newSettingForm.reset();
        },
    });
};

const deleteSetting = (setting) => {
    if (!confirm(`Are you sure you want to delete the setting "${setting.key}"? This will break any existing code that depends on it.`)) {
        return;
    }

    deleteForm.delete(`/settings/${setting.id}`, {
        preserveScroll: true,
    });
};
</script>

<template>
    <div>
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

        <div class="flex">
            <div class="space-y-6 w-full">
                <div
                    v-for="setting in settings"
                    :key="setting.key"
                    class="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-0"
                >
                    <div class="flex justify-between items-start">
                        <label
                            class="block font-medium text-sm text-gray-700 dark:text-gray-300"
                        >
                            {{ setting.key }}
                            <span class="text-xs text-gray-500 ml-2">({{ setting.type }})</span>
                        </label>
                        <DangerButton
                            type="button"
                            class="!bg-red-600 hover:!bg-red-500"
                            @click="deleteSetting(setting)"
                        >
                            X
                        </DangerButton>
                    </div>

                    <div class="mt-2">
                        <div v-if="editingDescription === setting.key && form.settings[setting.key]">
                            <Input
                                ref="descriptionInput"
                                v-model="form.settings[setting.key].description"
                                v-focus
                                type="text"
                                class="block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow-sm"
                                @blur="stopEditing"
                                @keyup.enter="stopEditing"
                            />
                        </div>
                        <div 
                            v-else
                            class="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                            @click="startEditing(setting.key)"
                        >
                            {{ form.settings[setting.key]?.description || '' }}
                        </div>
                    </div>

                    <div class="mt-2">
                        <template v-if="form.settings[setting.key]?.type === 'boolean'">
                            <Checkbox
                                class="p-3"
                                :checked="form.settings[setting.key].value"
                                @update:checked="v => form.settings[setting.key].value = v"
                            />
                        </template>
                        <template v-else-if="form.settings[setting.key]">
                            <Input
                                v-model="form.settings[setting.key].value"
                                type="text"
                                class="block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow-sm"
                            />
                        </template>
                    </div>
                </div>
            </div>
        </div>

        <div class="mt-6 flex justify-between items-center">
            <Button
                type="button"
                @click="submit"
            >
                Save Settings
            </Button>

            <Button
                type="button"
                @click="showNewSettingForm = !showNewSettingForm"
            >
                {{ showNewSettingForm ? 'Cancel' : 'Add New Setting' }}
            </Button>
        </div>

        <div v-if="showNewSettingForm" class="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <form class="space-y-4" @submit.prevent="submitNewSetting">
                <div>
                    <label class="block font-medium text-sm text-gray-700 dark:text-gray-300">
                        Key
                    </label>
                    <Input
                        v-model="newSettingForm.key"
                        type="text"
                        class="mt-1 block w-full"
                        placeholder="setting_key_name"
                    />
                    <div v-if="newSettingForm.errors.key" class="text-red-600 text-sm mt-1">
                        {{ newSettingForm.errors.key }}
                    </div>
                </div>

                <div>
                    <label class="block font-medium text-sm text-gray-700 dark:text-gray-300">
                        Type
                    </label>
                    <select
                        v-model="newSettingForm.type"
                        class="mt-1 block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow-sm"
                    >
                        <option value="text">Text</option>
                        <option value="boolean">Boolean</option>
                    </select>
                    <div v-if="newSettingForm.errors.type" class="text-red-600 text-sm mt-1">
                        {{ newSettingForm.errors.type }}
                    </div>
                </div>

                <div>
                    <label class="block font-medium text-sm text-gray-700 dark:text-gray-300">
                        Value
                    </label>
                    <template v-if="newSettingForm.type === 'boolean'">
                        <Checkbox
                            v-model="newSettingForm.value"
                            class="mt-1"
                        />
                    </template>
                    <template v-else>
                        <Input
                            v-model="newSettingForm.value"
                            type="text"
                            class="mt-1 block w-full"
                        />
                    </template>
                    <div v-if="newSettingForm.errors.value" class="text-red-600 text-sm mt-1">
                        {{ newSettingForm.errors.value }}
                    </div>
                </div>

                <div>
                    <label class="block font-medium text-sm text-gray-700 dark:text-gray-300">
                        Description
                    </label>
                    <Input
                        v-model="newSettingForm.description"
                        type="text"
                        class="mt-1 block w-full"
                    />
                    <div v-if="newSettingForm.errors.description" class="text-red-600 text-sm mt-1">
                        {{ newSettingForm.errors.description }}
                    </div>
                </div>

                <div>
                    <Button
                        type="submit"
                        :disabled="newSettingForm.processing"
                    >
                        Create Setting
                    </Button>
                </div>
            </form>
        </div>
    </div>
</template>

<script>
export default {
    directives: {
        focus: {
            mounted(el) {
                el.focus()
            }
        }
    }
}
</script>
