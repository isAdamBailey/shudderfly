<script setup>
import BreezeLabel from "@/Components/InputLabel.vue";
import { useForm } from "@inertiajs/inertia-vue3";
import Button from "@/Components/Button.vue";
import { ref, computed } from "vue";
import Wysiwyg from "@/Components/Wysiwyg.vue";
import VideoIcon from "@/Components/svg/VideoIcon.vue";
import { useVuelidate } from "@vuelidate/core";
import { requiredIf } from "@vuelidate/validators";

const emit = defineEmits(["close-form"]);

const props = defineProps({
    book: { type: Object, required: true },
});

const form = useForm({
    book_id: props.book.id,
    content: "",
    image: null,
});

const imageInput = ref(null);

const rules = computed(() => {
    const file_size_validation = () => {
        if (!imageInput.value?.files[0]) {
            return true;
        }
        return imageInput.value.files[0]?.size < 40714055;
    };
    return {
        form: {
            image: {
                required: requiredIf(
                    (form.content === "" || form.content === "<p></p>") &&
                        !form.image
                ),
                file_size_validation,
            },
            content: {
                required: requiredIf(
                    !form.image &&
                        (form.content === "" || form.content === "<p></p>")
                ),
            },
        },
    };
});

let v$ = useVuelidate(rules, form);

const imagePreview = ref("");

function selectNewImage() {
    v$.value.$reset();
    imageInput.value.click();
}

function updateImagePreview() {
    const photo = imageInput.value.files[0];
    if (!photo) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        imagePreview.value = e.target.result;
    };

    reader.readAsDataURL(photo);
}

function clearImageFileInput() {
    if (imageInput.value) {
        imageInput.value = null;
    }
}

const submit = async () => {
    if (imageInput.value) {
        form.image = imageInput.value.files[0];
    }

    const validated = await v$.value.$validate();

    if (validated) {
        form.post(route("pages.store"), {
            onSuccess: () => {
                clearImageFileInput();
                form.reset();
                emit("close-form");
            },
        });
    }
};
</script>

<template>
    <div
        class="bg-white dark:bg-gray-800 rounded mb-5 md:mb-0 md:mr-5 p-5 md:w-3/4"
    >
        <h3 class="text-2xl dark:text-gray-100 w-full border-b mb-7">
            Add a New Page
        </h3>
        <form @submit.prevent="submit">
            <div class="flex flex-wrap">
                <div class="w-full md:w-1/4">
                    <BreezeLabel for="imageInput" value="Media" />
                    <input
                        ref="imageInput"
                        type="file"
                        class="hidden"
                        @change="updateImagePreview"
                    />
                    <div
                        v-if="imagePreview.startsWith('data:image')"
                        class="h-40 w-40 rounded bg-cover bg-center bg-no-repeat"
                        :style="
                            'background-image: url(\'' + imagePreview + '\');'
                        "
                    ></div>
                    <div
                        v-else-if="imagePreview.startsWith('data:video')"
                        class="w-3/4"
                    >
                        <VideoIcon class="text-blue-500" />
                    </div>

                    <Button
                        class="mt-2 mr-2"
                        type="button"
                        @click.prevent="selectNewImage"
                    >
                        Select Media to Upload
                    </Button>
                </div>

                <div class="w-full md:w-3/4">
                    <BreezeLabel for="content" value="Words" />
                    <Wysiwyg
                        id="content"
                        v-model="form.content"
                        class="mt-1 block w-full"
                    />
                </div>
            </div>
            <p v-if="v$.$errors.length && v$.form.image.file_size_validation.$invalid" class="text-red-600">
                That file is tooo biig (over 40MB hurts my belly)
            </p>
            <p v-if="v$.$errors.length && v$.form.image.required.$invalid" class="text-red-600">
                Upload is required without any text on the page.
            </p>
            <p v-if="v$.$errors.length && v$.form.content.required.$invalid" class="text-red-600">
                Some words are required without an upload.
            </p>

            <div class="flex justify-center mt-5 md:mt-20">
                <Button
                    class="w-3/4 flex justify-center py-3"
                    :class="{ 'opacity-25': form.processing }"
                    :disabled="form.processing || v$.$error"
                >
                    Create!
                </Button>
            </div>
        </form>
    </div>
</template>
