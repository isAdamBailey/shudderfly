<template>
    <div class="book-cover-container">
        <div
            class="relative mx-auto book-wrapper"
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
                    transform: finalTransform,
                }"
                role="button"
                tabindex="0"
                @click="reloadBook"
            >
                <div class="absolute inset-0 bg-black/20"></div>

                <div
                    class="relative w-full h-full flex flex-col justify-between p-8 z-10"
                >
                    <div
                        class="flex-1 flex items-start justify-center pt-8 px-4"
                    >
                        <div class="text-center w-full max-w-full">
                            <h1
                                class="book-title font-heading uppercase text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 md:mb-6 tracking-[0.05em] leading-tight break-words hyphens-auto px-2"
                                :data-text="book.title"
                                :style="{
                                    transform: `translateY(${
                                        finalTilt * -8 - scrollProgress * 12
                                    }px)`,
                                    opacity:
                                        0.9 +
                                        Math.abs(finalTilt) * 0.1 +
                                        scrollProgress * 0.15,
                                }"
                            >
                                {{ book.title }}
                            </h1>
                            <p
                                v-if="book.excerpt"
                                class="text-white text-base md:text-lg lg:text-xl italic max-w-2xl mx-auto mb-3 md:mb-4 leading-relaxed drop-shadow-lg font-content"
                                :style="{
                                    transform: `translateY(${
                                        finalTilt * -3 - scrollProgress * 6
                                    }px)`,
                                    opacity:
                                        0.9 +
                                        Math.abs(finalTilt) * 0.08 +
                                        scrollProgress * 0.12,
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
                                    finalTilt * 4 + scrollProgress * 8
                                }px)`,
                                opacity:
                                    0.9 +
                                    Math.abs(finalTilt) * 0.08 +
                                    scrollProgress * 0.12,
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
                                    popularity
                                    {{ book.popularity_percentage ?? 0 }}%
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
                            Math.abs(finalTilt + finalRoll) * 15 +
                            scrollProgress * 35
                        }px)`,
                        width: `${
                            32 +
                            Math.abs(finalTilt + finalRoll) * 8 +
                            scrollProgress * 20
                        }px`,
                    }"
                ></div>

                <!-- Book pages visible on the side -->
                <div
                    class="book-pages"
                    :style="{
                        transform: `translateZ(${
                            Math.abs(finalTilt + finalRoll) * 12 +
                            scrollProgress * 30
                        }px)`,
                        left: `${
                            28 +
                            Math.abs(finalTilt + finalRoll) * 6 +
                            scrollProgress * 16
                        }px`,
                    }"
                ></div>

                <div
                    class="book-border absolute inset-0 rounded-lg pointer-events-none"
                ></div>
            </div>

            <div
                class="book-shadow"
                :style="{
                    opacity:
                        0.4 -
                        Math.abs(finalTilt + finalRoll) * 0.15 -
                        scrollProgress * 0.25,
                    transform: `scaleX(${
                        1 +
                        Math.abs(finalTilt + finalRoll) * 0.2 +
                        scrollProgress * 0.4
                    })`,
                }"
            ></div>
        </div>
    </div>
</template>

<script setup>
import { usePermissions } from "@/composables/permissions";
import { useDate } from "@/dateHelpers";
import { useParallax } from "@vueuse/core";
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

const bookCoverRef = ref(null);
const { tilt, roll } = useParallax(bookCoverRef, {
    mouseTiltAdjust: (i) => i * 2.0,
    mouseRollAdjust: (i) => i * 2.0,
    deviceOrientationTiltAdjust: (i) => i * 2.5,
    deviceOrientationRollAdjust: (i) => i * 2.5,
});

const openDistance = ref(150);

import { usePreferredReducedMotion, useScroll } from "@vueuse/core";

const { y: scrollY } = useScroll(window);
const prefersReducedMotion = usePreferredReducedMotion();

const scrollProgress = computed(() => {
    if (prefersReducedMotion.value === "reduce") return 0;
    return Math.max(0, Math.min(1, scrollY.value / openDistance.value));
});

const hasUserInteracted = ref(false);

const handleUserInteraction = () => {
    if (!hasUserInteracted.value) {
        hasUserInteracted.value = true;
    }
};

onMounted(() => {
    const handleMouseMove = () => handleUserInteraction();
    const handleScroll = () => handleUserInteraction();
    const handleTouchStart = () => handleUserInteraction();
    const handleKeyDown = () => handleUserInteraction();
    const handleClick = () => handleUserInteraction();

    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("touchstart", handleTouchStart, {
        passive: true,
    });
    document.addEventListener("keydown", handleKeyDown, { passive: true });
    document.addEventListener("click", handleClick, { passive: true });

    if (bookCoverRef.value) {
        bookCoverRef.value.addEventListener(
            "mousemove",
            handleUserInteraction,
            {
                passive: true,
            }
        );
    }

    onUnmounted(() => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("scroll", handleScroll);
        document.removeEventListener("touchstart", handleTouchStart);
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("click", handleClick);

        if (bookCoverRef.value) {
            bookCoverRef.value.removeEventListener(
                "mousemove",
                handleUserInteraction
            );
        }
    });
});

