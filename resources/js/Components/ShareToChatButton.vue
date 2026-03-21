<script setup>
/* global route */
import Button from "@/Components/Button.vue";
import UserTagList from "@/Components/UserTagList.vue";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
import { router, usePage } from "@inertiajs/vue3";
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";

const props = defineProps({
  kind: {
    type: String,
    default: "game",
    validator: (v) => v === "game" || v === "page",
  },
  gameSlug: { type: String, default: undefined },
  score: { type: Number, default: undefined },
  pageId: { type: [Number, String], default: undefined },
  wrapperClass: {
    type: String,
    default:
      "flex flex-wrap items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 p-2",
  },
});

const page = usePage();

const users = computed(() => page.props.users ?? []);
const { speak, speaking } = useSpeechSynthesis();
const { t } = useTranslations();

const sharing = ref(false);
const hasSharedToday = ref(false);
const shareMenuOpen = ref(false);
const shareMenuContainerRef = ref(null);
const selectedShareUserId = ref(null);
const shareButtonRef = ref(null);
const shareMenuRef = ref(null);
const shareMenuStyles = ref({});

const messagingEnabled = computed(() => {
  const value = page.props.settings?.messaging_enabled;
  return value === "1" || value === 1 || value === true;
});

const canShare = computed(() => {
  return messagingEnabled.value && Boolean(page.props.auth?.user);
});

const isShareDisabled = computed(() => {
  return hasSharedToday.value || sharing.value;
});

const shareActionLabel = computed(() => {
  return hasSharedToday.value
    ? t("already_shared_today")
    : t("share_to_timeline");
});

const storageKey = () => {
  const today = new Date().toISOString().split("T")[0];
  if (props.kind === "page") {
    return `page_share_${props.pageId}_${today}`;
  }
  return `game_score_share_${props.gameSlug}_${today}`;
};

const checkIfSharedToday = () => {
  hasSharedToday.value = localStorage.getItem(storageKey()) !== null;
};

const shareToChat = (taggedUserId = null) => {
  if (isShareDisabled.value) return;

  sharing.value = true;
  shareMenuOpen.value = false;
  selectedShareUserId.value = null;

  const tagged = taggedUserId ? [taggedUserId] : [];
  const options = {
    preserveScroll: true,
    onSuccess: () => {
      localStorage.setItem(storageKey(), Date.now().toString());
      hasSharedToday.value = true;
      sharing.value = false;
    },
    onError: () => {
      sharing.value = false;
    },
  };

  if (props.kind === "page") {
    router.post(
      route("pages.share", props.pageId),
      { tagged_user_ids: tagged },
      options
    );
  } else {
    router.post(
      route("games.share-score", props.gameSlug),
      {
        score: props.score,
        tagged_user_ids: tagged,
      },
      options
    );
  }
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
  shareToChat(user.id);
};

const handleShareSelectNone = () => {
  selectedShareUserId.value = null;
  shareToChat(null);
};

const handleShareMenuClickOutside = (event) => {
  if (!shareMenuOpen.value) return;
  const container = shareMenuContainerRef.value;
  const menu = shareMenuRef.value;
  if (container?.contains(event.target) || menu?.contains(event.target)) {
    return;
  }
  shareMenuOpen.value = false;
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
    width: `${menuWidth}px`,
  };
};

onMounted(() => {
  checkIfSharedToday();
  document.addEventListener("click", handleShareMenuClickOutside);
  window.addEventListener("resize", updateShareMenuPosition, { passive: true });
  window.addEventListener("scroll", updateShareMenuPosition, { passive: true });
});

onUnmounted(() => {
  document.removeEventListener("click", handleShareMenuClickOutside);
  window.removeEventListener("resize", updateShareMenuPosition);
  window.removeEventListener("scroll", updateShareMenuPosition);
});
</script>

<template>
  <div v-if="canShare" :class="wrapperClass">
    <Button
      type="button"
      :disabled="speaking"
      class="h-10 w-10 flex items-center justify-center"
      :title="t('page.speak_share_action')"
      :aria-label="t('page.speak_share_action_aria')"
      @click="speak(shareActionLabel)"
    >
      <i class="ri-speak-fill text-2xl"></i>
    </Button>
    <div ref="shareMenuContainerRef" class="relative flex items-center">
      <Button
        ref="shareButtonRef"
        type="button"
        :disabled="isShareDisabled || sharing"
        class="h-10 flex items-center justify-center gap-2"
        :title="
          hasSharedToday ? t('already_shared_today') : t('share_to_timeline')
        "
        @click.stop="toggleShareMenu"
      >
        <i v-if="sharing" class="ri-loader-line text-xl animate-spin"></i>
        <i v-else class="ri-share-line text-xl"></i>
        <span>{{ t("share_to_timeline") }}</span>
      </Button>
      <Teleport to="body">
        <div
          v-if="shareMenuOpen"
          ref="shareMenuRef"
          class="fixed w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-[200] max-h-72 overflow-y-auto"
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
      </Teleport>
    </div>
  </div>
</template>
