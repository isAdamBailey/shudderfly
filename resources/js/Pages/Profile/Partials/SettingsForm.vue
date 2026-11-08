<script setup>
import Button from "@/Components/Button.vue";
import ConfirmDialog from "@/Components/ConfirmDialog.vue";
import Input from "@/Components/TextInput.vue";
import SecondaryButton from "@/Components/SecondaryButton.vue";
import { useConfirmDialog } from "@/composables/useConfirmDialog";
import { useFlashMessage } from "@/composables/useFlashMessage";
import { useTranslations } from "@/composables/useTranslations";
import { router } from "@inertiajs/vue3";
import axios from "axios";
import { computed, ref, watch } from "vue";

const { t } = useTranslations();
const {
    show: confirmShow,
    message: confirmMessage,
    title: confirmTitle,
    confirmLabel: confirmOkLabel,
    cancelLabel: confirmCancelLabel,
    confirmVariant,
    ask: askConfirm,
    onConfirmed: confirmOnOk,
    onCancelled: confirmOnCancel,
} = useConfirmDialog();

const props = defineProps({
    settings: {
        type: Array,
        required: true,
    },
});

const { setFlashMessage } = useFlashMessage();
const savingKey = ref(null);
const editingDescriptions = ref(false);
const descriptionDrafts = ref({});

// Existing values identify the seeded descriptions, so admins see the clearer
// localized copy until they choose to edit and save a description themselves.
const defaultDescriptions = {
    snapshot_enabled: "Enable or disable the snapshot feature globally",
    snapshot_cooldown: "Cooldown period in minutes between snapshots",
    youtube_enabled: "Enable or disable YouTube video integration",
    music_enabled: "Enable or disable the Music tab and YouTube sync",
    youtube_playlist_id: "YouTube Playlist ID for syncing music",
    messaging_enabled: "Enable or disable the messaging system globally",
    messaging_retention_days:
        "Number of days to retain messages before automatic cleanup",
    street_view_enabled:
        "Enable or disable the Street View accordion in map components",
    sounds_enabled: "Enable or disable the Sounds page",
    cockroaches_enabled:
        "Show little cockroaches crawling in the header and footer",
    ai_descriptions_enabled:
        "Generate AI descriptions for uploaded images and videos (sends uploads to a third-party AI service)",
    unblock_requests_enabled:
        "Allow users without the edit pages permission to ask an admin to unblock their content",
    ai_voice_enabled:
        "Speak text with an AI voice instead of the device voice (sends spoken text to a third-party AI service)",
    ai_voice_daily_character_limit:
        "Most characters the AI voice may send for new clips per day; 0 stops new clips, cached clips always play",
    ask_to_unblock_enabled:
        'Show the "ask an admin to unblock" button to users without the edit pages permission (blocking itself stays on)',
    world_together_enabled:
        "Let logged-in people in the Games World see each other (uses Pusher messages)",
};

const buildFormSettings = (settings) =>
    settings.reduce((acc, setting) => {
        acc[setting.key] = {
            value:
                setting.type === "boolean"
                    ? Boolean(Number(setting.value))
                    : setting.value ?? "",
            description: setting.description || "",
            type: setting.type,
        };
        return acc;
    }, {});

const savedSettings = ref(buildFormSettings(props.settings));
const formSettings = ref(buildFormSettings(props.settings));

const translationFor = (key, fallbackKey) => {
    const translationKey = `settings.site.${key}`;
    const value = t(translationKey);
    return value === translationKey ? t(fallbackKey) : value;
};

const labelFor = (setting) =>
    translationFor(`${setting.key}.label`, "settings.site.unknown_label");

const localizedDescriptionFor = (setting) =>
    translationFor(
        `${setting.key}.description`,
        "settings.site.unknown_description"
    );

const storedDescriptionFor = (setting, description) => {
    if (!description || description === defaultDescriptions[setting.key]) {
        return localizedDescriptionFor(setting);
    }
    return description;
};

const descriptionFor = (setting) => {
    const key = setting.key;
    const stored = storedDescriptionFor(
        setting,
        savedSettings.value[key]?.description
    );
    const draft = descriptionDrafts.value[key];
    return draft !== undefined ? draft : stored;
};

const features = computed(() =>
    props.settings.filter((setting) => setting.type === "boolean")
);
const otherSettings = computed(() =>
    props.settings.filter((setting) => setting.type !== "boolean")
);

const isEnabled = (setting) => formSettings.value[setting.key]?.value === true;

const hasDescriptionChanges = computed(() =>
    props.settings.some((setting) => {
        const key = setting.key;
        const draft = descriptionDrafts.value[key];
        if (draft === undefined) return false;

        const stored = storedDescriptionFor(
            setting,
            savedSettings.value[key]?.description
        );
        return draft !== stored;
    })
);

