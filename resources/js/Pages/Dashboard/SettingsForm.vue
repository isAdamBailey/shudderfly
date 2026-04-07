<script setup>
import Button from "@/Components/Button.vue";
import Checkbox from "@/Components/Checkbox.vue";
import Input from "@/Components/TextInput.vue";
import { useFlashMessage } from "@/composables/useFlashMessage";
import { router } from "@inertiajs/vue3";
import axios from "axios";
import { computed, ref, watch } from 'vue';

const props = defineProps({
    settings: {
        type: Array,
        required: true,
    },
});

const emit = defineEmits(['submitted']);

const { setFlashMessage } = useFlashMessage();

const editingDescription = ref(null);
const submitting = ref(false);

const buildFormSettings = (settings) => {
    return settings.reduce((acc, setting) => {
        acc[setting.key] = {
            value: setting.type === "boolean" ? Boolean(Number(setting.value)) : (setting.value || ''),
            description: setting.description || '',
            type: setting.type
        };
        return acc;
    }, {});
};

const initialSettings = computed(() => buildFormSettings(props.settings));

const formSettings = ref(buildFormSettings(props.settings));

// Watch for settings changes and update form data
watch(() => props.settings, (newSettings) => {
    formSettings.value = buildFormSettings(newSettings);
}, { deep: true });

const hasChanges = computed(() => {
    return Object.keys(formSettings.value).some(key => {
        const current = formSettings.value[key];
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

const submit = async () => {
    if (!confirm('Are you sure you want to update these settings?')) {
        return;
    }

    if (submitting.value) return;

    submitting.value = true;
    try {
        const { data } = await axios.put(
            '/settings',
            { settings: formSettings.value },
            { headers: { Accept: 'application/json' } }
        );
        setFlashMessage('success', data.message);
        router.reload({
            only: ['adminSettings'],
            preserveScroll: true,
            async: true,
        });
        emit('submitted');
    } catch (error) {
        setFlashMessage('error', error.response?.data?.message || 'Failed to update settings.');
    } finally {
        submitting.value = false;
    }
};
</script>

<template>
    <div>
        <div v-if="submitting">Processing...</div>

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
                        <div v-if="editingDescription === setting.key && formSettings[setting.key]">
                            <Input
                                ref="descriptionInput"
                                v-model="formSettings[setting.key].description"
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
                            {{ formSettings[setting.key]?.description || '' }}
                        </div>
                    </div>

                    <div class="mt-2">
                        <template v-if="formSettings[setting.key]?.type === 'boolean'">
                            <Checkbox
                                class="p-3"
                                :checked="formSettings[setting.key].value"
                                @update:checked="v => formSettings[setting.key].value = v"
                            />
                        </template>
                        <template v-else-if="formSettings[setting.key]">
                            <Input
                                v-model="formSettings[setting.key].value"
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
                :disabled="!hasChanges || submitting"
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
