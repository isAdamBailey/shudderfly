<script setup>
import BreezeLabel from "@/Components/InputLabel.vue";
import { useForm, usePage } from "@inertiajs/vue3";
import Button from "@/Components/Button.vue";
import { computed, onMounted, ref } from "vue";
import DeletePageForm from "@/Pages/Book/DeletePageForm.vue";
import Wysiwyg from "@/Components/Wysiwyg.vue";
import VideoIcon from "@/Components/svg/VideoIcon.vue";
import Multiselect from "@vueform/multiselect";
import InputLabel from "@/Components/InputLabel.vue";
import TextInput from "@/Components/TextInput.vue";

const emit = defineEmits(["close-page-form"]);

const props = defineProps({
    page: { type: Object, required: true },
    book: { type: Object, required: true },
    showPageSettings: { type: Boolean, default: false },
});

const pageForm = useForm({
    content: props.page.content,
    image: null,
    book_id: props.page.book_id,
    video_link: props.page.video_link,
});

const bookForm = useForm({
    cover_page: props.book.cover_page,
});

const imagePreview = ref(props.page.image_path);

const imageInput = ref(null);
const mediaOption = ref("upload"); // upload , link

onMounted(() => {
    if (props.page.video_link) {
        mediaOption.value = "link";
    }
});

function selectLink() {
    mediaOption.value = "link";
    clearImageFileInput();
}

function selectUpload() {
    mediaOption.value = "upload";
    pageForm.video_link = null;
}

const booksOptions = computed(() => {
    return usePage().props.books
        ? usePage().props.books.map((book) => {
              return { value: book.id, label: book.title };
          })
        : [];
});

const optionLabel = computed(() => {
    return (option) => option.label;
});

const optionId = computed(() => {
    return (option) => option.value;
});

const isCoverPage = computed(() => {
    return props.book.cover_page === props.page.id;
});

function selectNewImage() {
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
        imageInput.value.value = null;
        imagePreview.value = "";
    }
}

const submit = () => {
    if (imageInput.value) {
        pageForm.image = imageInput.value.files[0];
    }
    pageForm.post(route("pages.update", props.page), {
        onSuccess: () => {
            clearImageFileInput();
            pageForm.reset();
            emit("close-page-form");
        },
    });
};

const makeCoverPage = () => {
    bookForm.cover_page = props.page.id;
    bookForm.put(route("books.update", props.book), {
        onSuccess: () => {
            bookForm.reset();
            emit("close-page-form");
        },
    });
};
</script>

<template>
    <div class="border-t-2 bg-white dark:bg-gray-800 rounded p-5 mt-10">
        <form @submit.prevent="submit">
            <div class="mb-4">
                <Button
                    :is-active="mediaOption === 'upload'"
                    class="mr-2"
                    @click.prevent="selectUpload"
                >
                    Upload Media
                </Button>
                <Button
                    :is-active="mediaOption === 'link'"
                    @click.prevent="selectLink"
                >
                    YouTube Link
                </Button>
            </div>
            <div class="flex flex-wrap">
                <div v-if="mediaOption === 'upload'" class="w-full">
                    <BreezeLabel for="imageInput" value="Media" />
                    <input
                        ref="imageInput"
                        type="file"
                        class="hidden"
                        @change="updateImagePreview"
                    />
                    <div
                        v-if="
                            imagePreview.startsWith('data:image') ||
                            imagePreview.startsWith('https')
                        "
                        class="h-40 rounded bg-cover bg-center bg-no-repeat mr-2"
                        :style="
                            'background-image: url(\'' + imagePreview + '\');'
                        "
                    ></div>
                    <div v-else class="w-32">
                        <VideoIcon class="text-blue-700" />
                    </div>

                    <Button
                        class="mt-2 mr-2"
                        type="button"
                        @click.prevent="selectNewImage"
                    >
                        Update Media
                    </Button>
                </div>

                <div v-if="mediaOption === 'link'" class="w-full mr-2">
                    <InputLabel for="media-link" value="YouTube Link" />
                    <TextInput
                        id="media-link"
                        v-model="pageForm.video_link"
                        class="mt-1 block w-full"
                    />
                </div>
                <div class="w-full">
                    <BreezeLabel for="content" value="Words" />
                    <Wysiwyg
                        id="content"
                        v-model="pageForm.content"
                        class="mt-1 block w-full"
                        autocomplete="content"
                    />
                </div>
            </div>
            <div class="mt-3">
                <BreezeLabel for="book" value="Move Fart to other Poop" />
                <Multiselect
                    id="book"
                    v-model="pageForm.book_id"
                    :options="booksOptions"
                    :option-label="optionLabel"
                    :option-id="optionId"
                    track-by="label"
                    placeholder="Search Poops"
                    searchable
                />
            </div>

            <div class="flex justify-center mt-5 md:mt-10">
                <Button
                    class="w-3/4 flex justify-center py-3"
                    :class="{ 'opacity-25': pageForm.processing }"
                    :disabled="pageForm.processing"
                >
                    Update Fart!
                </Button>
            </div>
        </form>
        <div
            v-if="isCoverPage"
            class="mt-5 text-gray-800 dark:text-white text-sm"
        >
            This image is the cover fart for this poop. To change the cover, go
            to the page settings for another fart and click "Make Cover Fart".
        </div>
        <div
            v-else-if="
                page.image_path.includes('.jpg') ||
                page.image_path.includes('.png') ||
                page.image_path.includes('.webp')
            "
            class="flex justify-center mt-5 md:mt-10"
        >
            <Button
                class="w-3/4 flex justify-center py-3"
                :class="{ 'opacity-25': bookForm.processing }"
                :disabled="bookForm.processing"
                @click.prevent="makeCoverPage"
            >
                Make Cover Fart
            </Button>
        </div>
        <DeletePageForm
            :page="page"
            @close-page-form="$emit('close-page-form')"
        />
    </div>
</template>

<style src="@vueform/multiselect/themes/default.css"></style>
