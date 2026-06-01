<script setup>
/* global route */
import Button from "@/Components/Button.vue";
import ConfirmDialog from "@/Components/ConfirmDialog.vue";
import PrimaryButton from "@/Components/PrimaryButton.vue";
import SecondaryButton from "@/Components/SecondaryButton.vue";
import SpeakButton from "@/Components/SpeakButton.vue";
import ShareToChatButton from "@/Components/ShareToChatButton.vue";
import TextInput from "@/Components/TextInput.vue";
import VideoWrapper from "@/Components/VideoWrapper.vue";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { Head } from "@inertiajs/vue3";
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
      return "Microphone permission was denied.";
    }
    if (code === "service-not-allowed") {
      return "Speech service is not allowed in this browser.";
    }
    if (code === "audio-capture") {
      return "No microphone was detected for speech recognition.";
    }
    if (code === "network") {
      return "Network error while connecting to speech recognition.";
    }
    if (code === "no-speech") {
      return "No speech was detected. Please try again.";
    }
    if (code === "aborted") {
      return "Speech recognition was stopped before completion.";
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

  return "Enter a movie title";
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
const showFavorites = ref(false);
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
  if (!pendingRemoveMovie.value) {
    return "Remove this movie from favorites?";
  }

  return `Remove ${pendingRemoveMovie.value.title} from favorites?`;
});

const getReleaseYear = (releaseDate) => {
  return releaseDate ? releaseDate.slice(0, 4) : "Unknown year";
};

const getProfileImageUrl = (profilePath) => `${props.tmdbImageBaseUrl}${profilePath}`;
const getMovieImageUrl = (path) => `${props.tmdbImageBaseUrl}${path}`;

const speakMovieTitle = (title) => {
  if (!title?.trim()) {
    return;
  }

  speak(title.trim());
};

const loadMovieById = async (movieId, preferredTitle) => {
  isLoading.value = true;
  hasSearched.value = true;
  searchResults.value = [];
  castMembers.value = [];
  movieTitle.value = preferredTitle?.trim() || "";
  movieDetails.value = null;
  errorMessage.value = "";
  showFavorites.value = false;

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
    errorMessage.value = "Unable to fetch movie data right now.";
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
  showFavorites.value = false;

  if (!query) {
    isLoading.value = false;
    errorMessage.value = "Enter a movie title to search.";
    return;
  }

  try {
    const response = await window.axios.get(route("movie-cast.search"), {
      params: { query },
    });
    const movies = response.data;

    if (!movies.length) {
      errorMessage.value = "No matching movie was found.";
      return;
    }

    if (movies.length === 1) {
      await loadMovieById(movies[0].id, movies[0].title);
      return;
    }

    searchResults.value = movies;
  } catch {
    errorMessage.value = "Unable to fetch movie data right now.";
  } finally {
    isLoading.value = false;
  }
};

const onSelectSearchResult = async (movie) => {
  await loadMovieById(movie.id, movie.title);
};

const onFavoriteButtonClick = async () => {
  if (!currentFavoriteMovie.value) {
    return;
  }

  if (isCurrentMovieFavorite.value) {
    pendingRemoveMovie.value = currentFavoriteMovie.value;
    isRemoveDialogOpen.value = true;
    return;
  }

  try {
    const response = await window.axios.post(
      route("movie-cast.favorites.store"),
      currentFavoriteMovie.value
    );
    favoritesList.value = response.data;
  } catch {
    errorMessage.value = "Unable to save favorite right now.";
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
    errorMessage.value = "Unable to remove favorite right now.";
  } finally {
    pendingRemoveMovie.value = null;
  }
};

const cancelRemoveFavorite = () => {
  pendingRemoveMovie.value = null;
};

const requestRemoveFavorite = (movie) => {
  pendingRemoveMovie.value = movie;
  isRemoveDialogOpen.value = true;
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
    errorMessage.value = t("search.voice_failed", {
      error: voiceError.message,
    });
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
  }
});

