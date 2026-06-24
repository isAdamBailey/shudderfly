<script setup>
/* global route */
import Button from "@/Components/Button.vue";
import ConfirmDialog from "@/Components/ConfirmDialog.vue";
import PrimaryButton from "@/Components/PrimaryButton.vue";
import SpeakButton from "@/Components/SpeakButton.vue";
import ShareToChatButton from "@/Components/ShareToChatButton.vue";
import TextInput from "@/Components/TextInput.vue";
import VideoWrapper from "@/Components/VideoWrapper.vue";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { Head, router } from "@inertiajs/vue3";
import { useSpeechRecognition } from "@vueuse/core";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps({
  tmdbImageBaseUrl: {
    type: String,
    required: true,
  },
  favorites: {
    type: Array,
    default: () => [],
  },
  title: {
    type: String,
    default: null,
  },
  movieId: {
    type: Number,
    default: null,
  },
});

const { speak, speaking } = useSpeechSynthesis();
const { t } = useTranslations();

const browserLanguage =
  typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US";
const isSafariSpeechBrowser =
  typeof navigator !== "undefined" &&
  /Safari/i.test(navigator.userAgent) &&
  !/Chrome|Chromium|CriOS|Edg|OPR|Android/i.test(navigator.userAgent);

const { isSupported, isListening, isFinal, result, error, start, stop } =
  useSpeechRecognition({
    continuous: false,
    interimResults: !isSafariSpeechBrowser,
    lang: browserLanguage,
    maxAlternatives: 1,
  });

const finalTranscript = computed(() => result.value || "");
const speechErrorMessage = computed(() => {
  const rawError = error.value;
  if (!rawError) {
    return "";
  }
  if (typeof rawError === "string") {
    return rawError;
  }
  if (typeof rawError === "object") {
    const code = rawError.error || rawError.name || "";
    const message = rawError.message || "";
    if (message) {
      return message;
    }
    if (code === "not-allowed") {
      return t("search.voice_not_allowed");
    }
    if (code === "service-not-allowed") {
      return t("search.voice_service_not_allowed");
    }
    if (code === "audio-capture") {
      return t("search.voice_no_microphone");
    }
    if (code === "network") {
      return t("search.voice_network_error");
    }
    if (code === "no-speech") {
      return t("search.voice_no_speech");
    }
    if (code === "aborted") {
      return t("search.voice_aborted");
    }
    if (code) {
      return String(code);
    }
  }
  return String(rawError);
});
const hasGoodResult = computed(() => finalTranscript.value && isFinal.value);
const searchPlaceholder = computed(() => {
  if (isListening.value) {
    return t("search.listening");
  }

  return t("movie.search_placeholder");
});
const searchInputClass = computed(() => [
  "flex-1 w-full dark:bg-gray-800 dark:text-gray-100",
  isListening.value
    ? "border-red-700 border-2 dark:border-red-700 christmas:border-christmas-berry halloween:border-halloween-candy"
    : hasGoodResult.value && !isListening.value
      ? "border-green-600 border-2 dark:border-green-600 christmas:border-christmas-holly halloween:border-halloween-witch"
      : "dark:border-gray-600 border-gray-300 christmas:border-christmas-holly halloween:border-halloween-purple",
  isSupported.value ? "pr-5" : "",
]);

const searchQuery = ref("");
const searchResults = ref([]);
const movieTitle = ref("");
const castMembers = ref([]);
const movieDetails = ref(null);
const isLoading = ref(false);
const errorMessage = ref("");
const hasSearched = ref(false);
const favoritesList = ref([...props.favorites]);
const isRemoveDialogOpen = ref(false);
const pendingRemoveMovie = ref(null);
const speakingMemberId = ref(null);
const isSpeakingDescription = ref(false);

let speechTimeout = null;

const currentYear = new Date().getFullYear();

const trailerYoutubeUrl = computed(() => {
  if (!movieDetails.value?.trailer_key) {
    return null;
  }

  return `https://www.youtube.com/watch?v=${movieDetails.value.trailer_key}`;
});

const currentFavoriteMovie = computed(() => {
  if (!movieDetails.value) {
    return null;
  }

  return {
    id: movieDetails.value.id,
    title: movieDetails.value.title,
    image_path: movieDetails.value.poster_path || movieDetails.value.backdrop_path,
  };
});