const hasChanges = computed(() =>
    props.settings.some((setting) => {
        const key = setting.key;
        const valueChanged =
            formSettings.value[key]?.value !== savedSettings.value[key]?.value;
        const descriptionChanged =
            hasDescriptionChanges.value &&
            descriptionDrafts.value[key] !== undefined &&
            descriptionDrafts.value[key] !==
                storedDescriptionFor(
                    setting,
                    savedSettings.value[key]?.description
                );

        return valueChanged || descriptionChanged;
    })
);

// Keep edits to other cards in place when a switch saves and the server sends
// back the updated settings.
watch(
    () => props.settings,
    (newSettings) => {
        const nextSaved = buildFormSettings(newSettings);

        Object.entries(nextSaved).forEach(([key, nextSetting]) => {
            const currentSaved = savedSettings.value[key];
            const currentForm = formSettings.value[key];
            const setting = newSettings.find((item) => item.key === key);
            const valueDraft =
                currentForm &&
                currentSaved &&
                currentForm.value !== currentSaved.value;
            const storedDescription = currentSaved
                ? storedDescriptionFor(setting, currentSaved.description)
                : "";
            const descriptionDraft =
                descriptionDrafts.value[key] !== undefined &&
                descriptionDrafts.value[key] !== storedDescription;

            savedSettings.value[key] = nextSetting;
            formSettings.value[key] = {
                ...nextSetting,
                value: valueDraft ? currentForm.value : nextSetting.value,
            };

            if (
                descriptionDrafts.value[key] !== undefined &&
                !descriptionDraft
            ) {
                descriptionDrafts.value[key] = storedDescriptionFor(
                    setting,
                    nextSetting.description
                );
            }
        });
    },
    { deep: true }
);

const beginDescriptionEditing = () => {
    props.settings.forEach((setting) => {
        if (descriptionDrafts.value[setting.key] === undefined) {
            descriptionDrafts.value[setting.key] = storedDescriptionFor(
                setting,
                savedSettings.value[setting.key]?.description
            );
        }
    });
    editingDescriptions.value = true;
};

const discardDescriptionEdits = () => {
    props.settings.forEach((setting) => {
        descriptionDrafts.value[setting.key] = storedDescriptionFor(
            setting,
            savedSettings.value[setting.key]?.description
        );
    });
    editingDescriptions.value = false;
};

const reloadSettings = () => {
    router.reload({
        only: ["adminSettings", "settings", "aiVoice"],
        preserveScroll: true,
    });
};

const updateOneSetting = async (setting, value) => {
    savingKey.value = setting.key;

    try {
        const { data } = await axios.put(
            "/settings",
            {
                settings: {
                    [setting.key]: {
                        value,
                        description:
                            savedSettings.value[setting.key]?.description || "",
                    },
                },
            },
            { headers: { Accept: "application/json" } }
        );

        formSettings.value[setting.key].value = value;
        savedSettings.value[setting.key].value = value;
        setFlashMessage("success", data.message || t("settings.updated"));
        reloadSettings();
    } catch {
        setFlashMessage("error", t("settings.site.save_error"));
    } finally {
        savingKey.value = null;
    }
};

const requestToggle = async (setting) => {
    if (savingKey.value !== null) return;

    const nextValue = !isEnabled(setting);
    const shouldSave = await askConfirm({
        title: t(
            nextValue
                ? "settings.site.confirm_on_title"
                : "settings.site.confirm_off_title",
            { setting: labelFor(setting) }
        ),
        message: t(
            nextValue
                ? "settings.site.confirm_on_message"
                : "settings.site.confirm_off_message",
            {
                description: storedDescriptionFor(
                    setting,
                    savedSettings.value[setting.key]?.description
                ),
            }
        ),
        confirmLabel: t(
            nextValue ? "settings.site.turn_on" : "settings.site.turn_off"
        ),
        cancelLabel: t("common.cancel"),
    });

    if (shouldSave) {
        await updateOneSetting(setting, nextValue);
    }
};

const changedSettingsPayload = () =>
    props.settings.reduce((payload, setting) => {
        const key = setting.key;
        const value = formSettings.value[key].value;
        const storedDescription = storedDescriptionFor(
            setting,
            savedSettings.value[key]?.description
        );
        const draftDescription = descriptionDrafts.value[key];
        const hasDescriptionDraft =
            draftDescription !== undefined &&
            draftDescription !== storedDescription;
        const valueChanged = value !== savedSettings.value[key]?.value;

        if (valueChanged || hasDescriptionDraft) {
            payload[key] = {
                value,
                description: hasDescriptionDraft
                    ? draftDescription
                    : savedSettings.value[key]?.description || "",
            };
        }
        return payload;
    }, {});

