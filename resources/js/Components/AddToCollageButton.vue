<template>
    <div>
        <div
            v-if="isPageInAnyCollage"
            class="flex flex-nowrap items-center gap-2 text-yellow-400 text-sm"
        >
            <i
                class="ri-information-line flex-shrink-0 text-2xl leading-none"
                aria-hidden="true"
            ></i>
            <span>
                This picture is in collage
                <template v-if="availableCollages.length > 1">
                    <span
                        v-for="(existingCollage, index) in pageExistingCollages"
                        :key="existingCollage.id"
                    >
                        #{{ getCollageDisplayNumber(existingCollage.id)
                        }}<span v-if="index < pageExistingCollages.length - 1">, </span>
                    </span>
                </template>
            </span>
        </div>

        <div v-else>
            <div class="flex flex-col gap-2">
                <div class="flex flex-nowrap items-center gap-2">
                <select
                    v-if="availableCollages.length > 1"
                    v-model="selectedCollageId"
                    class="rounded"
                    :disabled="!hasSelectableCollages"
                >
                    <option :value="null" disabled>
                        {{ t("page.collage_select_placeholder") }}
                    </option>
                    <option
                        v-for="collage in availableCollages"
                        :key="collage.id"
                        :value="collage.id"
                    >
                        {{ t("page.collage_option_label", {
                            number: getCollageDisplayNumber(collage.id),
                        }) }}
                        <span v-if="isCollageFull(collage)">
                            {{ t("page.collage_full_suffix") }}
                        </span>
                        <span v-if="collage.is_locked">
                            {{ t("page.collage_locked_suffix") }}
                        </span>
                    </option>
                </select>
                <Button
                    :disabled="isAddButtonDisabled"
                    class="h-10"
                    @click="addToCollage"
                >
                    <i class="ri-add-line text-xl mr-1"></i>
                    {{ t("page.collage_add_button") }}
                </Button>
                </div>
                <InputError :message="form.errors.collage" />
                <InputError :message="form.errors.replace_page_id" />
            </div>
        </div>

        <CollageReplacePickerDialog
            v-model:show="showReplaceModal"
            :pages="replaceModalPages"
            :title="t('page.collage_replace_modal_title')"
            :cancel-label="t('common.cancel')"
            @close="closeReplaceModal"
            @pick="confirmReplaceWithPage"
        />

        <ConfirmDialog
            v-model:show="showCollageConfirmDialog"
            :message="collageConfirmMessage"
            :confirm-label="t('common.ok')"
            :cancel-label="t('common.cancel')"
            @confirm="onCollageConfirmDialogConfirm"
            @cancel="onCollageConfirmDialogCancel"
        />
    </div>
</template>

<script setup>
/* global route */
import Button from "@/Components/Button.vue";
import CollageReplacePickerDialog from "@/Components/CollageReplacePickerDialog.vue";
import ConfirmDialog from "@/Components/ConfirmDialog.vue";
import InputError from "@/Components/InputError.vue";
import { useCollageMaxPages } from "@/composables/useCollageMaxPages";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
import { useForm } from "@inertiajs/vue3";
import { computed, ref, watch } from "vue";

const { speak } = useSpeechSynthesis();
const { t } = useTranslations();
const maxCollagePages = useCollageMaxPages();

const props = defineProps({
    pageId: { type: Number, required: true },
    collages: { type: Array, required: true },
});

const selectedCollageId = ref(null);
const showReplaceModal = ref(false);
const showCollageConfirmDialog = ref(false);
const collageConfirmMessage = ref("");
const collageConfirmAction = ref(null);

const form = useForm({
    collage_id: null,
    page_id: props.pageId,
    replace_page_id: null,
});

watch(selectedCollageId, (newCollageId) => {
    form.collage_id = newCollageId;
});

watch(
    () => props.pageId,
    (id) => {
        form.page_id = id;
    }
);

const pageExistingCollages = computed(() => {
    return props.collages.filter((collage) =>
        collage.pages.some(
            (page) => page.id === props.pageId && !collage.is_archived
        )
    );
});