const isCurrentMovieFavorite = computed(() => {
  if (!movieDetails.value) {
    return false;
  }

  return favoritesList.value.some((movie) => movie.id === movieDetails.value.id);
});

const removeDialogMessage = computed(() => {
  if (!pendingRemoveMovie.value?.title) {
    return t("movie.remove_favorite_confirm_dialog_generic");
  }

  return t("movie.remove_favorite_confirm_dialog", {
    title: pendingRemoveMovie.value.title,
  });
});

const showFavoritesUnderSearch = computed(() => {
  return !searchResults.value.length && !movieDetails.value;
});

const notifyError = (key, replacements = {}) => {
  const message = t(key, replacements);
  errorMessage.value = message;
  speak(message);
};

const openRemoveFavoriteDialog = (movie) => {
  pendingRemoveMovie.value = movie;
  isRemoveDialogOpen.value = true;
  speak(t("movie.remove_favorite_confirm_speak", { title: movie.title }));
};

const resetPage = () => {
  window.speechSynthesis?.cancel();
  if (isListening.value) {
    stop();
  }
  router.get(route("movie-cast.index"));
};

const getReleaseYear = (releaseDate) => {
  return releaseDate ? releaseDate.slice(0, 4) : t("movie.unknown_year");
};

const getProfileImageUrl = (profilePath) => `${props.tmdbImageBaseUrl}${profilePath}`;
const getMovieImageUrl = (path) => `${props.tmdbImageBaseUrl}${path}`;

const speakMovieTitle = (title) => {
  if (!title?.trim()) {
    return;
  }

  speak(title.trim());
};

const loadMovieById = async (
  movieId,
  preferredTitle,
  { preserveSearchResults = false } = {}
) => {
  isLoading.value = true;
  hasSearched.value = true;
  if (!preserveSearchResults) {
    searchResults.value = [];
  }
  castMembers.value = [];
  movieTitle.value = preferredTitle?.trim() || "";
  movieDetails.value = null;
  errorMessage.value = "";

  try {
    const [creditsResponse, detailsResponse] = await Promise.all([
      window.axios.get(route("movie-cast.credits", movieId)),
      window.axios.get(route("movie-cast.details", movieId)),
    ]);

    movieTitle.value = preferredTitle?.trim() || detailsResponse.data.title;
    castMembers.value = creditsResponse.data.cast;
    movieDetails.value = detailsResponse.data;
    speakMovieTitle(movieTitle.value);
  } catch {
    notifyError("movie.fetch_failed");
  } finally {
    isLoading.value = false;
  }
};

const onSubmit = async () => {
  const query = searchQuery.value.trim();
  errorMessage.value = "";
  hasSearched.value = true;
  isLoading.value = true;
  searchResults.value = [];
  castMembers.value = [];
  movieTitle.value = "";
  movieDetails.value = null;

  if (!query) {
    isLoading.value = false;
    notifyError("movie.search_empty");
    return;
  }

  try {
    const response = await window.axios.get(route("movie-cast.search"), {
      params: { query },
    });
    const movies = response.data;

    if (!movies.length) {
      notifyError("search.not_found_movies");
      return;
    }

    if (movies.length === 1) {
      await loadMovieById(movies[0].id, movies[0].title);
      return;
    }

    searchResults.value = movies;
  } catch {
    notifyError("movie.fetch_failed");
  } finally {
    isLoading.value = false;
  }
};

const onSelectSearchResult = async (movie) => {
  await loadMovieById(movie.id, movie.title, { preserveSearchResults: true });
};

const canReturnToSearchResults = computed(() => {
  return searchResults.value.length > 0 && !!movieDetails.value;
});

const returnToSearchResults = () => {
  movieDetails.value = null;
  castMembers.value = [];
  movieTitle.value = "";
  errorMessage.value = "";
  window.speechSynthesis?.cancel();
};

const onFavoriteButtonClick = async () => {
  if (!currentFavoriteMovie.value) {
    return;
  }

  if (isCurrentMovieFavorite.value) {
    openRemoveFavoriteDialog(currentFavoriteMovie.value);
    return;
  }

  try {
    const response = await window.axios.post(
      route("movie-cast.favorites.store"),
      currentFavoriteMovie.value
    );
    favoritesList.value = response.data;
  } catch {
    notifyError("movie.favorite_save_failed");
  }
};

