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
            <div class="flex flex-nowrap items-center gap-2">
                <select
                    v-if="availableCollages.length > 1"
                    v-model="selectedCollageId"
                    class="rounded"
                    :disabled="!hasAvailableCollages"
                >
                    <option :value="null" disabled>
                        {{
                            hasAvailableCollages
                                ? t("page.collage_select_placeholder")
                                : t("page.collage_all_full")
                        }}
                    </option>
                    <option
                        v-for="collage in availableCollages"
                        :key="collage.id"
                        :value="collage.id"
                        :disabled="collage.pages.length >= MAX_COLLAGE_PAGES"
                    >
                        {{ t("page.collage_option_label", {
                            number: getCollageDisplayNumber(collage.id),
                        }) }}
                        <span v-if="collage.pages.length >= MAX_COLLAGE_PAGES">
                            (Full)
                        </span>
                    </option>
                </select>
                <div
                    v-if="showSuccess"
                    class="p-3 bg-green-100 text-green-700 rounded"
                >
                    <i class="ri-check-circle-line mr-1"></i>
                    {{ t("page.collage_add_success") }}
                </div>
                <Button
                    v-else
                    :disabled="
                        form.processing ||
                        collageConfirmPending ||
                        (availableCollages.length > 1 && !selectedCollageId) ||
                        !hasAvailableCollages
                    "
                    class="h-10"
                    @click="addToCollage"
                >
                    <i class="ri-add-line text-xl mr-1"></i>
                    {{ t("page.collage_add_button") }}
                </Button>
            </div>
        </div>
    </div>
</template>

<script setup>
/* global route */
import Button from "@/Components/Button.vue";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
import { MAX_COLLAGE_PAGES } from "@/constants/collage";
import { useForm } from "@inertiajs/vue3";
import { computed, ref, watch } from "vue";

const { speak } = useSpeechSynthesis();
const { t } = useTranslations();

const props = defineProps({
    pageId: { type: Number, required: true },
    collages: { type: Array, required: true },
});

const selectedCollageId = ref(null);
const showSuccess = ref(false);
const collageConfirmPending = ref(false);

const form = useForm({
    collage_id: null,
    page_id: props.pageId,
});

watch(selectedCollageId, (newCollageId) => {
    form.collage_id = newCollageId;
    showSuccess.value = false;
});

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

const addToCollage = () => {
    if (collageConfirmPending.value || form.processing) return;

    if (availableCollages.value.length === 1) {
        form.collage_id = availableCollages.value[0].id;
    } else if (!selectedCollageId.value) {
        return;
    } else {
        form.collage_id = selectedCollageId.value;
    }

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

    collageConfirmPending.value = true;
    speak(speakPhrase, () => {
        collageConfirmPending.value = false;
        if (!window.confirm(dialogMessage)) {
            return;
        }
        form.post(route("collage-page.store"), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                showSuccess.value = true;
                setTimeout(() => {
                    showSuccess.value = false;
                }, 3000);
            },
        });
    });
};

const getCollageDisplayNumber = (collageId) => {
    const index = props.collages?.findIndex(
        (collage) => collage.id === collageId
    );
    return index !== -1 ? index + 1 : collageId;
};

const availableCollages = computed(() => {
    return props.collages.filter(
        (collage) => !collage.is_archived && !collage.is_locked
    );
});

const hasAvailableCollages = computed(() => {
    return availableCollages.value.some(
        (collage) => collage.pages.length < MAX_COLLAGE_PAGES
    );
});
</script>
