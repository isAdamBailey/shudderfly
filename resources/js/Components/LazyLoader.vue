<template>
  <div :class="containerClasses">
    <img
      v-if="isLoading"
      :src="placeholder"
      :class="imageClasses"
      alt="placeholder image"
      loading="lazy"
    />
    <div v-else-if="isVideo(imageSrc)" :class="containerClasses">
      <video
        ref="videoRef"
        :controls="!isCover"
        disablepictureinpicture
        controlslist="nodownload"
        :poster="poster"
        :class="imageClasses"
        playsinline
        @timeupdate="handleTimeUpdate"
        @play="handlePlayPause"
        @pause="handlePlayPause"
        @error="handleMediaError"
      >
        <source :src="imageSrc" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <Button
        v-if="isButtonVisible"
        class="absolute top-0 right-0 h-8 w-8 flex items-center justify-center"
        title="Take Snapshot"
        :disabled="!canTakeSnapshot || !isPaused"
        @click="takeSnapshot"
      >
        <i
          :class="`${
            isOnCooldown ? 'ri-speak-fill' : 'ri-camera-line'
          } text-3xl`"
        ></i>
      </Button>
    </div>
    <img
      v-else
      ref="image"
      :class="imageClasses"
      :src="imageSrc"
      :alt="alt"
      :loading="loading"
      :decoding="decoding"
      :fetchpriority="optimizedFetchPriority"
      @error="handleMediaError"
      @load="handleImageLoad"
    />
    <span v-if="!pageId && !isCover">
      <TypePill v-if="isPoster(imageSrc)" type="Video" />
      <TypePill v-if="isSnapshot(imageSrc)" type="Screenshot" />
    </span>
  </div>
</template>

<script setup>
import Button from "@/Components/Button.vue";
import TypePill from "@/Components/TypePill.vue";
import { useSnapshotCooldown } from "@/composables/useSnapshotCooldown";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useMedia } from "@/mediaHelpers";
import { useForm, usePage } from "@inertiajs/vue3";
import { useImage } from "@vueuse/core";
import { computed, onUnmounted, ref } from "vue";

const { isVideo, isPoster, isSnapshot } = useMedia();
const videoRef = ref(null);
const { speak } = useSpeechSynthesis();
const user = usePage().props.auth.user;

const props = defineProps({
  src: {
    type: String,
    default: null
  },
  poster: {
    type: String,
    default: null
  },
  alt: {
    type: String,
    default: "image"
  },
  classes: {
    type: String,
    default: "rounded-lg"
  },
  isCover: {
    type: Boolean,
    default: false
  },
  bookId: {
    type: [String, Number],
    default: null
  },
  pageId: {
    type: [String, Number],
    default: null
  },
  objectFit: {
    type: String,
    default: "contain",
    validator: (value) =>
      ["contain", "cover", "fill", "none", "scale-down"].includes(value)
  },
  fillContainer: {
    type: Boolean,
    default: false
  },
  loading: {
    type: String,
    default: "lazy",
    validator: (value) => ["lazy", "eager"].includes(value)
  },
  decoding: {
    type: String,
    default: "async",
    validator: (value) => ["sync", "async", "auto"].includes(value)
  },
  fetchPriority: {
    type: String,
    default: "auto",
    validator: (value) => ["high", "low", "auto"].includes(value)
  }
});

const placeholder = "/img/photo-placeholder.png";
const imageSrc = ref(props.src || placeholder);
const { isLoading } = useImage({ src: computed(() => imageSrc.value) });

const { isOnCooldown, setCooldown, resetCooldown, remainingMinutes } =
  useSnapshotCooldown();

const form = useForm({
  book_id: props.bookId,
  page_id: props.pageId,
  video_time: null,
  video_url: null
});

const canTakeSnapshot = ref(false);
const isPaused = ref(true);

const imageClasses = computed(() => {
  if (props.fillContainer) {
    return `w-full h-full object-${props.objectFit}`;
  }

  // For videos, use max dimensions instead of fixed height to preserve aspect ratio
  if (isVideo(imageSrc.value)) {
    return `max-w-full max-h-[70vh] object-${props.objectFit}`;
  }

  return `w-auto h-[70vh] object-${props.objectFit}`;
});

const containerClasses = computed(() => {
  if (props.fillContainer) {
    return "relative w-full h-full flex items-center justify-center";
  }
  return "relative flex items-center justify-center";
});

// Computed property for optimized fetch priority
const optimizedFetchPriority = computed(() => {
  if (window.innerWidth <= 768 && props.loading === "lazy") {
    return "low";
  }
  return props.fetchPriority;
});

const isButtonVisible = computed(() => {
  return (
    !props.isCover && props.bookId && usePage().props.settings?.snapshot_enabled
  );
});

const handleMediaError = () => {
  imageSrc.value = placeholder;
};

const handleImageLoad = () => {
  // Optimize memory usage by reducing image quality on mobile devices
  if (window.innerWidth <= 768 && imageSrc.value !== placeholder) {
    const img = document.querySelector(`img[src="${imageSrc.value}"]`);
    if (img) {
      // Force garbage collection hint for mobile browsers
      img.style.willChange = "auto";
    }
  }
};

const handlePlayPause = () => {
  if (!videoRef.value) return;
  isPaused.value = videoRef.value.paused;
};

const handleTimeUpdate = () => {
  if (!videoRef.value) return;
  canTakeSnapshot.value = videoRef.value.currentTime > 0;
};

const takeSnapshot = () => {
  if (!canTakeSnapshot.value) return;
  if (isOnCooldown.value) {
    const timeMessage =
      remainingMinutes.value <= 1
        ? "less than one minute"
        : `${remainingMinutes.value} minutes`;
    speak(`Please wait ${timeMessage} before taking another screenshot`);
    return;
  }
  setCooldown();
  canTakeSnapshot.value = false;

  // Get the current video source URL
  const videoElement = videoRef.value;
  const videoSource = videoElement?.querySelector("source");
  const videoUrl = videoSource?.src || imageSrc.value;

  if (!videoUrl || !videoElement?.currentTime) {
    resetCooldown();
    canTakeSnapshot.value = true;
    return;
  }

  form.video_time = videoElement.currentTime;
  form.video_url = videoUrl;

  // eslint-disable-next-line no-undef
  form.post(route("pages.snapshot"), {
    preserveScroll: true,
    onSuccess: () => {
      speak(`${user.name}, I got your screenshot.`);
    },
    onError: (err) => {
      resetCooldown();
      canTakeSnapshot.value = true;
      console.error("Error taking screenshot:", err);
    }
  });
};

onUnmounted(() => {
  // Clean up image references to help with garbage collection
  imageSrc.value = null;
});
</script>