const saveChanges = async () => {
    if (!hasChanges.value || savingKey.value !== null) return;

    const shouldSave = await askConfirm({
        title: t("settings.site.confirm_save_title"),
        message: t("settings.site.confirm_save_message"),
        confirmLabel: t("settings.site.save_changes"),
        cancelLabel: t("common.cancel"),
    });

    if (!shouldSave) return;

    savingKey.value = "other";
    const changedSettings = changedSettingsPayload();

    try {
        const { data } = await axios.put(
            "/settings",
            { settings: changedSettings },
            { headers: { Accept: "application/json" } }
        );

        Object.entries(changedSettings).forEach(([key, values]) => {
            savedSettings.value[key] = {
                ...savedSettings.value[key],
                value: values.value,
                description: values.description,
            };
            formSettings.value[key] = {
                ...formSettings.value[key],
                value: values.value,
                description: values.description,
            };
            descriptionDrafts.value[key] = values.description;
        });
        setFlashMessage("success", data.message || t("settings.updated"));
        reloadSettings();
    } catch {
        setFlashMessage("error", t("settings.site.save_error"));
    } finally {
        savingKey.value = null;
    }
};

const isNumericSetting = (setting) =>
    [
        "snapshot_cooldown",
        "messaging_retention_days",
        "ai_voice_daily_character_limit",
    ].includes(setting.key);

const unitFor = (setting) => {
    const key = `settings.site.${setting.key}.unit`;
    const unit = t(key);
    return unit === key ? "" : unit;
};
</script>

