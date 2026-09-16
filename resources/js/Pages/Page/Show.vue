<template>
    <Head :title="page.book.title" />

    <BreezeAuthenticatedLayout>
        <div
            :class="{ 'book-table--with-text': hasContent }"
            class="book-table relative isolate overflow-clip px-3 pb-10 pt-3 sm:px-16 lg:px-24"
        >
            <img
                v-if="backdropSrc"
                :key="backdropSrc"
                :src="backdropSrc"
                alt=""
                aria-hidden="true"
                class="book-table__backdrop"
                decoding="async"
                fetchpriority="low"
            />
            <div class="book-table__shade" aria-hidden="true"></div>

            <!-- Zero-height rail: the book pill floats over the page's
                 top-left corner and scrolls away with it. -->
            <div class="relative z-30 h-0">
                <Link
                    :href="route('books.show', { book: page.book.slug })"
                    prefetch
                    class="book-chip absolute left-0 top-3"
                    :class="{
                        'pointer-events-none opacity-60': buttonDisabled,
                    }"
                    :aria-label="
                        t('page.back_to_book', { title: page.book.title })
                    "
                    @click="buttonDisabled = true"
                >
                    <span class="book-chip__cover">
                        <img
                            v-if="bookCoverSrc"
                            :src="bookCoverSrc"
                            alt=""
                            class="h-full w-full object-cover"
                        />
                        <i
                            v-else
                            class="ri-book-2-line text-lg"
                            aria-hidden="true"
                        ></i>
                    </span>
                    <span class="truncate">{{ page.book.title }}</span>
                </Link>
            </div>

            <!-- Zero-height sticky rail: the page-turn arrows stay centred in
                 the viewport while a long page scrolls, and stop at its end. -->
            <div class="book-table__rail z-30 h-0">
                <Link
                    v-for="turn in pageTurns"
                    :key="turn.side"
                    prefetch="hover"
                    :href="route('pages.show', { page: turn.page.id })"
                    as="button"
                    class="page-turn"
                    :class="turn.side"
                    :aria-label="turn.label"
                    :title="turn.label"
                    :disabled="buttonDisabled"
                    @click="buttonDisabled = true"
                >
                    <i :class="turn.icon" aria-hidden="true"></i>
                </Link>
            </div>

            <!-- Swipe to turn pages over the picture and text; the map below
                 keeps its own drag gestures. -->
            <article
                class="book-page relative mx-auto max-w-5xl"
                style="touch-action: pan-y pinch-zoom"
                @touchstart.passive="onTouchStart"
                @touchmove.passive="onTouchMove"
                @touchend="onTouchEnd"
            >
                <figure class="book-page__plate">
                    <LazyLoader
                        v-if="page.media_path"
                        :key="page.id"
                        :src="page.media_path"
                        :poster="page.media_poster"
                        :alt="page.description"
                        :book-id="page.book.id"
                        :page-id="page.id"
                        :object-fit="'contain'"
                        fit-container
                        loading="eager"
                        fetch-priority="high"
                    />
                    <div
                        v-else-if="page.video_link"
                        class="book-page__embed overflow-hidden"
                    >
                        <VideoWrapper
                            :url="page.video_link"
                            :title="page.description"
                            fill-container
                        />
                    </div>
                </figure>

                <div v-if="hasContent" class="book-page__text">
                    <div
                        class="font-content page-content"
                        v-html="page.content"
                    ></div>
                </div>

                <footer v-if="hasFooter" class="book-page__foot">
                    <p v-if="canEditPages" class="book-page__colophon">
                        Uploaded on {{ short(page.created_at) }}, popularity
                        {{ page.popularity_percentage ?? 0 }}%
                    </p>
                    <div class="ml-auto flex flex-wrap items-center gap-2">
                        <AddToCollageButton
                            v-if="canAddToCollage"
                            :page-id="props.page.id"
                            :collages="collages"
                        />
                        <Link
                            v-if="isMoviesCategory"
                            :href="
                                route('movie-cast.index', {
                                    title: page.book.title,
                                })
                            "
                            class="flex shrink-0 items-center gap-2"
                        >
                            <Button
                                type="button"
                                class="h-10 w-10 flex items-center justify-center"
                                :title="`Search cast for ${page.book.title}`"
                                :aria-label="`Search cast for ${page.book.title}`"
                            >
                                <i
                                    class="ri-film-line text-xl"
                                    aria-hidden="true"
                                ></i>
                            </Button>
                        </Link>
                        <SpeakButton
                            v-if="hasContent"
                            :disabled="speaking"
                            aria-label="Speak page content"
                            @click="speak(plainText)"
                        />
                    </div>
                </footer>
            </article>

            <div class="mx-auto mt-6 max-w-5xl">
                <MapEmbed
                    :latitude="props.page.latitude ?? props.page.book.latitude"
                    :longitude="
                        props.page.longitude ?? props.page.book.longitude
                    "
                    :title="plainText.substring(0, 50)"
                    :book-title="props.page.book.title"
                    :show-street-view="true"
                />
            </div>
        </div>

        <ScrollTop />
        <ConfirmDialog
            v-model:show="confirmShow"
            :title="confirmTitle"
            :message="confirmMessage"
            :confirm-label="confirmOkLabel || t('common.ok')"
            :cancel-label="confirmCancelLabel || t('common.cancel')"
            :confirm-variant="confirmVariant"
            @confirm="confirmOnOk"
            @cancel="confirmOnCancel"
        />
        <FormModal
            v-if="canEditPages"
            :show="showPageSettings"
            :title="t('page.edit_page_title')"
            max-width="3xl"
            :submit-ref="editPageFormRef"
            @close="showPageSettings = false"
        >
            <EditPageForm
                ref="editPageFormRef"
                :page="page"
                :book="page.book"
                :books="books"
                @close-page-form="showPageSettings = false"
            />
        </FormModal>
        <FloatingActionMenu v-if="$page.props.auth.user">
            <ShareToChatButton
                v-if="canSharePage"
                kind="page"
                :page-id="page.id"
                :menu-item="true"
                wrapper-class="w-full"
            />
            <ActionMenuItem
                icon="ri-forbid-2-line"
                icon-class="text-orange-500 dark:text-orange-400"
                :label="t('page.block_menu_label')"
                :disabled="blocking || blockConfirmPending"
                @click="blockPage"
            />
            <ActionMenuItem
                v-if="canEditPages && !showPageSettings"
                icon="ri-edit-line"
                icon-class="text-blue-600 dark:text-blue-400"
                :label="t('page.edit_menu_label')"
                @click="openPageSettings"
            />
            <ActionMenuItem
                v-else-if="canEditPages"
                icon="ri-close-line"
                icon-class="text-gray-600 dark:text-gray-400"
                :label="t('page.close_settings_menu_label')"
                @click="showPageSettings = false"
            />
        </FloatingActionMenu>
    </BreezeAuthenticatedLayout>
