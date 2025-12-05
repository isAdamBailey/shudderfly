<template>
  <Head :title="page.book.title" />

  <BreezeAuthenticatedLayout>
    <div class="relative">
      <div class="text-center">
        <div class="relative min-h-[60vh]">
          <div
            class="absolute top-2 left-2 sm:top-4 sm:left-4 md:top-6 md:left-6 lg:top-8 lg:left-8 z-20"
          >
            <BookCoverCard
              :book="page.book"
              :disabled="buttonDisabled"
              container-class="w-20 sm:w-24 md:w-28 lg:w-32 aspect-[3/4] opacity-70 hover:opacity-100 transition-opacity"
              title-size="text-xs sm:text-sm md:text-base"
              @click="buttonDisabled = true"
            />
          </div>
          <div
            class="w-full flex items-center justify-center relative"
            style="touch-action: pan-y pinch-zoom"
            @touchstart.passive="onTouchStart"
            @touchmove.passive="onTouchMove"
            @touchend="onTouchEnd"
          >
            <Link
              v-if="previousPage"
              prefetch="hover"
              :href="route('pages.show', previousPage)"
              as="button"
              class="z-10 absolute left-3 md:left-8 top-1/2 transform -translate-y-1/2 inline-flex items-center text-white hover:text-blue-600 hover:dark:text-gray-800 hover:christmas:text-christmas-gold disabled:opacity-25 transition ease-in-out duration-150"
              aria-label="previous page"
              :disabled="buttonDisabled"
              @click="buttonDisabled = true"
            >
              <i
                class="ri-arrow-left-circle-fill text-6xl rounded-full bg-blue-600 hover:bg-white dark:bg-gray-800 christmas:bg-christmas-red hover:dark:bg-white"
              ></i>
            </Link>
            <Link
              v-if="nextPage"
              prefetch="hover"
              :href="route('pages.show', nextPage)"
              as="button"
              class="z-10 absolute right-3 md:right-8 top-1/2 transform -translate-y-1/2 inline-flex items-center text-white hover:text-blue-600 hover:dark:text-gray-800 hover:christmas:text-christmas-gold disabled:opacity-25 transition ease-in-out duration-150"
              aria-label="next page"
              :disabled="buttonDisabled"
              @click="buttonDisabled = true"
            >
              <i
                class="ri-arrow-right-circle-fill text-6xl rounded-full bg-blue-600 hover:bg-white dark:bg-gray-800 christmas:bg-christmas-red hover:dark:bg-white"
              ></i>
            </Link>
            <div
              v-if="page.media_path"
              class="rounded-lg overflow-hidden mx-16 md:mx-20"
            >
              <LazyLoader
                :src="page.media_path"
                :poster="page.media_poster"
                :alt="page.description"
                :book-id="page.book.id"
                :page-id="page.id"
                :object-fit="'contain'"
              />
            </div>
            <div
              v-else-if="page.video_link"
              class="w-full max-w-4xl mx-16 md:mx-20"
            >
              <VideoWrapper :url="page.video_link" :title="page.description" />
            </div>
          </div>
          <p v-if="canEditPages" class="w-full mb-3 text-sm italic text-white">
            Uploaded on {{ short(page.created_at) }}, viewed
            {{ Math.round(page.read_count).toLocaleString() }} times
          </p>
        </div>
        <div v-if="hasContent" class="mx-5 mt-8 mb-5 relative z-20">
          <div class="text-container">
            <div
              class="font-content page-content max-w-5xl mx-auto text-lg text-left relative"
              v-html="page.content"
            ></div>
            <div class="flex justify-end mt-6">
              <Button
                type="button"
                :disabled="speaking"
                @click="speak(stripHtml(page.content))"
              >
                <i class="ri-speak-fill text-xl"></i>
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div class="mx-5">
        <MapEmbed
          :latitude="props.page.latitude ?? props.page.book.latitude"
          :longitude="props.page.longitude ?? props.page.book.longitude"
          :title="
            props.page.content
              ? stripHtml(props.page.content).substring(0, 50)
              : ''
          "
          :book-title="props.page.book.title"
        />
      </div>
      <div v-if="canEditPages" class="mb-3">
        <Button
          v-if="!showPageSettings"
          class="w-full rounded-none bg-red-700 dark:bg-red-700 hover:bg-pink-400 dark:hover:bg-pink-400"
          @click="showPageSettings = true"
        >
          Edit Page
        </Button>
        <Button
          v-else
          class="w-full rounded-none bg-red-700 dark:bg-red-700 hover:bg-pink-400 dark:hover:bg-pink-400"
          @click="showPageSettings = false"
        >
          Close page settings
        </Button>
        <EditPageForm
          v-if="showPageSettings"
          :page="page"
          :book="page.book"
          :books="books"
          @close-page-form="showPageSettings = false"
        />
      </div>
      <div class="my-4">
        <AddToCollageButton
          v-if="canAddToCollage"
          :page-id="props.page.id"
          :collages="props.collages"
        />
      </div>
    </div>
  </BreezeAuthenticatedLayout>
