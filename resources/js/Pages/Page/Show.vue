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
      <div class="my-4 mx-5 flex items-end gap-2">
        <AddToCollageButton
          v-if="canAddToCollage"
          :page-id="props.page.id"
          :collages="props.collages"
        />
        <div
          v-if="
            messagingEnabled &&
            (page.media_path || page.video_link || page.media_poster) &&
            $page.props.auth.user
          "
          ref="shareMenuContainerRef"
          class="relative flex items-center"
        >
          <Button
            type="button"
            :disabled="isShareDisabled || sharing"
            class="h-10 flex items-center justify-center gap-2"
            :title="
              hasSharedToday
                ? t('already_shared_today')
                : t('share_to_timeline')
            "
            @click.stop="toggleShareMenu"
            ref="shareButtonRef"
          >
            <i v-if="sharing" class="ri-loader-line text-xl animate-spin"></i>
            <i v-else class="ri-share-line text-xl"></i>
            <span>Share</span>
          </Button>
          <div
            v-if="shareMenuOpen"
            ref="shareMenuRef"
            class="fixed w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-[100] max-h-72 overflow-y-auto"
            :style="shareMenuStyles"
            @click.stop
          >
            <UserTagList
              :users="users"
              :selected-user-id="selectedShareUserId"
              :show-none="true"
              none-label="Share without tag"
              :none-selected="selectedShareUserId === null"
              @select="handleShareSelect"
              @select-none="handleShareSelectNone"
            />
          </div>
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
import UserTagList from "@/Components/UserTagList.vue";
import VideoWrapper from "@/Components/VideoWrapper.vue";
import { usePermissions } from "@/composables/permissions";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
import { useDate } from "@/dateHelpers";
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { useMedia } from "@/mediaHelpers";
import EditPageForm from "@/Pages/Page/EditPageForm.vue";
import { Head, Link, router, usePage } from "@inertiajs/vue3";
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";

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
const sharing = ref(false);
const hasSharedToday = ref(false);
const shareMenuOpen = ref(false);
const shareMenuContainerRef = ref(null);
const selectedShareUserId = ref(null);
const shareButtonRef = ref(null);
const shareMenuRef = ref(null);
const shareMenuStyles = ref({});

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

const isShareDisabled = computed(() => {
  return hasSharedToday.value || sharing.value;
});

const checkIfSharedToday = () => {
  const today = new Date().toISOString().split("T")[0];
  const key = `page_share_${props.page.id}_${today}`;
  hasSharedToday.value = localStorage.getItem(key) !== null;
};

const sharePage = (taggedUserId = null) => {
  if (isShareDisabled.value) return;

  sharing.value = true;
  shareMenuOpen.value = false;
  selectedShareUserId.value = null;

  router.post(
    route("pages.share", props.page.id),
    {
      tagged_user_ids: taggedUserId ? [taggedUserId] : []
    },
    {
      preserveScroll: true,
      onSuccess: () => {
        const today = new Date().toISOString().split("T")[0];
        const key = `page_share_${props.page.id}_${today}`;
        localStorage.setItem(key, Date.now().toString());
        hasSharedToday.value = true;
        sharing.value = false;
      },
      onError: () => {
        sharing.value = false;
      }
    }
  );
};

const toggleShareMenu = () => {
  if (isShareDisabled.value) return;
  shareMenuOpen.value = !shareMenuOpen.value;
  if (shareMenuOpen.value) {
    nextTick(() => {
      updateShareMenuPosition();
    });
  }
};

const handleShareSelect = (user) => {
  if (!user) return;
  selectedShareUserId.value = user.id;
  sharePage(user.id);
};

const handleShareSelectNone = () => {
  selectedShareUserId.value = null;
  sharePage(null);
};

const handleShareMenuClickOutside = (event) => {
  if (!shareMenuOpen.value) return;
  const container = shareMenuContainerRef.value;
  if (container && !container.contains(event.target)) {
    shareMenuOpen.value = false;
  }
};

const updateShareMenuPosition = () => {
  if (!shareMenuOpen.value) return;
  const buttonEl = shareButtonRef.value?.$el || shareButtonRef.value;
  const menuEl = shareMenuRef.value;
  if (!buttonEl || !menuEl) return;

  const rect = buttonEl.getBoundingClientRect();
  const padding = 12;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const menuWidth = Math.min(menuEl.offsetWidth || 256, viewportWidth - padding * 2);
  const menuHeight = menuEl.offsetHeight || 0;
  const left = Math.min(
    Math.max(rect.left, padding),
    viewportWidth - menuWidth - padding
  );
  const top = Math.min(
    rect.bottom + 8,
    Math.max(padding, viewportHeight - menuHeight - padding)
  );

  shareMenuStyles.value = {
    position: "fixed",
    left: `${left}px`,
    top: `${top}px`,
    width: `${menuWidth}px`
  };
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

onMounted(() => {
  checkIfSharedToday();
  document.addEventListener("click", handleShareMenuClickOutside);
  window.addEventListener("resize", updateShareMenuPosition, { passive: true });
  window.addEventListener("scroll", updateShareMenuPosition, { passive: true });

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
  if (scrollHandler.value) {
    window.removeEventListener("scroll", scrollHandler.value);
  }
  document.removeEventListener("click", handleShareMenuClickOutside);
  window.removeEventListener("resize", updateShareMenuPosition);
  window.removeEventListener("scroll", updateShareMenuPosition);
});
</script>