</template>

<script setup>
/* global route */
import ActionMenuItem from "@/Components/ActionMenuItem.vue";
import AddToCollageButton from "@/Components/AddToCollageButton.vue";
import Button from "@/Components/Button.vue";
import SpeakButton from "@/Components/SpeakButton.vue";
import ConfirmDialog from "@/Components/ConfirmDialog.vue";
import FloatingActionMenu from "@/Components/FloatingActionMenu.vue";
import FormModal from "@/Components/FormModal.vue";
import LazyLoader from "@/Components/LazyLoader.vue";
import MapEmbed from "@/Components/Map/MapEmbed.vue";
import ScrollTop from "@/Components/ScrollTop.vue";
import ShareToChatButton from "@/Components/ShareToChatButton.vue";
import VideoWrapper from "@/Components/VideoWrapper.vue";
import { useConfirmDialog } from "@/composables/useConfirmDialog";
import { usePermissions } from "@/composables/permissions";
import { useSiteSetting } from "@/composables/useSiteSetting";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
import { useDate } from "@/dateHelpers";
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { useMedia } from "@/mediaHelpers";
import EditPageForm from "@/Pages/Page/EditPageForm.vue";
import { Head, Link, router, usePage } from "@inertiajs/vue3";
import { computed, ref, unref } from "vue";

const { canEditPages } = usePermissions();
const { short } = useDate();
const { speak, speaking } = useSpeechSynthesis();
const { isVideo } = useMedia();
const { t } = useTranslations();
const {
    show: confirmShow,
    message: confirmMessage,
    title: confirmTitle,
    confirmLabel: confirmOkLabel,
    cancelLabel: confirmCancelLabel,
    confirmVariant,
    ask: askConfirm,
    onConfirmed: confirmOnOk,
    onCancelled: confirmOnCancel,
} = useConfirmDialog();

