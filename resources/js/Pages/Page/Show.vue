<template>
    <Head :title="page.book.title" />

    <BreezeAuthenticatedLayout>
        <div class="relative">
            <div class="text-center">
                <div class="relative min-h-[60vh]">
                    <div
                        ref="bookCoverRef"
                        class="absolute top-0 left-2 sm:left-4 md:left-6 lg:left-8 z-10 pointer-events-auto"
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
                        class="w-full flex items-center justify-center relative pointer-events-none"
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
                            class="z-30 fixed left-3 md:left-8 top-1/2 transform -translate-y-1/2 inline-flex items-center text-white hover:text-blue-600 hover:dark:text-gray-800 hover:christmas:text-christmas-gold disabled:opacity-25 transition ease-in-out duration-150 pointer-events-auto"
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
                            class="z-30 fixed right-3 md:right-8 top-1/2 transform -translate-y-1/2 inline-flex items-center text-white hover:text-blue-600 hover:dark:text-gray-800 hover:christmas:text-christmas-gold disabled:opacity-25 transition ease-in-out duration-150 pointer-events-auto"
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
                            class="rounded-lg overflow-hidden mt-6 mx-16 md:mx-20 relative z-20 pointer-events-auto"
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
                            class="w-full max-w-4xl mx-16 md:mx-20 relative z-20 pointer-events-auto rounded-lg overflow-hidden"
                        >
                            <VideoWrapper
                                :url="page.video_link"
                                :title="page.description"
                            />
                        </div>
                    </div>
                    <p
                        v-if="canEditPages"
                        class="w-full mb-3 text-sm italic text-white"
                    >
                        Uploaded on {{ short(page.created_at) }}, popularity
                        {{ page.popularity_percentage ?? 0 }}%
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
                    :longitude="
                        props.page.longitude ?? props.page.book.longitude
                    "
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
            <div class="my-4 mx-5 flex items-end gap-2">
                <AddToCollageButton
                    v-if="canAddToCollage"
                    :page-id="props.page.id"
                    :collages="props.collages"
                />
                <div
                    v-if="
                        messagingEnabled &&
                        (page.media_path ||
                            page.video_link ||
                            page.media_poster) &&
                        $page.props.auth.user
                    "
                    ref="shareMenuContainerRef"
                    class="relative flex items-center gap-2"
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
                        @click="sharePage(null)"
                    >
                        <i
                            v-if="sharing"
                            class="ri-loader-line text-xl animate-spin"
                        ></i>
                        <i v-else class="ri-share-line text-xl"></i>
                        <span>Share</span>
                    </Button>
                    <button
                        type="button"
                        class="h-10 w-10 inline-flex items-center justify-center border rounded-md font-semibold text-xs uppercase tracking-widest transition ease-in-out duration-150 bg-theme-primary text-theme-button border-theme-primary hover:text-theme-button-hover hover:bg-theme-button active:bg-theme-button focus:border-theme-button focus:shadow-theme-button"
                        :class="{ 'opacity-25': isShareDisabled || sharing }"
                        :disabled="isShareDisabled || sharing"
                        :title="t('builder.tag_user')"
                        :aria-label="t('builder.tag_user_aria')"
                        @click.stop="toggleShareMenu"
                    >
                        <i class="ri-at-line text-lg"></i>
                    </button>
                    <div
                        v-if="shareMenuOpen"
                        class="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-[100] max-h-72 overflow-y-auto"
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
import { useFlashMessage } from "@/composables/useFlashMessage";
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
const { flashMessage } = useFlashMessage();
const { t } = useTranslations();

const props = defineProps({
    page: { type: Object, required: true },
    previousPage: { type: Object, required: true },
    nextPage: { type: Object, required: true },
    books: { type: Array, required: true },
    collages: { type: Array, required: true },
    users: { type: Array, default: () => [] },
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
            tagged_user_ids: taggedUserId ? [taggedUserId] : [],
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
            },
        }
    );
};

const toggleShareMenu = () => {
    if (isShareDisabled.value) return;
    shareMenuOpen.value = !shareMenuOpen.value;
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


// Make book cover sticky

onMounted(() => {
    checkIfSharedToday();
    document.addEventListener("click", handleShareMenuClickOutside);

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
});
</script>
