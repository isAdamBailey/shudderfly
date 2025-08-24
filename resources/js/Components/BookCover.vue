<template>
    <div class="book-cover-container">
        <div
            class="relative mx-auto max-w-4xl"
            :class="hasCoverImage ? 'h-full' : ''"
        >
            <div
                ref="bookCoverRef"
                class="book-cover book-texture relative w-full h-full rounded-lg overflow-hidden shadow-2xl transform transition-all duration-300 cursor-pointer"
                :class="
                    hasCoverImage
                        ? 'bg-cover bg-center'
                        : 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-900'
                "
                :style="{
                    backgroundImage: hasCoverImage
                        ? `url(${book.cover_image.media_path})`
                        : '',
                    transform: `perspective(1000px)
                     rotateX(${Math.pow(scrollProgress, 0.7) * 10}deg) 
                     rotateY(${Math.pow(scrollProgress, 0.7) * 28}deg) 
                     translateZ(${Math.pow(scrollProgress, 0.7) * 35}px)
                     translateX(${Math.pow(scrollProgress, 0.7) * 20}px)`,
                }"
                role="button"
                tabindex="0"
                @click="reloadBook"
            >
                <div class="absolute inset-0 bg-black/20"></div>

                <div
                    class="relative w-full h-full flex flex-col justify-between p-8 z-10"
                >
                    <div class="flex-1 flex items-start justify-center pt-8">
                        <div class="text-center">
                            <h1
                                class="book-title font-heading uppercase text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 md:mb-6 tracking-[0.1em] leading-tight"
                                :data-text="book.title"
                                :style="{
                                    transform: `translateY(${
                                        Math.pow(scrollProgress, 0.7) * -14
                                    }px)`,
                                    opacity:
                                        0.9 +
                                        Math.pow(scrollProgress, 0.7) * 0.12,
                                }"
                            >
                                {{ book.title }}
                            </h1>
                            <p
                                v-if="book.excerpt"
                                class="text-white text-base md:text-lg lg:text-xl italic max-w-2xl mx-auto mb-3 md:mb-4 leading-relaxed drop-shadow-lg font-content"
                                :style="{
                                    transform: `translateY(${
                                        Math.pow(scrollProgress, 0.8) * -5
                                    }px)`,
                                    opacity:
                                        0.9 +
                                        Math.pow(scrollProgress, 0.8) * 0.1,
                                }"
                            >
                                {{ book.excerpt }}
                            </p>
                        </div>
                    </div>

                    <div class="flex justify-center items-center mb-6">
                        <div
                            class="text-center space-y-1"
                            :style="{
                                transform: `translateY(${
                                    Math.pow(scrollProgress, 0.8) * 8
                                }px)`,
                                opacity:
                                    0.9 + Math.pow(scrollProgress, 0.8) * 0.1,
                            }"
                        >
                            <p
                                v-if="book.author"
                                class="text-white text-sm font-semibold drop-shadow-lg"
                            >
                                by {{ book.author }}
                            </p>
                            <p
                                class="text-white text-xs font-medium drop-shadow-lg"
                            >
                                {{ short(book.created_at) }}
                            </p>
                            <span v-if="canEditPages" class="block space-y-0.5">
                                <p class="text-white text-xs drop-shadow-lg">
                                    {{ pages.total }} pages
                                </p>
                                <p class="text-white text-xs drop-shadow-lg">
                                    Read
                                    {{
                                        Math.round(
                                            book.read_count
                                        ).toLocaleString()
                                    }}
                                    times
                                </p>
                            </span>
                            <p
                                v-if="book.category"
                                class="text-xs uppercase font-semibold text-gray-800 bg-white/90 px-2 py-0.5 rounded-full inline-block drop-shadow-sm"
                            >
                                {{ book.category.name }}
                            </p>
                        </div>
                    </div>
                </div>

                <div
                    class="book-spine"
                    :style="{
                        transform: `translateZ(${
                            Math.pow(scrollProgress, 0.7) * 28
                        }px)`,
                        width: `${Math.pow(scrollProgress, 0.7) * 16}px`,
                    }"
                ></div>

                <div
                    class="book-border absolute inset-0 rounded-lg pointer-events-none"
                ></div>
            </div>

            <div
                class="book-shadow"
                :style="{
                    opacity: 0.4 - scrollProgress * 0.2,
                    transform: `scaleX(${1 + scrollProgress * 0.3})`,
                }"
            ></div>
        </div>
    </div>
</template>

<script setup>
import { usePermissions } from "@/composables/permissions";
import { useDate } from "@/dateHelpers";
import { computed, onMounted, onUnmounted, ref } from "vue";

const { short } = useDate();
const { canEditPages } = usePermissions();

const props = defineProps({
    book: { type: Object, required: true },
    pages: { type: Object, required: true },
});

const hasCoverImage = computed(() => {
    return !!props.book.cover_image?.media_path;
});

const reloadBook = () => {
    window.location.reload();
};

// Scroll animation state
const bookCoverRef = ref(null);

// Normalized progress [0..1]
const scrollProgress = ref(0);

// Derived metrics and helpers
const openDistance = ref(360); // px distance over which the book "opens"
let ticking = false;
let reduceMotionQuery = null;

const clamp01 = (n) => Math.max(0, Math.min(1, n));

const computeOpenDistance = () => {
    const el = bookCoverRef.value;
    const h = el ? el.offsetHeight : 0;
    // Base distance on element height for consistency across screens,
    // bounded to keep the range feeling similar on very small/large displays.
    // Slightly shorter distance so the book appears fully open sooner.
    const target = h ? h * 0.65 : 300;
    openDistance.value = Math.max(200, Math.min(420, Math.round(target)));
};