const speakCharacter = (member) => {
  if (speakingMemberId.value === member.id) {
    window.speechSynthesis?.cancel();
    speakingMemberId.value = null;
    return;
  }

  const characterName = member.character?.trim() || "Unknown character";
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
    errorMessage.value = "No movie description is available to speak.";
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
  <Head title="Movie Cast" />

  <AuthenticatedLayout>
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="font-heading text-2xl text-theme-title leading-tight">
          Movie Cast Lookup
        </h2>
        <div class="flex flex-wrap gap-2">
          <SecondaryButton
            type="button"
            @click="showFavorites = !showFavorites"
          >
            {{ showFavorites ? "Back to Search" : "Favorites" }}
          </SecondaryButton>
        </div>
      </div>
    </template>

    <div class="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div v-if="showFavorites" class="space-y-6">
        <p
          v-if="!favoritesList.length"
          class="text-center text-gray-300"
        >
          No favorites yet. Add one from the movie page.
        </p>

        <div
          v-else
          class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
        >
          <div
            v-for="movie in favoritesList"
            :key="movie.id"
            class="rounded-lg bg-gray-800 p-3 flex flex-col gap-3"
          >
            <button
              type="button"
              class="text-left"
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
                No image
              </div>
              <p class="mt-2 text-sm font-semibold text-gray-100">
                {{ movie.title }}
              </p>
            </button>
            <Button
              type="button"
              class="w-full justify-center"
              @click="requestRemoveFavorite(movie)"
            >
              Remove
            </Button>
          </div>
        </div>
      </div>

      <div v-else class="space-y-8">
        <p class="text-gray-300">
          Search by movie title to view cast members and character names.
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
              :aria-label="isListening ? t('search.listening') : 'Voice search'"
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
            {{ isLoading ? "Searching..." : "Search" }}
          </PrimaryButton>
        </form>

        <p v-if="errorMessage" class="text-red-400">
          {{ errorMessage }}
        </p>

        <div v-if="searchResults.length" class="space-y-3">
          <h3 class="text-lg font-semibold text-gray-100">
            Multiple movies found. Choose one:
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
                      {{ isCurrentMovieFavorite ? "Favorited" : "Add Favorite" }}
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
                      aria-label="Speak movie title"
                      @click="speakMovieTitle(movieDetails.title)"
                    />
                  </div>
                </div>
                <p class="text-sm text-gray-400">
                  Released: {{ movieDetails.release_date || "Unknown" }}
                </p>
                <p class="text-gray-200">
                  {{ movieDetails.overview || "No description available." }}
                </p>
                <div class="flex justify-end">
                  <SpeakButton
                    :disabled="speaking"
                    aria-label="Speak movie description"
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
                No trailer or movie image available.
              </p>
            </div>
          </div>

          <div v-if="castMembers.length" class="space-y-4">
            <h3 class="text-xl font-semibold text-gray-100">
              Cast for {{ movieTitle }}
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
                  No photo
                </div>
                <p class="text-sm font-semibold text-gray-100">
                  {{ member.character || "Unknown Character" }}
                </p>
                <p class="text-xs text-gray-400">
                  Played by {{ member.name }}
                </p>
                <SpeakButton
                  :disabled="speaking && speakingMemberId !== member.id"
                  :aria-label="`Speak character name for ${member.name}`"
                  @click="speakCharacter(member)"
                />
              </div>
            </div>
          </div>

          <p v-else-if="hasSearched && !isLoading" class="text-gray-400">
            No cast data is available for this movie.
          </p>
        </div>
      </div>

      <p class="mt-12 text-center text-sm text-gray-500">
        Copyright {{ currentYear }} Adam Bailey
      </p>
    </div>

    <ConfirmDialog
      v-model:show="isRemoveDialogOpen"
      title="Remove favorite"
      :message="removeDialogMessage"
      confirm-label="Remove"
      cancel-label="Cancel"
      confirm-variant="danger"
      @confirm="confirmRemoveFavorite"
      @cancel="cancelRemoveFavorite"
    />
  </AuthenticatedLayout>
</template>
