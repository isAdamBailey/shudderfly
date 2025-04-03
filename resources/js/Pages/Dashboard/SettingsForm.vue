<script setup>
import Button from "@/Components/Button.vue";
import Checkbox from "@/Components/Checkbox.vue";
import Input from "@/Components/TextInput.vue";
import { useForm } from "@inertiajs/vue3";
import { computed, ref, watch } from 'vue';

const props = defineProps({
    settings: {
        type: Array,
        required: true,
    },
});

const editingDescription = ref(null);

const initialSettings = computed(() => {
    return props.settings.reduce((acc, setting) => {
        acc[setting.key] = {
            value: setting.type === "boolean" ? Boolean(Number(setting.value)) : (setting.value || ''),
            description: setting.description || '',
            type: setting.type
        };
        return acc;
    }, {});
});

const form = useForm({
    settings: initialSettings.value,
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

const hasChanges = computed(() => {
    return Object.keys(form.settings).some(key => {
        const current = form.settings[key];
        const initial = initialSettings.value[key];
        return current.value !== initial.value || current.description !== initial.description;
    });
});

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
                            class="text-xl font-bold text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
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
                :disabled="!hasChanges || form.processing"
                @click="submit"
            >
                Save Settings
            </Button>
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
