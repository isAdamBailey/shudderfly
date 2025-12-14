<script setup>
import Avatar from "@/Components/Avatar.vue";
import InputError from "@/Components/InputError.vue";
import { avatars } from "@/constants/avatars";
import { useForm, usePage } from "@inertiajs/vue3";

const user = usePage().props.auth.user;

const form = useForm({
  avatar: user.avatar || null
});

const submit = () => {
  // eslint-disable-next-line no-undef
  form.patch(route("profile.avatar.update"), {
    preserveScroll: true
  });
};

const selectAvatar = (avatarId) => {
  form.avatar = avatarId;
  submit();
};

const clearAvatar = () => {
  form.avatar = null;
  submit();
};

// Ensure SVG has explicit width and height for Safari iOS compatibility
const getSvgWithDimensions = (svg) => {
  if (!svg) return null;
  // Use a reasonable size for the selection grid (100px works well for the grid layout)
  const size = 100;
  if (svg.includes("viewBox") && !svg.includes("width=")) {
    return svg.replace(
      /<svg([^>]*)>/,
      `<svg$1 width="${size}" height="${size}">`
    );
  }
  return svg;
};
</script>

<template>
  <section>
    <header>
      <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">
        Avatar
      </h2>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Choose an avatar to represent yourself, or use your initials.
      </p>
    </header>

    <div class="mt-6">
      <div class="mb-6 flex items-center gap-4">
        <div class="flex-shrink-0">
          <Avatar :user="user" :avatar="form.avatar" size="lg" />
        </div>
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">Current avatar</p>
          <button
            v-if="form.avatar"
            type="button"
            class="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
            @click="clearAvatar"
          >
            Clear avatar (use initials)
          </button>
        </div>
      </div>

      <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
        <button
          v-for="avatar in avatars"
          :key="avatar.id"
          type="button"
          :class="[
            'relative p-3 rounded-lg border-2 transition-all hover:scale-105',
            form.avatar === avatar.id
              ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
            form.processing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          ]"
          :disabled="form.processing"
          @click="selectAvatar(avatar.id)"
        >
          <div
            class="w-full aspect-square flex items-center justify-center"
            v-html="getSvgWithDimensions(avatar.svg)"
          ></div>
          <p class="mt-2 text-xs text-center text-gray-600 dark:text-gray-400">
            {{ avatar.name }}
          </p>
          <div
            v-if="form.avatar === avatar.id"
            class="absolute top-1 right-1 w-5 h-5 bg-blue-500 dark:bg-blue-400 rounded-full flex items-center justify-center"
          >
            <svg
              class="w-3 h-3 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </button>
      </div>

      <InputError class="mt-2" :message="form.errors.avatar" />
    </div>
  </section>
</template>
