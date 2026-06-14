<script setup>
/* eslint-disable no-undef */
import Button from "@/Components/Button.vue";
import {
  default as BreezeLabel,
  default as InputLabel
} from "@/Components/InputLabel.vue";
import MapPicker from "@/Components/Map/MapPicker.vue";
import SecondaryButton from "@/Components/SecondaryButton.vue";
import VideoIcon from "@/Components/svg/VideoIcon.vue";
import TextInput from "@/Components/TextInput.vue";
import VideoWrapper from "@/Components/VideoWrapper.vue";
import Wysiwyg from "@/Components/Wysiwyg.vue";
import DeletePageForm from "@/Pages/Book/DeletePageForm.vue";
import { useForm, usePage } from "@inertiajs/vue3";
import Multiselect from "@vueform/multiselect";
import { computed, onMounted, ref } from "vue";

const isLocationOpen = ref(false);

const emit = defineEmits(["close-page-form"]);

const props = defineProps({
  page: { type: Object, required: true },
  book: { type: Object, required: true },
  showPageSettings: { type: Boolean, default: false },
  books: { type: Array, required: true }
});

const isYouTubeEnabled = computed(
  () => usePage().props.settings["youtube_enabled"]
);

const pageForm = useForm({
  content: props.page.content,
  image: null,
  book_id: props.page.book_id,
  video_link: props.page.video_link,
  created_at: props.page.created_at,
  latitude: props.page.latitude ?? null,
  longitude: props.page.longitude ?? null
});

const bookForm = useForm({
  cover_page: props.book.cover_page
});

const pendingCoverPage = ref(false);

const imagePreview = ref(props.page.media_path);

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
  pageForm.image = null; // Clear any uploaded file
}

function selectUpload() {
  mediaOption.value = "upload";
  pageForm.video_link = null;
}