const confirmRemoveFavorite = async () => {
  if (!pendingRemoveMovie.value) {
    return;
  }

  try {
    const response = await window.axios.delete(
      route("movie-cast.favorites.destroy", pendingRemoveMovie.value.id)
    );
    favoritesList.value = response.data;
  } catch {
    notifyError("movie.favorite_remove_failed");
  } finally {
    pendingRemoveMovie.value = null;
  }
};

const cancelRemoveFavorite = () => {
  pendingRemoveMovie.value = null;
};

const requestRemoveFavorite = (movie) => {
  openRemoveFavoriteDialog(movie);
};

const toggleVoiceSearch = async () => {
  if (!isSupported.value) {
    speak(t("search.voice_not_supported"));
    return;
  }

  if (isLoading.value) {
    return;
  }

  errorMessage.value = "";

  try {
    if (isListening.value) {
      stop();
    } else {
      start();
    }
  } catch (voiceError) {
    notifyError("search.voice_failed", { error: voiceError.message });
  }
};

watch(isListening, (listening) => {
  if (!listening && result.value?.trim()) {
    searchQuery.value = result.value.trim();
    void onSubmit();
  }
});

watch(result, (newResult) => {
  if (newResult?.trim() && isListening.value) {
    if (speechTimeout) {
      clearTimeout(speechTimeout);
    }
    speechTimeout = setTimeout(() => {
      if (isListening.value) {
        stop();
      }
    }, 2000);
  }
});

watch(error, () => {
  if (speechErrorMessage.value) {
    errorMessage.value = speechErrorMessage.value;
    speak(speechErrorMessage.value);
  }
});

const speakCharacter = (member) => {
  if (speakingMemberId.value === member.id) {
    window.speechSynthesis?.cancel();
    speakingMemberId.value = null;
    return;
  }

  const characterName = member.character?.trim() || t("movie.unknown_character");
  speakingMemberId.value = member.id;

  speak(characterName, () => {
    speakingMemberId.value = null;
  });
};

const speakMovieDescription = () => {
  if (isSpeakingDescription.value) {
    window.speechSynthesis?.cancel();
    isSpeakingDescription.value = false;
    return;
  }

  const description = movieDetails.value?.overview?.trim();
  if (!description) {
    notifyError("movie.no_description_speak");
    return;
  }

  isSpeakingDescription.value = true;
  speak(description, () => {
    isSpeakingDescription.value = false;
  });
};

onMounted(() => {
  if (props.movieId) {
    void loadMovieById(props.movieId, props.title?.trim() || undefined);
  } else if (props.title?.trim()) {
    searchQuery.value = props.title.trim();
    void onSubmit();
  }
});

onBeforeUnmount(() => {
  if (speechTimeout) {
    clearTimeout(speechTimeout);
  }
  if (isListening.value) {
    stop();
  }
  window.speechSynthesis?.cancel();
});
</script>