const props = defineProps({
    page: { type: Object, required: true },
    previousPage: { type: Object, required: true },
    nextPage: { type: Object, required: true },
    books: { type: Array, required: true },
    collages: { type: Array, required: true },
    users: { type: Array, default: () => [] },
});

const messagingEnabled = useSiteSetting("messaging_enabled");

const showPageSettings = ref(false);
const editPageFormRef = ref(null);

function openPageSettings() {
    showPageSettings.value = true;
}

const buttonDisabled = ref(false);
const blocking = ref(false);
const blockConfirmPending = ref(false);

const plainText = computed(() =>
    (props.page.content || "").replace(/<\/?[^>]+(>|$)/g, "")
);
const hasContent = computed(() => Boolean(plainText.value));

const canAddToCollage = computed(() => {
    return (
        props.page.media_path &&
        !isVideo(props.page.media_path) &&
        !props.page.video_link &&
        props.collages.length > 0
    );
});

const bookCoverSrc = computed(
    () => props.page.book?.cover_image?.media_path || null
);

// A soft, blurred copy of the media sits behind the whole page, picture and
// text alike. Videos use their poster; embeds get the plain dark table.
const backdropSrc = computed(() => {
    const { media_path: path, media_poster: poster } = props.page;
    if (path && !isVideo(path)) return path;
    return poster || null;
});

const hasFooter = computed(
    () =>
        unref(canEditPages) ||
        canAddToCollage.value ||
        isMoviesCategory.value ||
        hasContent.value
);

const pageTurns = computed(() =>
    [
        {
            side: "-left-2 sm:-left-14 lg:-left-20",
            page: props.previousPage,
            icon: "ri-arrow-left-s-line",
            label: t("page.previous"),
        },
        {
            side: "-right-2 sm:-right-14 lg:-right-20",
            page: props.nextPage,
            icon: "ri-arrow-right-s-line",
            label: t("page.next"),
        },
    ].filter((turn) => turn.page)
);

const canSharePage = computed(() => {
    return (
        messagingEnabled.value &&
        Boolean(
            props.page.media_path ||
                props.page.video_link ||
                props.page.media_poster
        ) &&
        Boolean(usePage().props.auth?.user)
    );
});

const isMoviesCategory = computed(() => {
    return props.page.book?.category?.name === "movies";
});

const blockPage = async () => {
    if (blocking.value || blockConfirmPending.value) return;

    blockConfirmPending.value = true;
    try {
        const confirmMessage = t("page.block_confirm_dialog");
        const okPromise = askConfirm(confirmMessage);
        speak(confirmMessage);
        const ok = await okPromise;
        if (!ok) {
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
                },
            }
        );
    } finally {
        blockConfirmPending.value = false;
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
        router.get(route("pages.show", { page: props.nextPage?.id }));
    } else if (dx > 0 && props.previousPage) {
        buttonDisabled.value = true;
        router.get(route("pages.show", { page: props.previousPage?.id }));
    }
}
</script>

<style scoped>
/* The page view reads as one page of a picture book: the picture sized to
   the screen, the text printed underneath, all over a blurred copy of the
   picture. Heights come from the nav tokens in app.css. */
.book-table {
    --plate-reserve: 1.5rem;
    --plate-h: max(16rem, calc(var(--app-stage-h) - var(--plate-reserve)));
    background: #030712;
}

.book-table__backdrop {
    position: absolute;
    inset: 0;
    z-index: -2;
    height: 100%;
    width: 100%;
    object-fit: cover;
    pointer-events: none;
    filter: blur(48px) saturate(1.3) brightness(0.55);
    transform: scale(1.2);
}

/* Darkens toward the text so it stays readable whatever the picture. */
.book-table__shade {
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background: radial-gradient(
            ellipse 90% 60% at 50% calc(var(--app-stage-h) / 2),
            transparent 35%,
            rgb(3 7 18 / 0.55) 100%
        ),
        linear-gradient(
            to bottom,
            rgb(3 7 18 / 0.1) 0,
            rgb(3 7 18 / 0.35) calc(var(--app-stage-h) - 4rem),
            rgb(3 7 18 / 0.72) calc(var(--app-stage-h) + 10rem)
        );
}