const isPageInAnyCollage = computed(() => {
    return pageExistingCollages.value.length > 0;
});

const sameId = (a, b) => String(a) === String(b);

const collagePageCount = (collage) => {
    const raw = collage.pages_count ?? collage.pages?.length;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
};

const isCollageFull = (collage) =>
    collagePageCount(collage) >= maxCollagePages.value;

const mustUseReplaceFlow = (collage) =>
    isCollageFull(collage) ||
    (Boolean(collage.is_locked) && collagePageCount(collage) > 0);

const replaceModalPages = computed(() => {
    const id = targetCollageId.value;
    if (id == null) return [];
    const collage = availableCollages.value.find((c) => sameId(c.id, id));
    return collage?.pages ?? [];
});

const targetCollageId = ref(null);

const addToCollage = () => {
    if (
        form.processing ||
        showCollageConfirmDialog.value ||
        showReplaceModal.value
    ) {
        return;
    }

    const list = availableCollages.value;
    if (list.length === 0) {
        return;
    }

    let collageId;
    if (list.length === 1) {
        collageId = list[0].id;
    } else if (
        selectedCollageId.value != null &&
        selectedCollageId.value !== ""
    ) {
        collageId = selectedCollageId.value;
    } else {
        collageId = list[0].id;
    }

    form.collage_id = collageId;
    targetCollageId.value = collageId;

    const collage = availableCollages.value.find((c) =>
        sameId(c.id, collageId)
    );
    if (!collage) return;

    if (mustUseReplaceFlow(collage)) {
        speak(t("page.collage_replace_pick_speak"));
        showReplaceModal.value = true;
        return;
    }

    postNormalAdd();
};

const postNormalAdd = () => {
    const single = availableCollages.value.length === 1;
    const speakPhrase = single
        ? t("page.collage_confirm_speak_single")
        : t("page.collage_confirm_speak_choice", {
              number: getCollageDisplayNumber(form.collage_id),
          });
    const dialogMessage = single
        ? t("page.collage_confirm_dialog_single")
        : t("page.collage_confirm_dialog_choice", {
              number: getCollageDisplayNumber(form.collage_id),
          });

    collageConfirmMessage.value = dialogMessage;
    collageConfirmAction.value = () => {
        form.replace_page_id = null;
        form.post(route("collage-page.store"), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                form.page_id = props.pageId;
                selectedCollageId.value = null;
            },
        });
    };
    showCollageConfirmDialog.value = true;
    speak(speakPhrase);
};

const confirmReplaceWithPage = (page) => {
    showReplaceModal.value = false;
    form.collage_id = targetCollageId.value;
    form.replace_page_id = page.id;

    collageConfirmMessage.value = t("page.collage_replace_confirm_dialog");
    collageConfirmAction.value = () => {
        form.post(route("collage-page.store"), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                form.page_id = props.pageId;
                selectedCollageId.value = null;
                targetCollageId.value = null;
            },
        });
    };
    showCollageConfirmDialog.value = true;
    speak(t("page.collage_replace_confirm_speak"));
};

const onCollageConfirmDialogConfirm = () => {
    const fn = collageConfirmAction.value;
    collageConfirmAction.value = null;
    if (fn) {
        fn();
    }
};

const onCollageConfirmDialogCancel = () => {
    collageConfirmAction.value = null;
    form.replace_page_id = null;
};

const closeReplaceModal = () => {
    showReplaceModal.value = false;
    targetCollageId.value = null;
};

const getCollageDisplayNumber = (collageId) => {
    const index = props.collages?.findIndex(
        (collage) => collage.id === collageId
    );
    return index !== -1 ? index + 1 : collageId;
};

const availableCollages = computed(() => {
    return props.collages.filter((collage) => !collage.is_archived);
});

const hasSelectableCollages = computed(() => {
    return availableCollages.value.length > 0;
});

const isAddButtonDisabled = computed(() => form.processing);
</script>
