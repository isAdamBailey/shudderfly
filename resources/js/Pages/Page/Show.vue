<template>
  <Head :title="page.book.title" />

  <BreezeAuthenticatedLayout>
    <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
      <div class="relative text-center">
        <div
          ref="bookCoverRef"
          class="absolute top-0 left-0 z-[5] pointer-events-auto"
          style="width: fit-content; height: fit-content"
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
          class="relative flex flex-col items-center min-h-[40vh] pt-6"
          style="touch-action: pan-y pinch-zoom"
          @touchstart.passive="onTouchStart"
          @touchmove.passive="onTouchMove"
          @touchend="onTouchEnd"
        >
          <div class="relative w-full flex justify-center px-12 sm:px-14 md:px-16">
            <Link
              v-if="previousPage"
              prefetch="hover"
              :href="route('pages.show', { page: previousPage?.id })"
              as="button"
              class="absolute left-0 top-1/2 -translate-y-1/2 z-30 inline-flex items-center text-white hover:text-blue-600 hover:dark:text-gray-800 hover:christmas:text-christmas-gold disabled:opacity-25 transition ease-in-out duration-150 pointer-events-auto"
              aria-label="previous page"
              :disabled="buttonDisabled"
              @click="buttonDisabled = true"
            >
              <i
                class="ri-arrow-left-circle-fill text-4xl sm:text-5xl rounded-full bg-blue-600 hover:bg-white dark:bg-gray-800 christmas:bg-christmas-red hover:dark:bg-white"
              ></i>
            </Link>
            <Link
              v-if="nextPage"
              prefetch="hover"
              :href="route('pages.show', { page: nextPage?.id })"
              as="button"
              class="absolute right-0 top-1/2 -translate-y-1/2 z-30 inline-flex items-center text-white hover:text-blue-600 hover:dark:text-gray-800 hover:christmas:text-christmas-gold disabled:opacity-25 transition ease-in-out duration-150 pointer-events-auto"
              aria-label="next page"
              :disabled="buttonDisabled"
              @click="buttonDisabled = true"
            >
              <i
                class="ri-arrow-right-circle-fill text-4xl sm:text-5xl rounded-full bg-blue-600 hover:bg-white dark:bg-gray-800 christmas:bg-christmas-red hover:dark:bg-white"
              ></i>
            </Link>
            <div
              v-if="page.media_path"
              class="w-full max-w-4xl flex justify-center rounded-lg overflow-hidden z-20 pointer-events-auto"
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
              class="w-full max-w-4xl z-20 pointer-events-auto rounded-lg overflow-hidden"
            >
              <VideoWrapper :url="page.video_link" :title="page.description" />
            </div>
          </div>
          <p
            v-if="canEditPages"
            class="w-full mt-4 mb-3 text-sm italic text-gray-400 dark:text-gray-500"
          >
            Uploaded on {{ short(page.created_at) }}, popularity
            {{ page.popularity_percentage ?? 0 }}%
          </p>
        </div>
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
          :show-street-view="true"
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
      <div
        class="my-4 mx-5 flex flex-row flex-wrap items-center justify-between gap-2 sm:gap-3"
      >
        <div
          v-if="canAddToCollage"
          class="flex shrink-0 items-center gap-2"
        >
          <AddToCollageButton
            :page-id="props.page.id"
            :collages="localCollages"
          />
        </div>

        <ShareToChatButton
          v-if="canSharePage"
          kind="page"
          :page-id="page.id"
          wrapper-class="flex shrink-0 items-center gap-2"
        />

        <div
          v-if="$page.props.auth.user"
          class="flex shrink-0 items-center gap-2"
        >
          <Button
            type="button"
            :disabled="blocking || blockConfirmPending"
            class="h-10 w-10 flex items-center justify-center"
            :title="t('page.block_icon_title')"
            :aria-label="t('page.block_aria')"
            @click="blockPage"
          >
            <i v-if="blocking" class="ri-loader-line text-xl animate-spin"></i>
            <i v-else class="ri-forbid-2-line text-xl"></i>
          </Button>
        </div>
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
import ShareToChatButton from "@/Components/ShareToChatButton.vue";
import VideoWrapper from "@/Components/VideoWrapper.vue";
import { usePermissions } from "@/composables/permissions";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
import { useDate } from "@/dateHelpers";
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { useMedia } from "@/mediaHelpers";
import EditPageForm from "@/Pages/Page/EditPageForm.vue";
import { Head, Link, router, usePage } from "@inertiajs/vue3";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