const booksOptions = computed(() => {
  return props.books.map((book) => {
    return { value: book.id, label: book.title };
  });
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

const isImagePage = computed(() => {
  return (
    props.page.media_path?.includes(".jpg") ||
    props.page.media_path?.includes(".png") ||
    props.page.media_path?.includes(".webp")
  );
});

const hasCoverAction = computed(() => isCoverPage.value || isImagePage.value);

function selectNewImage() {
  imageInput.value.click();
}

function updateImagePreview() {
  const photo = imageInput.value.files[0];
  if (!photo) return;

  pageForm.image = photo;

  const reader = new FileReader();
  reader.onload = (e) => {
    imagePreview.value = e.target.result;
  };
  reader.readAsDataURL(photo);
}

function clearImageFileInput() {
  if (imageInput.value) {
    imageInput.value.value = null;
    imagePreview.value = props.page.media_path; // Reset to original media
    pageForm.image = null; // Clear the form field
  }
}

const finishSubmit = () => {
  clearImageFileInput();
  pageForm.reset();
  emit("close-page-form");
};

const applyPendingCoverPage = (onDone) => {
  if (!pendingCoverPage.value) {
    onDone();
    return;
  }

  bookForm.cover_page = props.page.id;
  bookForm.put(route("books.update", props.book), {
    onSuccess: () => {
      bookForm.reset();
      pendingCoverPage.value = false;
      onDone();
    }
  });
};

const submit = () => {
  if (pageForm.isDirty) {
    pageForm.post(route("pages.update", props.page), {
      onSuccess: () => applyPendingCoverPage(finishSubmit)
    });
  } else {
    applyPendingCoverPage(finishSubmit);
  }
};

const toggleCoverPagePending = () => {
  pendingCoverPage.value = !pendingCoverPage.value;
};

const pendingMoveToTop = computed(
  () => pageForm.created_at !== props.page.created_at
);

const toggleMoveToTop = () => {
  pageForm.created_at = pendingMoveToTop.value
    ? props.page.created_at
    : new Date().toISOString().slice(0, 16);
};

const handleAddressFocus = () => {
  isLocationOpen.value = true;
};
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded m-5 md:w-full p-5">
    <h3 class="text-xl dark:text-gray-100 w-full border-b mb-5">Edit Page</h3>
    <form ref="pageFormRef">
      <div
        v-if="isYouTubeEnabled"
        class="mb-4 flex gap-2"
        role="group"
        aria-label="Media source"
      >
        <Button
          :is-active="mediaOption === 'upload'"
          class="flex-1 justify-center sm:flex-none sm:w-28"
          @click.prevent="selectUpload"
        >
          <i class="ri-image-line mr-2" aria-hidden="true"></i>
          Upload
        </Button>
        <Button
          :is-active="mediaOption === 'link'"
          class="flex-1 justify-center sm:flex-none sm:w-28"
          @click.prevent="selectLink"
        >
          <i class="ri-youtube-line mr-2" aria-hidden="true"></i>
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
            v-if="
              imagePreview.startsWith('data:image') ||
              imagePreview.endsWith('.webp')
            "
            class="w-full min-h-60 rounded bg-contain bg-center bg-no-repeat"
            :style="'background-image: url(\'' + imagePreview + '\');'"
          ></div>
          <div
            v-else-if="
              imagePreview.startsWith('data:video') ||
              imagePreview.endsWith('.mp4') ||
              imagePreview.endsWith('.webm') ||
              imagePreview.includes('.mp4') ||
              imagePreview.includes('.webm')
            "
            class="w-full flex flex-col items-center"
          >
            <!-- Show video player for data URLs (new uploads) -->
            <video
              v-if="imagePreview.startsWith('data:video')"
              :key="imagePreview"
              controls
              muted
              class="w-60"
              preload="metadata"
            >
              <source :src="imagePreview" />
              Your browser does not support the video tag.
            </video>

            <!-- Show placeholder for S3 URLs (existing videos) -->
            <div
              v-else
              class="w-60 h-40 bg-gray-100 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center"
            >
              <VideoIcon class="text-gray-400 w-12 h-12 mb-2" />
              <p class="text-sm text-gray-600 text-center mb-2">
                Current Video
              </p>
              <p class="text-xs text-gray-500 text-center">
                Upload a new video to replace
              </p>
            </div>
          </div>
          <div v-else class="w-32">
            <VideoIcon class="text-blue-700" />
          </div>

          <Button
            class="mt-2"
            type="button"
            @click.prevent="selectNewImage"
          >
            Update Media
          </Button>
        </div>

        <div v-if="mediaOption === 'link'" class="w-60 mr-2">
          <InputLabel for="media-link" value="YouTube Link" />
          <TextInput
            id="media-link"
            v-model="pageForm.video_link"
            class="m-1 mb-3 block w-full"
          />
          <div v-if="pageForm.video_link">
            <VideoWrapper :url="pageForm.video_link" :controls="false" />
          </div>
        </div>
      </div>
    </form>

    <div class="mt-3">
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
      <BreezeLabel for="book" value="Move page to other book" />
      <Multiselect
        id="book"
        v-model="pageForm.book_id"
        :options="booksOptions"
        :option-label="optionLabel"
        :option-id="optionId"
        track-by="label"
        placeholder="Search books"
        searchable
      />
    </div>
    <div class="mt-3">
      <MapPicker
        v-model:latitude="pageForm.latitude"
        v-model:longitude="pageForm.longitude"
        :open-map="isLocationOpen"
        @address-focus="handleAddressFocus"
      />
    </div>

    <!-- Page Actions Section -->
    <div class="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
      <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Page Actions
      </h3>

      <div class="space-y-4">
        <!-- Cover Image Actions -->
        <div
          v-if="isCoverPage"
          class="flex items-start gap-3 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4"
        >
          <i
            class="ri-information-line text-blue-400 text-xl shrink-0"
            aria-hidden="true"
          ></i>
          <p class="text-sm text-blue-800 dark:text-blue-200">
            This image is currently the cover for this book. To change it, open
            another page and use "Make Cover Image" there.
          </p>
        </div>
        <div v-else-if="isImagePage" class="flex flex-col gap-2">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SecondaryButton type="button" @click="toggleCoverPagePending">
              <i class="ri-image-line mr-2" aria-hidden="true"></i>
              {{ pendingCoverPage ? "Cancel Cover Image" : "Make Cover Image" }}
            </SecondaryButton>
            <p
              v-if="!pendingCoverPage"
              class="text-sm text-gray-600 dark:text-gray-400"
            >
              Use this image as the book's cover
            </p>
          </div>
          <div
            v-if="pendingCoverPage"
            class="flex items-center space-x-2 rounded border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3 text-sm text-blue-700 dark:text-blue-300"
          >
            <i class="ri-check-line" aria-hidden="true"></i>
            <span>Will become the cover when you save</span>
          </div>
        </div>

        <!-- Page Management Actions -->
        <div
          class="flex flex-col gap-4"
          :class="hasCoverAction ? 'border-t border-gray-100 dark:border-gray-700/60 pt-4' : ''"
        >
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SecondaryButton type="button" @click="toggleMoveToTop">
                <i class="ri-arrow-up-line mr-2" aria-hidden="true"></i>
                {{ pendingMoveToTop ? "Cancel Move to Top" : "Move to Top" }}
              </SecondaryButton>
              <p
                v-if="!pendingMoveToTop"
                class="text-sm text-gray-600 dark:text-gray-400"
              >
                Update timestamp to now
              </p>
            </div>

            <DeletePageForm
              :page="page"
              @close-page-form="$emit('close-page-form')"
            />
          </div>

          <div
            v-if="pendingMoveToTop"
            class="flex items-center space-x-2 rounded border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3 text-sm text-blue-700 dark:text-blue-300"
          >
            <i class="ri-check-line" aria-hidden="true"></i>
            <span>Will move to the top when you save</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Save Button -->
    <div class="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
      <Button
        type="button"
        class="w-full justify-center py-4 text-sm"
        :disabled="
          pageForm.processing ||
          bookForm.processing ||
          (!pageForm.isDirty && !pendingCoverPage)
        "
        @click="submit"
      >
        <i
          v-if="pageForm.processing || bookForm.processing"
          class="ri-loader-line mr-2 animate-spin"
          aria-hidden="true"
        ></i>
        Update Page
      </Button>
    </div>
  </div>
</template>

<style
  src="../../../../node_modules/@vueform/multiselect/themes/default.css"
></style>