<template>
  <Head :title="t('movie.page_title')" />

  <AuthenticatedLayout>
    <template #header>
      <button type="button" @click="resetPage">
        <h2 class="font-heading text-2xl text-theme-title leading-tight">
          {{ t("movie.page_heading") }}
        </h2>
      </button>
    </template>

    <div class="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div class="space-y-8">
        <p class="text-gray-300">
          {{ t("movie.search_prompt") }}
        </p>

        <form class="flex flex-col sm:flex-row gap-3" @submit.prevent="onSubmit">
          <div class="flex gap-2 flex-1 min-w-0 items-center">
            <button
              v-if="isSupported"
              type="button"
              class="self-center w-8 h-8 flex-shrink-0 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 christmas:focus:ring-christmas-gold halloween:focus:ring-halloween-orange flex items-center justify-center"
              :class="{
                'bg-red-700 hover:bg-purple-400 dark:bg-red-700 dark:hover:bg-purple-400 text-white christmas:bg-christmas-berry christmas:hover:bg-christmas-mint halloween:bg-halloween-candy halloween:hover:bg-halloween-spooky':
                  isListening,
                'bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white christmas:bg-christmas-holly christmas:hover:bg-christmas-green halloween:bg-halloween-witch halloween:hover:bg-halloween-purple':
                  hasGoodResult && !isListening,
                'bg-blue-600 hover:bg-blue-700 dark:bg-gray-800 dark:hover:bg-gray-700 text-white christmas:bg-christmas-green christmas:hover:bg-christmas-holly halloween:bg-halloween-midnight halloween:hover:bg-halloween-witch':
                  !isListening && !hasGoodResult,
              }"
              :disabled="isLoading"
              :aria-label="isListening ? t('search.listening') : t('movie.voice_search_aria')"
              @click="toggleVoiceSearch"
            >
              <i
                :class="{
                  'ri-mic-line': !isListening,
                  'ri-mic-fill animate-pulse': isListening,
                  'ri-check-line': hasGoodResult && !isListening,
                }"
                class="text-lg"
                aria-hidden="true"
              ></i>
            </button>

            <div class="relative flex-1 min-w-0">
              <TextInput
                v-model="searchQuery"
                :class="searchInputClass"
                :placeholder="searchPlaceholder"
                :disabled="isLoading"
              />

              <div
                v-if="isSupported && speechErrorMessage"
                class="absolute right-2 top-1/2 transform -translate-y-1/2"
              >
                <div
                  class="bg-red-600 text-white christmas:bg-christmas-berry halloween:bg-halloween-candy text-xs rounded-full w-4 h-4 flex items-center justify-center"
                  :title="speechErrorMessage"
                >
                  !
                </div>
              </div>
            </div>
          </div>

          <PrimaryButton type="submit" :disabled="isLoading" class="self-center">
            {{ isLoading ? t("movie.searching") : t("movie.search_button") }}
          </PrimaryButton>
        </form>

        <p v-if="errorMessage" class="text-red-400">
          {{ errorMessage }}
        </p>

        <div v-if="showFavoritesUnderSearch" class="space-y-3">
          <h3 class="text-lg font-semibold text-gray-100">
            {{ t("movie.favorites_heading") }}
          </h3>
          <p v-if="!favoritesList.length" class="text-gray-400">
            {{ t("movie.favorites_empty") }}
          </p>
          <div
            v-else
            class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
          >
            <div
              v-for="movie in favoritesList"
              :key="movie.id"
              class="relative rounded-lg bg-gray-800 p-3"
            >
              <button
                type="button"
                class="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-colors hover:bg-red-600"
                :aria-label="t('movie.remove_favorite_aria')"
                @click="requestRemoveFavorite(movie)"
              >
                <i class="ri-close-line text-base" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="w-full text-left"
                @click="loadMovieById(movie.id, movie.title)"
              >
                <img
                  v-if="movie.image_path"
                  :src="getMovieImageUrl(movie.image_path)"
                  :alt="movie.title"
                  class="w-full aspect-[2/3] object-cover rounded-md"
                />
                <div
                  v-else
                  class="w-full aspect-[2/3] rounded-md bg-gray-700 flex items-center justify-center text-gray-400 text-sm"
                >
                  {{ t("movie.no_image") }}
                </div>
                <p class="mt-2 text-sm font-semibold text-gray-100">
                  {{ movie.title }}
                </p>
              </button>
            </div>
          </div>
        </div>

        <div v-if="searchResults.length && !movieDetails" class="space-y-3">
          <h3 class="text-lg font-semibold text-gray-100">
            {{ t("movie.multiple_results") }}
          </h3>
          <div class="grid gap-2">
            <button
              v-for="movie in searchResults"
              :key="movie.id"
              type="button"
              class="flex items-center gap-4 rounded-lg bg-gray-800 p-3 text-left hover:bg-gray-700 transition-colors"
              @click="onSelectSearchResult(movie)"
            >
              <img
                v-if="movie.poster_path"
                :src="getMovieImageUrl(movie.poster_path)"
                :alt="movie.title"
                class="h-20 w-14 object-cover rounded"
              />
              <div>
                <p class="font-semibold text-gray-100">{{ movie.title }}</p>
                <p class="text-sm text-gray-400">
                  ({{ getReleaseYear(movie.release_date) }})
                </p>
              </div>
            </button>
          </div>
        </div>

        <div v-if="movieDetails" class="space-y-6">
          <Button
            v-if="canReturnToSearchResults"
            type="button"
            @click="returnToSearchResults"
          >
            <i class="ri-arrow-left-line text-lg mr-2" aria-hidden="true"></i>
            {{ t("movie.back_to_results") }}
          </Button>

          <div class="rounded-lg bg-gray-800 p-4 sm:p-6">
            <div class="flex flex-col md:flex-row gap-6">
              <img
                v-if="movieDetails.poster_path"
                :src="getMovieImageUrl(movieDetails.poster_path)"
                :alt="movieDetails.title"
                class="w-40 mx-auto md:mx-0 rounded-lg object-cover"
              />
              <div class="flex-1 space-y-3">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <h3 class="text-2xl font-bold text-gray-100">
                    {{ movieDetails.title }}
                  </h3>
                  <div class="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      :is-active="isCurrentMovieFavorite"
                      @click="onFavoriteButtonClick"
                    >
                      {{ isCurrentMovieFavorite ? t("movie.favorited") : t("movie.add_favorite") }}
                    </Button>
                    <ShareToChatButton
                      kind="movie"
                      :movie-tmdb-id="movieDetails.id"
                      :movie-title="movieDetails.title"
                      :movie-image-path="
                        movieDetails.poster_path || movieDetails.backdrop_path
                      "
                    />
                    <SpeakButton
                      :aria-label="t('movie.speak_title_aria')"
                      @click="speakMovieTitle(movieDetails.title)"
                    />
                  </div>
                </div>
                <p class="text-sm text-gray-400">
                  {{
                    movieDetails.release_date
                      ? t("movie.released", { date: movieDetails.release_date })
                      : t("movie.released_unknown")
                  }}
                </p>
                <p class="text-gray-200">
                  {{ movieDetails.overview || t("movie.no_description") }}
                </p>
                <div class="flex justify-end">
                  <SpeakButton
                    :disabled="speaking"
                    :aria-label="t('movie.speak_description_aria')"
                    @click="speakMovieDescription"
                  />
                </div>
              </div>
            </div>

            <div class="mt-6">
              <div
                v-if="trailerYoutubeUrl"
                class="w-full max-w-3xl mx-auto"
              >
                <VideoWrapper
                  :url="trailerYoutubeUrl"
                  :title="`${movieDetails.title} trailer`"
                />
              </div>
              <img
                v-else-if="movieDetails.backdrop_path"
                :src="getMovieImageUrl(movieDetails.backdrop_path)"
                :alt="movieDetails.title"
                class="w-full max-h-80 object-cover rounded-lg"
              />
              <p v-else class="text-gray-400 text-center">
                {{ t("movie.no_trailer") }}
              </p>
            </div>
          </div>

          <div v-if="castMembers.length" class="space-y-4">
            <h3 class="text-xl font-semibold text-gray-100">
              {{ t("movie.cast_heading", { title: movieTitle }) }}
            </h3>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <div
                v-for="member in castMembers"
                :key="member.id"
                class="rounded-lg bg-gray-800 p-3 flex flex-col items-center text-center gap-2"
              >
                <img
                  v-if="member.profile_path"
                  :src="getProfileImageUrl(member.profile_path)"
                  :alt="member.name"
                  class="w-full aspect-[2/3] object-cover rounded-md"
                />
                <div
                  v-else
                  class="w-full aspect-[2/3] rounded-md bg-gray-700 flex items-center justify-center text-gray-400 text-xs"
                >
                  {{ t("movie.no_photo") }}
                </div>
                <p class="text-sm font-semibold text-gray-100">
                  {{ member.character || t("movie.unknown_character") }}
                </p>
                <p class="text-xs text-gray-400">
                  {{ t("movie.played_by", { name: member.name }) }}
                </p>
                <SpeakButton
                  :disabled="speaking && speakingMemberId !== member.id"
                  :aria-label="t('movie.speak_character_aria', { name: member.name })"
                  @click="speakCharacter(member)"
                />
              </div>
            </div>
          </div>

          <p v-else-if="hasSearched && !isLoading" class="text-gray-400">
            {{ t("movie.no_cast") }}
          </p>
        </div>
      </div>

      <p class="mt-12 text-center text-sm text-gray-500">
        Copyright {{ currentYear }} Adam Bailey
      </p>
    </div>

    <ConfirmDialog
      v-model:show="isRemoveDialogOpen"
      :title="t('movie.remove_favorite_title')"
      :message="removeDialogMessage"
      :confirm-label="t('movie.remove_favorite_confirm_button')"
      :cancel-label="t('common.cancel')"
      confirm-variant="danger"
      @confirm="confirmRemoveFavorite"
      @cancel="cancelRemoveFavorite"
    />
  </AuthenticatedLayout>
</template>
