<script setup>
import Button from "@/Components/Button.vue";
import {
  default as BreezeLabel,
  default as InputLabel
} from "@/Components/InputLabel.vue";
import VideoIcon from "@/Components/svg/VideoIcon.vue";
import TextInput from "@/Components/TextInput.vue";
import VideoWrapper from "@/Components/VideoWrapper.vue";
import Wysiwyg from "@/Components/Wysiwyg.vue";
import { useVideoOptimization } from "@/composables/useVideoOptimization.js";
import DeletePageForm from "@/Pages/Book/DeletePageForm.vue";
import { useForm, usePage } from "@inertiajs/vue3";
import Multiselect from "@vueform/multiselect";
import { computed, onMounted, ref } from "vue";

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
  created_at: props.page.created_at
});

const bookForm = useForm({
  cover_page: props.book.cover_page
});

const imagePreview = ref(props.page.media_path);

const imageInput = ref(null);
const mediaOption = ref("upload"); // upload , link

const { compressionProgress, optimizationProgress, processMediaFile } =
  useVideoOptimization();

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

function selectNewImage() {
  imageInput.value.click();
}

async function updateImagePreview() {
  const photo = imageInput.value.files[0];
  if (!photo) return;

  try {
    const processedFile = await processMediaFile(photo);

    pageForm.image = processedFile;

    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.value = e.target.result;
      console.log("Preview updated:", {
        fileType: processedFile.type,
        fileSize:
          Math.round((processedFile.size / 1024 / 1024) * 100) / 100 + "MB",
        previewType: e.target.result.substring(0, 50) + "..."
      });
    };
    reader.readAsDataURL(processedFile);
  } catch (error) {
    console.error("Error processing media file:", error);
    pageForm.image = photo;

    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.value = e.target.result;
    };
    reader.readAsDataURL(photo);
  }
}

function clearImageFileInput() {
  if (imageInput.value) {
    imageInput.value.value = null;
    imagePreview.value = props.page.media_path; // Reset to original media
    pageForm.image = null; // Clear the form field
  }
}

const submit = () => {
  pageForm.post(route("pages.update", props.page), {
    onSuccess: () => {
      clearImageFileInput();
      pageForm.reset();
      emit("close-page-form");
    }
  });
};

const makeCoverPage = () => {
  bookForm.cover_page = props.page.id;
  bookForm.put(route("books.update", props.book), {
    onSuccess: () => {
      bookForm.reset();
      emit("close-page-form");
    }
  });
};

const setCreatedAtToNow = () => {
  pageForm.created_at = new Date().toISOString().slice(0, 16);
};
</script>

<template>
  <div class="border-t-2 bg-white dark:bg-gray-800 rounded p-5 mt-10">
    <form ref="pageFormRef">
      <div v-if="isYouTubeEnabled" class="mb-4">
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

          <!-- Processing Progress -->
          <div
            v-if="compressionProgress"
            class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded"
          >
            <div
              class="flex items-center justify-between text-sm text-blue-700 mb-2"
            >
              <div class="flex items-center space-x-2">
                <div
                  class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"
                ></div>
                <span>Optimizing video...</span>
              </div>
              <span class="font-medium">{{ optimizationProgress }}%</span>
            </div>
            <div class="w-full bg-blue-200 rounded-full h-2">
              <div
                class="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                :style="`width: ${optimizationProgress}%`"
              ></div>
            </div>
          </div>
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
            :disabled="compressionProgress"
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

    <div class="flex gap-6">
      <div class="flex-1">
        <div
          v-if="isCoverPage"
          class="mt-5 text-gray-800 dark:text-white text-sm"
        >
          This image is the cover image for this book. To change the cover, go
          to the page settings for another page and click "Make Cover Image".
        </div>
        <div
          v-else-if="
            page.media_path.includes('.jpg') ||
            page.media_path.includes('.png') ||
            page.media_path.includes('.webp')
          "
          class="mt-5 md:mt-10"
        >
          <Button
            class="py-3"
            :class="{ 'opacity-25': bookForm.processing }"
            :disabled="bookForm.processing"
            @click.prevent="makeCoverPage"
          >
            Make Cover Image
          </Button>
          <span class="text-gray-800 dark:text-white text-sm ml-3">
            This image will be used as the cover image for this book.
          </span>
        </div>

        <div class="my-5">
          <Button type="button" @click="setCreatedAtToNow">
            Move Page to Top
          </Button>
          <span class="text-gray-800 dark:text-white text-sm ml-3">
            The media will appear to have been uploaded just now.
          </span>
        </div>
      </div>

      <div class="flex flex-col justify-center">
        <DeletePageForm
          :page="page"
          @close-page-form="$emit('close-page-form')"
        />
      </div>
    </div>
    <div class="flex justify-center mt-10">
      <Button
        class="w-full flex justify-center py-3"
        :class="{ 'opacity-25': pageForm.processing }"
        :disabled="
          compressionProgress || pageForm.processing || !pageForm.isDirty
        "
        @click="submit"
      >
        <span class="text-xl">
          {{
            compressionProgress
              ? `Optimizing... ${optimizationProgress}%`
              : "Update Page"
          }}</span
        >
      </Button>
    </div>
  </div>
</template>

<style
  src="../../../../node_modules/@vueform/multiselect/themes/default.css"
></style>