.book-chip {
    display: inline-flex;
    max-width: min(100%, 22rem);
    min-height: 3rem;
    align-items: center;
    gap: 0.625rem;
    padding: 0.25rem 1rem 0.25rem 0.25rem;
    border-radius: 9999px;
    background: rgb(17 24 39 / 0.72);
    outline: 1px solid rgb(255 255 255 / 0.14);
    box-shadow: 0 4px 14px -4px rgb(0 0 0 / 0.7);
    color: #fff;
    font-family: "Spicy Rice", cursive;
    font-size: 1rem;
    letter-spacing: 0.02em;
    transition: background-color 150ms ease-out;
}

.book-chip:hover {
    background: rgb(49 46 129 / 0.92);
}

.book-chip:focus-visible {
    outline: 3px solid #fbbf24;
    outline-offset: 2px;
}

.book-chip__cover {
    display: flex;
    height: 2.5rem;
    width: 2rem;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 5px;
    background: #4338ca;
    box-shadow: 0 0 0 1px rgb(255 255 255 / 0.3);
}

/* Phones: the arrows stay on the picture so they never cover the text.
   Wider: they follow the reader down the page, centred in the viewport. */
.book-table__rail {
    position: relative;
    top: calc(var(--plate-h) / 2);
}

@media (min-width: 640px) {
    .book-table__rail {
        position: sticky;
        top: calc(var(--app-header-h) + var(--app-stage-h) / 2);
    }
}

.page-turn {
    position: absolute;
    top: 0;
    display: inline-flex;
    height: 3.5rem;
    width: 3.5rem;
    translate: 0 -50%;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    background: rgb(17 24 39 / 0.6);
    color: #fff;
    font-size: 2.25rem;
    line-height: 1;
    box-shadow: 0 6px 16px -6px rgb(0 0 0 / 0.7);
    outline: 1px solid rgb(255 255 255 / 0.18);
    transition: background-color 150ms ease-out, color 150ms ease-out,
        scale 150ms ease-out;
}

.page-turn:hover {
    background: #fbbf24;
    color: #111827;
}

.page-turn:active {
    scale: 0.94;
}

.page-turn:focus-visible {
    outline: 3px solid #fbbf24;
    outline-offset: 2px;
}

.page-turn:disabled {
    opacity: 0.35;
}

.book-page {
    color: rgb(255 255 255 / 0.94);
}

/* Leave a line of text peeking below the picture, except on short
   landscape screens where the picture needs every pixel. */
.book-table--with-text {
    --plate-reserve: 4.5rem;
}

@media (max-height: 700px) {
    .book-table--with-text {
        --plate-reserve: 1.5rem;
    }
}

.book-page__plate {
    display: flex;
    height: var(--plate-h);
    align-items: center;
    justify-content: center;
    container-type: size;
}

.book-page__plate :deep(img),
.book-page__plate :deep(video) {
    border-radius: 0.5rem;
    background: #000;
    box-shadow: 0 18px 40px -12px rgb(0 0 0 / 0.75);
}

.book-page__embed {
    width: min(100cqw, calc(100cqh * 16 / 9));
    aspect-ratio: 16 / 9;
    border-radius: 0.5rem;
    box-shadow: 0 18px 40px -12px rgb(0 0 0 / 0.75);
}

.book-page__text {
    margin-top: clamp(1.5rem, 3.5vw, 2.5rem);
}

.book-page__text :deep(.page-content) {
    max-width: 65ch;
    margin-inline: auto;
    font-size: clamp(1.125rem, 1.6vw, 1.3rem);
    text-align: left;
    text-shadow: 0 1px 2px rgb(0 0 0 / 0.55);
}

.book-page__text :deep(.page-content p:first-of-type::first-letter) {
    font-family: "Spicy Rice", cursive;
    font-size: 2.7em;
    line-height: 0.8;
    margin: 0.06em 0.12em 0 0;
    color: #fbbf24;
}

.book-page__text :deep(.page-content ::selection) {
    background: rgb(251 191 36 / 0.4);
}

.book-page__foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    max-width: 65ch;
    margin: 1.5rem auto 0;
    padding-top: 0.75rem;
    border-top: 1px solid rgb(255 255 255 / 0.14);
}

.book-page__colophon {
    font-family: Newsreader, serif;
    font-size: 0.875rem;
    font-style: italic;
    color: rgb(255 255 255 / 0.65);
}

@media (prefers-reduced-motion: reduce) {
    .page-turn,
    .book-chip {
        transition: none;
    }
}
</style>