const updateProgress = () => {
    if (!bookCoverRef.value) return;
    const y = window.pageYOffset || window.scrollY || 0;
    scrollProgress.value = clamp01(
        openDistance.value ? y / openDistance.value : 0
    );
};

const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
        updateProgress();
        ticking = false;
    });
};

const onResize = () => {
    computeOpenDistance();
    updateProgress();
};

onMounted(() => {
    // Respect reduced motion
    reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotionQuery.matches) {
        scrollProgress.value = 0;
        return;
    }

    computeOpenDistance();
    updateProgress();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
});

onUnmounted(() => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onResize);
});
</script>

<style scoped>
.book-cover-container {
    padding: 0.75rem;
    margin-top: 1.25rem;
    position: relative;
}

.book-cover {
    position: relative;
    transform-style: preserve-3d;
    transition: all 0.3s ease;
    animation: bookAppear 1.5s ease-out;
}

.book-cover:active {
    transform: scale(0.98);
    transition: transform 0.1s ease;
}

@keyframes bookAppear {
    0% {
        opacity: 0;
        transform: perspective(1000px) translateY(30px) scale(0.9) rotateX(0deg)
            rotateY(0deg);
    }
    100% {
        opacity: 1;
        transform: perspective(1000px) translateY(0) scale(1) rotateX(0deg)
            rotateY(0deg);
    }
}

.book-spine {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 12px;
    background: linear-gradient(to bottom, #1f2937, #111827, #1f2937);
    box-shadow: inset -3px 0 6px rgba(0, 0, 0, 0.5),
        inset 2px 0 2px rgba(255, 255, 255, 0.1);
    transform: translateZ(8px);
    transition: all 0.3s ease;
}

.book-shadow {
    position: absolute;
    bottom: -20px;
    left: 12px;
    right: 12px;
    height: 20px;
    background: radial-gradient(
        ellipse at center,
        rgba(0, 0, 0, 0.4) 0%,
        rgba(0, 0, 0, 0.2) 40%,
        transparent 80%
    );
    border-radius: 50%;
    filter: blur(10px);
    animation: shadowPulse 3s ease-in-out infinite;
}

@keyframes shadowPulse {
    0%,
    100% {
        opacity: 0.3;
        transform: scaleX(1);
    }
    50% {
        opacity: 0.5;
        transform: scaleX(1.1);
    }
}

.book-title {
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8), 0 4px 8px rgba(0, 0, 0, 0.6),
        0 8px 16px rgba(0, 0, 0, 0.4), 0 1px 0 rgba(255, 255, 255, 0.1),
        -1px 0 0 rgba(255, 255, 255, 0.1);
    position: relative;
    animation: titleGlow 2s ease-in-out infinite alternate;
}

@keyframes titleGlow {
    0% {
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8), 0 4px 8px rgba(0, 0, 0, 0.6),
            0 8px 16px rgba(0, 0, 0, 0.4), 0 1px 0 rgba(255, 255, 255, 0.1),
            -1px 0 0 rgba(255, 255, 255, 0.1);
    }
    100% {
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8), 0 4px 8px rgba(0, 0, 0, 0.6),
            0 8px 16px rgba(0, 0, 0, 0.4), 0 1px 0 rgba(255, 255, 255, 0.15),
            -1px 0 0 rgba(255, 255, 255, 0.15),
            0 0 20px rgba(255, 255, 255, 0.1);
    }
}

.book-title::before {
    content: attr(data-text);
    position: absolute;
    top: 0;
    left: 0;
    z-index: -1;
    color: rgba(0, 0, 0, 0.3);
    text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.5), 2px 2px 0 rgba(0, 0, 0, 0.3);
    transform: translate(2px, 2px);
}

.book-border {
    border: 4px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.1),
        inset 0 0 20px rgba(255, 255, 255, 0.05), 0 8px 32px rgba(0, 0, 0, 0.3);
}

.book-cover::before {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 0 30px 30px 0;
    border-color: transparent rgba(0, 0, 0, 0.2) transparent transparent;
    border-radius: 0 0 0 4px;
    z-index: 2;
    pointer-events: none;
}

.book-texture::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: radial-gradient(
            circle at 20% 80%,
            rgba(255, 255, 255, 0.1) 0%,
            transparent 50%
        ),
        radial-gradient(
            circle at 80% 20%,
            rgba(255, 255, 255, 0.1) 0%,
            transparent 50%
        ),
        linear-gradient(
            45deg,
            transparent 40%,
            rgba(255, 255, 255, 0.05) 50%,
            transparent 60%
        );
    pointer-events: none;
    z-index: 1;
}

.book-cover::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
        135deg,
        rgba(0, 0, 0, 0.2) 0%,
        rgba(0, 0, 0, 0.1) 25%,
        rgba(0, 0, 0, 0.3) 50%,
        rgba(0, 0, 0, 0.1) 75%,
        rgba(0, 0, 0, 0.2) 100%
    );
    pointer-events: none;
    z-index: 1;
}

.book-cover::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(
        circle at 30% 30%,
        rgba(255, 255, 255, 0.1) 0%,
        transparent 50%
    );
    pointer-events: none;
    z-index: 1;
}

.book-metadata {
    animation: metadataSlideIn 1s ease-out 0.3s both;
    transform-origin: center bottom;
}

@keyframes metadataSlideIn {
    0% {
        opacity: 0;
        transform: translateY(20px) scale(0.9);
    }
    100% {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}
</style>