const { canEditPages } = usePermissions();
const { short } = useDate();
const { speak, speaking } = useSpeechSynthesis();
const { isVideo } = useMedia();
const { t } = useTranslations();

const props = defineProps({
  page: { type: Object, required: true },
  previousPage: { type: Object, required: true },
  nextPage: { type: Object, required: true },
  books: { type: Array, required: true },
  collages: { type: Array, required: true },
  users: { type: Array, default: () => [] }
});

const messagingEnabled = computed(() => {
  const value = usePage().props.settings?.messaging_enabled;
  return value === "1" || value === 1 || value === true;
});

let showPageSettings = ref(false);
const buttonDisabled = ref(false);
const bookCoverRef = ref(null);
const scrollHandler = ref(null);
const blocking = ref(false);
const blockConfirmPending = ref(false);

const localCollages = ref([...props.collages]);

watch(() => props.collages, (newCollages) => {
  localCollages.value = [...newCollages];
});

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
    localCollages.value.length > 0
  );
});

const canSharePage = computed(() => {
  return (
    messagingEnabled.value &&
    Boolean(props.page.media_path || props.page.video_link || props.page.media_poster) &&
    Boolean(usePage().props.auth?.user)
  );
});

const blockPage = () => {
  if (blocking.value || blockConfirmPending.value) return;

  blockConfirmPending.value = true;
  speak(t("page.block_confirm_speak"), () => {
    blockConfirmPending.value = false;
    if (!window.confirm(t("page.block_confirm_dialog"))) {
      return;
    }
    blocking.value = true;
    router.patch(
      route("pages.block", props.page.id),
      {},
      {
        preserveScroll: true,
        onFinish: () => {
          blocking.value = false;
        }
      }
    );
  });
};

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
    router.get(route("pages.show", { page: props.nextPage?.id }));
  } else if (dx > 0 && props.previousPage) {
    buttonDisabled.value = true;
    router.get(route("pages.show", { page: props.previousPage?.id }));
  }
}

// Make book cover sticky
const collagesChannel = ref(null);
const collagesRetryTimeout = ref(null);

const setupCollagesListener = () => {
  if (!window.Echo) {
    collagesRetryTimeout.value = setTimeout(setupCollagesListener, 500);
    return;
  }

  if (collagesChannel.value) {
    return;
  }

  try {
    collagesChannel.value = window.Echo.private("collages");

    collagesChannel.value.listen(".CollagePageRemoved", (event) => {
      const updatedCollage = event.collage;
      if (!updatedCollage) return;
      const index = localCollages.value.findIndex((c) => c.id === updatedCollage.id);
      if (index !== -1) {
        localCollages.value[index] = {
          ...localCollages.value[index],
          ...updatedCollage,
        };
      }
    });
  } catch (error) {
    console.error("Error setting up collages Echo listener:", error);
  }
};

onMounted(() => {
  setupCollagesListener();

  if (!bookCoverRef.value) return;

  const container = bookCoverRef.value.parentElement;
  if (!container) return;

  scrollHandler.value = () => {
    if (!bookCoverRef.value || !container) return;

    const containerRect = container.getBoundingClientRect();
    const shouldStick = containerRect.top <= 0;

    if (shouldStick) {
      bookCoverRef.value.style.position = "fixed";
      bookCoverRef.value.style.top = "0";
    } else {
      bookCoverRef.value.style.position = "absolute";
      bookCoverRef.value.style.top = "0";
    }
  };

  window.addEventListener("scroll", scrollHandler.value, { passive: true });
});

onUnmounted(() => {
  if (collagesRetryTimeout.value) {
    clearTimeout(collagesRetryTimeout.value);
    collagesRetryTimeout.value = null;
  }

  if (collagesChannel.value && window.Echo) {
    try {
      window.Echo.leave("collages");
    } catch {
      // ignore
    }
    collagesChannel.value = null;
  }

  if (scrollHandler.value) {
    window.removeEventListener("scroll", scrollHandler.value);
  }
});
</script>