</template>

<script setup>
import AddToCollageButton from "@/Components/AddToCollageButton.vue";
import BookCoverCard from "@/Components/BookCoverCard.vue";
import Button from "@/Components/Button.vue";
import LazyLoader from "@/Components/LazyLoader.vue";
import MapEmbed from "@/Components/Map/MapEmbed.vue";
import VideoWrapper from "@/Components/VideoWrapper.vue";
import { usePermissions } from "@/composables/permissions";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useDate } from "@/dateHelpers";
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { useMedia } from "@/mediaHelpers";
import EditPageForm from "@/Pages/Page/EditPageForm.vue";
import { Head, Link, router } from "@inertiajs/vue3";
import { computed, ref } from "vue";

const { canEditPages } = usePermissions();
const { short } = useDate();
const { speak, speaking } = useSpeechSynthesis();
const { isVideo } = useMedia();

const props = defineProps({
  page: { type: Object, required: true },
  previousPage: { type: Object, required: true },
  nextPage: { type: Object, required: true },
  books: { type: Array, required: true },
  collages: { type: Array, required: true }
});

let showPageSettings = ref(false);
const buttonDisabled = ref(false);

const hasContent = computed(() => stripHtml(props.page.content));

const stripHtml = (html) => {
  if (!html) {
    return "";
  }
  return html.replace(/<\/?[^>]+(>|$)/g, "");
};

const canAddToCollage = computed(() => {
  return (
    props.page.media_path &&
    !isVideo(props.page.media_path) &&
    !props.page.video_link &&
    props.collages.length > 0
  );
});

// Swipe navigation (left/right) to go to previous/next page
const touchStartX = ref(0);
const touchStartY = ref(0);
const touchStartTime = ref(0);
const isSwiping = ref(false);

const SWIPE_MIN_DISTANCE = 60; // px
const SWIPE_MAX_DURATION = 800; // ms
const SWIPE_MAX_VERTICAL = 40; // px

function onTouchStart(event) {
  // Only handle single-finger touches to allow pinch-to-zoom
  if (event.touches.length > 1) {
    isSwiping.value = false;
    return;
  }

  const t =
    (event.changedTouches && event.changedTouches[0]) || event.touches[0];
  if (!t) return;
  touchStartX.value = t.clientX;
  touchStartY.value = t.clientY;
  touchStartTime.value = Date.now();
  isSwiping.value = true;
}

function onTouchMove() {
  // Intentionally empty to keep the handler lightweight and passive for smooth scrolling.
}

function onTouchEnd(event) {
  if (!isSwiping.value) return;
  isSwiping.value = false;

  // Don't handle multi-touch gestures (allow pinch-to-zoom)
  if (event.touches.length > 1) return;

  const t = (event.changedTouches && event.changedTouches[0]) || event;
  if (!t) return;
  const dx = t.clientX - touchStartX.value;
  const dy = t.clientY - touchStartY.value;
  const dt = Date.now() - touchStartTime.value;

  // Validate swipe intent: fast, mostly horizontal, and long enough
  if (dt > SWIPE_MAX_DURATION) return;
  if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return;
  if (Math.abs(dy) > SWIPE_MAX_VERTICAL) return;
  if (buttonDisabled.value) return;

  // Navigate: left swipe -> next page, right swipe -> previous page
  if (dx < 0 && props.nextPage) {
    buttonDisabled.value = true;
    router.get(route("pages.show", props.nextPage));
  } else if (dx > 0 && props.previousPage) {
    buttonDisabled.value = true;
    router.get(route("pages.show", props.previousPage));
  }
}
</script>