<template>
    <div class="space-y-8">
        <div
            class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
            <p
                class="max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300"
            >
                {{ t("settings.site.intro") }}
            </p>
            <div class="flex shrink-0 flex-wrap items-center gap-2">
                <SecondaryButton
                    v-if="editingDescriptions"
                    type="button"
                    :disabled="savingKey !== null"
                    @click="editingDescriptions = false"
                >
                    {{ t("settings.site.done_editing") }}
                </SecondaryButton>
                <SecondaryButton
                    v-else
                    type="button"
                    :disabled="savingKey !== null"
                    @click="beginDescriptionEditing"
                >
                    {{ t("settings.site.edit_descriptions") }}
                </SecondaryButton>
                <button
                    v-if="hasDescriptionChanges"
                    type="button"
                    class="btn-bulge min-h-11 rounded-md px-2 text-sm font-semibold text-gray-600 underline decoration-gray-400 underline-offset-4 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:text-gray-300 dark:hover:text-white"
                    :disabled="savingKey !== null"
                    @click="discardDescriptionEdits"
                >
                    {{ t("settings.site.discard_description_edits") }}
                </button>
            </div>
        </div>
        <p
            v-if="editingDescriptions"
            class="-mt-6 text-sm text-gray-500 dark:text-gray-400"
        >
            {{ t("settings.site.description_edit_help") }}
        </p>

        <section aria-labelledby="site-features-heading">
            <div class="mb-2">
                <h4
                    id="site-features-heading"
                    class="text-lg font-semibold text-gray-900 dark:text-gray-100"
                >
                    {{ t("settings.site.features_heading") }}
                </h4>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                    {{ t("settings.site.features_help") }}
                </p>
            </div>

            <div class="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                <article
                    v-for="(setting, index) in features"
                    :key="setting.key"
                    class="flex min-h-32 items-start justify-between gap-4 border-b border-gray-200 py-5 dark:border-gray-700"
                >
                    <div class="min-w-0 flex-1">
                        <h5
                            :id="`site-feature-title-${index}`"
                            class="font-semibold text-gray-900 dark:text-gray-100"
                        >
                            {{ labelFor(setting) }}
                        </h5>
                        <label
                            v-if="editingDescriptions"
                            class="sr-only"
                            :for="`site-feature-description-${index}`"
                        >
                            {{
                                t("settings.site.description_input_label", {
                                    setting: labelFor(setting),
                                })
                            }}
                        </label>
                        <textarea
                            v-if="editingDescriptions"
                            :id="`site-feature-description-${index}`"
                            v-model="descriptionDrafts[setting.key]"
                            rows="3"
                            class="mt-1 block w-full rounded-md border-gray-300 text-sm leading-5 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        />
                        <p
                            v-else
                            :id="`site-feature-description-${index}`"
                            class="mt-1 text-sm leading-5 text-gray-600 dark:text-gray-400"
                        >
                            {{ descriptionFor(setting) }}
                        </p>
                    </div>

                    <div class="flex shrink-0 items-center gap-3 pt-0.5">
                        <span
                            class="min-w-8 text-right text-xs font-semibold"
                            :class="
                                isEnabled(setting)
                                    ? 'text-amber-500 dark:text-amber-300'
                                    : 'text-gray-500 dark:text-gray-400'
                            "
                            aria-live="polite"
                        >
                            {{
                                savingKey === setting.key
                                    ? t("settings.site.saving")
                                    : isEnabled(setting)
                                    ? t("settings.site.on")
                                    : t("settings.site.off")
                            }}
                        </span>
                        <button
                            type="button"
                            role="switch"
                            class="btn-bulge relative inline-flex h-11 w-14 shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 disabled:cursor-wait disabled:opacity-60"
                            :class="
                                isEnabled(setting)
                                    ? 'bg-indigo-600'
                                    : 'bg-gray-500 dark:bg-gray-600'
                            "
                            :aria-checked="isEnabled(setting)"
                            :aria-labelledby="`site-feature-title-${index}`"
                            :aria-describedby="`site-feature-description-${index}`"
                            :disabled="savingKey !== null"
                            @click="requestToggle(setting)"
                        >
                            <span
                                aria-hidden="true"
                                class="pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition-transform"
                                :class="
                                    isEnabled(setting)
                                        ? 'translate-x-6'
                                        : 'translate-x-0.5'
                                "
                            />
                        </button>
                    </div>
                </article>
            </div>
        </section>

        <section
            v-if="otherSettings.length"
            aria-labelledby="site-other-heading"
        >
            <div class="mb-2">
                <h4
                    id="site-other-heading"
                    class="text-lg font-semibold text-gray-900 dark:text-gray-100"
                >
                    {{ t("settings.site.other_heading") }}
                </h4>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                    {{ t("settings.site.other_help") }}
                </p>
            </div>

            <div class="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                <article
                    v-for="(setting, index) in otherSettings"
                    :key="setting.key"
                    class="border-b border-gray-200 py-5 dark:border-gray-700"
                >
                    <label
                        :for="`site-setting-value-${setting.key}`"
                        class="block font-semibold text-gray-900 dark:text-gray-100"
                    >
                        {{ labelFor(setting) }}
                    </label>
                    <label
                        v-if="editingDescriptions"
                        class="sr-only"
                        :for="`site-setting-description-${index}`"
                    >
                        {{
                            t("settings.site.description_input_label", {
                                setting: labelFor(setting),
                            })
                        }}
                    </label>
                    <textarea
                        v-if="editingDescriptions"
                        :id="`site-setting-description-${index}`"
                        v-model="descriptionDrafts[setting.key]"
                        rows="3"
                        class="mt-1 block w-full rounded-md border-gray-300 text-sm leading-5 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                    />
                    <p
                        v-else
                        :id="`site-setting-help-${setting.key}`"
                        class="mt-1 text-sm leading-5 text-gray-600 dark:text-gray-400"
                    >
                        {{ descriptionFor(setting) }}
                    </p>
                    <div class="mt-3 flex max-w-xl items-center gap-3">
                        <Input
                            :id="`site-setting-value-${setting.key}`"
                            v-model="formSettings[setting.key].value"
                            :type="
                                isNumericSetting(setting) ? 'number' : 'text'
                            "
                            :inputmode="
                                isNumericSetting(setting)
                                    ? 'numeric'
                                    : undefined
                            "
                            :aria-describedby="
                                editingDescriptions
                                    ? `site-setting-description-${index}`
                                    : `site-setting-help-${setting.key}`
                            "
                            :disabled="savingKey !== null"
                            class="block w-full max-w-sm border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                        />
                        <span
                            v-if="unitFor(setting)"
                            class="shrink-0 text-sm text-gray-600 dark:text-gray-400"
                        >
                            {{ unitFor(setting) }}
                        </span>
                    </div>
                </article>
            </div>
        </section>

        <div
            v-if="hasChanges"
            class="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-5 dark:border-gray-700"
        >
            <div>
                <p
                    class="text-sm text-amber-700 dark:text-amber-300"
                    aria-live="polite"
                >
                    {{ t("settings.site.unsaved_changes") }}
                </p>
                <p
                    v-if="hasDescriptionChanges"
                    class="mt-1 text-xs text-gray-600 dark:text-gray-400"
                >
                    {{ t("settings.site.description_edit_help") }}
                </p>
            </div>
            <Button
                type="button"
                :disabled="savingKey !== null"
                @click="saveChanges"
            >
                {{
                    savingKey === "other"
                        ? t("settings.site.saving")
                        : t("settings.site.save_changes")
                }}
            </Button>
        </div>

        <ConfirmDialog
            v-model:show="confirmShow"
            :title="confirmTitle"
            :message="confirmMessage"
            :confirm-label="confirmOkLabel || t('common.ok')"
            :cancel-label="confirmCancelLabel || t('common.cancel')"
            :confirm-variant="confirmVariant"
            @confirm="confirmOnOk"
            @cancel="confirmOnCancel"
        />
    </div>
</template>