import { useTransition } from "@vueuse/core";

const effectiveTilt = computed(() => {
    if (prefersReducedMotion.value === "reduce" || !hasUserInteracted.value)
        return 0;
    return Math.abs(tilt.value) > 0.005 ? tilt.value : 0;
});

const effectiveRoll = computed(() => {
    if (prefersReducedMotion.value === "reduce" || !hasUserInteracted.value)
        return 0;
    return Math.abs(roll.value) > 0.005 ? roll.value : 0;
});

const smoothTilt = useTransition(effectiveTilt, { duration: 150 });
const smoothRoll = useTransition(effectiveRoll, { duration: 150 });

import { useElementHover } from "@vueuse/core";

const isHovered = useElementHover(bookCoverRef);
const hoverScale = computed(() => {
    if (prefersReducedMotion.value === "reduce") return 1;
    return isHovered.value ? 1.02 : 1;
});

const finalTilt = computed(() => (hasUserInteracted.value ? smoothTilt : 0));
const finalRoll = computed(() => (hasUserInteracted.value ? smoothRoll : 0));

const finalTransform = computed(() => {
    if (!hasUserInteracted.value) {
        return `perspective(1500px) scale(${
            hoverScale.value
        }) rotateX(0deg) rotateY(0deg) translateZ(${
            scrollProgress.value * 50
        }px) translateX(${scrollProgress.value * 25}px)`;
    }

    return `perspective(1500px) scale(${hoverScale.value}) rotateX(${
        smoothTilt.value * 18 + scrollProgress.value * 18
    }deg) rotateY(${
        -smoothRoll.value * 30 - scrollProgress.value * 40
    }deg) translateZ(${
        Math.abs(smoothTilt.value + smoothRoll.value) * 30 +
        scrollProgress.value * 50
    }px) translateX(${-smoothRoll.value * 20 - scrollProgress.value * 25}px)`;
});
</script>

<style scoped>
.book-cover-container {
    padding: 0.75rem;
    margin-top: 0;
    position: relative;
    perspective: 1500px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.book-wrapper {
    max-width: min(500px, calc(80vh * 3 / 4));
    width: 100%;
    aspect-ratio: 3/4;
    max-height: 80vh;
}

.book-cover {
    position: relative;
    transform-style: preserve-3d;
    transition: all 0.3s ease, transform 0.2s ease;
    animation: bookAppear 1.5s ease-out;
    transform: perspective(1000px) scale(1) rotateX(0deg) rotateY(0deg)
        translateZ(0px) translateX(0px);
}

@keyframes bookAppear {
    0% {
        opacity: 0;
        transform: perspective(1500px) translateY(40px) scale(0.9)
            rotateX(15deg) rotateY(10deg) translateZ(0px) translateX(0px);
    }
    100% {
        opacity: 1;
        transform: perspective(1500px) translateY(0) scale(1) rotateX(0deg)
            rotateY(0deg) translateZ(0px) translateX(0px);
    }
}

.book-cover:active {
    transform: scale(0.98);
    transition: transform 0.1s ease;
}

.book-spine {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 32px;
    background: linear-gradient(to left, #1f2937, #374151, #1f2937);
    box-shadow: inset 4px 0 8px rgba(0, 0, 0, 0.6),
        inset -3px 0 3px rgba(255, 255, 255, 0.15),
        -2px 0 8px rgba(0, 0, 0, 0.3);
    transform: translateZ(20px);
    transition: all 0.3s ease;
    border-left: 2px solid rgba(0, 0, 0, 0.4);
}

.book-pages {
    position: absolute;
    left: 28px;
    top: 4px;
    bottom: 4px;
    width: 8px;
    background: repeating-linear-gradient(
        to bottom,
        #f3f4f6 0px,
        #e5e7eb 1px,
        #f9fafb 2px
    );
    box-shadow: inset 2px 0 4px rgba(0, 0, 0, 0.2),
        -2px 0 4px rgba(0, 0, 0, 0.2);
    transform: translateZ(18px);
    transition: all 0.3s ease;
    border-left: 1px solid rgba(0, 0, 0, 0.2);
    border-right: 1px solid rgba(0, 0, 0, 0.1);
}

.book-shadow {
    position: absolute;
    bottom: -30px;
    left: 5%;
    right: 5%;
    height: 30px;
    background: radial-gradient(
        ellipse at center,
        rgba(0, 0, 0, 0.5) 0%,
        rgba(0, 0, 0, 0.3) 40%,
        transparent 80%
    );
    border-radius: 50%;
    filter: blur(15px);
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
    word-wrap: break-word;
    overflow-wrap: break-word;
    max-width: 100%;
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
    border: 6px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.1),
        inset 0 0 20px rgba(255, 255, 255, 0.05), 0 8px 32px rgba(0, 0, 0, 0.3),
        inset -3px 0 6px rgba(0, 0, 0, 0.2);
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
