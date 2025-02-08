<script setup>
import Button from "@/Components/Button.vue";
import InputError from "@/Components/InputError.vue";
import { default as BreezeLabel, default as InputLabel } from "@/Components/InputLabel.vue";
import VideoIcon from "@/Components/svg/VideoIcon.vue";
import TextInput from "@/Components/TextInput.vue";
import VideoWrapper from "@/Components/VideoWrapper.vue";
import Wysiwyg from "@/Components/Wysiwyg.vue";
import { useForm } from "@inertiajs/vue3";
import { useVuelidate } from "@vuelidate/core";
import { computed, ref } from "vue";

const emit = defineEmits(["close-form"]);

const props = defineProps({
    book: { type: Object, required: true },
});

const form = useForm({
    book_id: props.book.id,
    content: "",
    image: null,
    video_link: null,
});

const imageInput = ref(null);

const rules = computed(() => {
    const fileSizeValidation = (image) => {
        if (!image) {
            return true;
        }
        return image.size < 62914560; // 60MB
    };
    const atLeastOneRequired = () => {
        return (
            form.video_link ||
            form.image ||
            (form.content !== "" && form.content !== "<p></p>")
        );
    };
    return {
        form: {
            video_link: {
                required: atLeastOneRequired,
            },
            image: {
                required: atLeastOneRequired,
                file_size_validation: () => fileSizeValidation(form.image),
            },
            content: {
                required: atLeastOneRequired,
            },
        },
    };
});

let v$ = useVuelidate(rules, form);

const imagePreview = ref("");
const mediaOption = ref("upload"); // upload , link

function selectLink() {
    mediaOption.value = "link";
    clearImageFileInput();
}

function selectUpload() {
    mediaOption.value = "upload";
    form.video_link = null;
}

function selectNewImage() {
    v$.value.$reset();
    imageInput.value.click();
}

function updateImagePreview() {
    const photo = imageInput.value.files[0];
    if (!photo) return;

    form.image = photo;
    v$.value.$touch();

    const reader = new FileReader();
    reader.onload = (e) => {
        imagePreview.value = e.target.result;
    };
    reader.readAsDataURL(photo);
}

function clearImageFileInput() {
    if (imageInput.value) {
        imageInput.value.value = null;
        imagePreview.value = "";
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
    <div class="bg-white dark:bg-gray-800 rounded m-5 md:w-full p-10">
        <h3 class="text-2xl dark:text-gray-100 w-full border-b mb-7">
            Add a New Page
        </h3>
        <form @submit.prevent="submit">
            <div class="mb-4">
                <Button
                    :is-active="mediaOption === 'upload'"
                    class="rounded-none w-24 justify-center"
                    @click.prevent="selectUpload"
                >
                    Upload
                </Button>
                <Button
                    :is-active="mediaOption === 'link'"
                    class="rounded-none w-24 justify-center"
                    @click.prevent="selectLink"
                >
                    YouTube
                </Button>
            </div>
            <div class="flex flex-wrap">
                <div v-if="mediaOption === 'upload'" class="w-full mb-2">
                    <BreezeLabel for="imageInput" value="Media" />
                    <input
                        ref="imageInput"
                        type="file"
                        class="hidden"
                        @change="updateImagePreview"
                    />
                    <div
                        v-if="imagePreview.startsWith('data:image')"
                        class="w-full min-h-60 rounded bg-contain bg-center bg-no-repeat"
                        :style="
                            'background-image: url(\'' + imagePreview + '\');'
                        "
                    ></div>
                    <div
                        v-else-if="imagePreview.startsWith('data:video')"
                        class="w-full flex justify-center"
                    >
                        <video controls class="w-60">
                            <source :src="imagePreview" type="video/mp4" />
                            <VideoIcon class="text-blue-700" />
                        </video>
                    </div>

                    <Button
                        class="mt-2 mr-2"
                        type="button"
                        @click.prevent="selectNewImage"
                    >
                        Select Media to Upload
                    </Button>
                </div>

                <div v-if="mediaOption === 'link'" class="w-full mr-2">
                    <InputLabel for="media-link" value="YouTube Link" />
                    <TextInput
                        id="media-link"
                        v-model="form.video_link"
                        class="mt-1 mb-3 block w-full"
                    />
                    <InputError
                        v-if="
                            v$.$errors.length &&
                            v$.form.video_link.required.$invalid
                        "
                        class="mt-2"
                        message="A link to a video is required without any text or upload."
                    />

                    <div v-if="form.video_link" class="w-1/2">
                        <VideoWrapper
                            :url="form.video_link"
                            :controls="false"
                        />
                    </div>
                </div>

                <div class="w-full">
                    <BreezeLabel for="content" value="Words" />
                    <Wysiwyg
                        id="content"
                        v-model="form.content"
                        class="mt-1 block w-full"
                    />
                </div>
            </div>
            <p
                v-if="
                    v$.$errors.length &&
                    v$.form.image.file_size_validation.$invalid
                "
                class="text-red-600"
            >
                That video should be less than 60 MB.
            </p>
            <p
                v-if="v$.$errors.length && v$.form.image.required.$invalid"
                class="text-red-600"
            >
                Upload is required without any text on the page.
            </p>
            <p
                v-if="v$.$errors.length && v$.form.content.required.$invalid"
                class="text-red-600"
            >
                Some words are required without an upload.
            </p>
            <p
                v-if="v$.$errors.length && v$.form.video_link.required.$invalid"
                class="text-red-600"
            >
                A link to a video is required without any text or upload.
            </p>

            <div class="flex justify-center mt-5 md:mt-20">
                <Button
                    class="w-3/4 flex justify-center py-3"
                    :class="{ 'opacity-25': form.processing }"
                    :disabled="form.processing || v$.$error"
                >
                    <span class="text-xl">Create Page!</span>
                </Button>
            </div>
        </form>
    </div>
</template>
