<script setup>
import ApplicationLogo from "@/Components/ApplicationLogo.vue";
import Avatar from "@/Components/Avatar.vue";
import CockroachCrawl from "@/Components/CockroachCrawl.vue";
import Dropdown from "@/Components/Dropdown.vue";
import FireworksAnimation from "@/Components/FireworksAnimation.vue";
import NavLink from "@/Components/NavLink.vue";
import NotificationList from "@/Components/NotificationList.vue";
import NavMenuItem from "@/Layouts/Nav/NavMenuItem.vue";
import { usePermissions } from "@/composables/permissions";
import { useUnreadNotifications } from "@/composables/useUnreadNotifications";
import ThemeToggle from "@/Layouts/Nav/ThemeToggle.vue";
import { Link, usePage } from "@inertiajs/vue3";
import { computed, ref } from "vue";

const { canEditPages, canEditProfile } = usePermissions();
const isDesktopProfileOpen = ref(false);
const { unreadCount, isNewNotification } = useUnreadNotifications();

const messagingEnabled = computed(() => {
  const value = usePage().props.settings?.messaging_enabled;
  return value === "1" || value === 1 || value === true;
});

const soundsEnabled = computed(() => {
  const value = usePage().props.settings?.sounds_enabled;
  return value === "1" || value === 1 || value === true;
});

const topNavItems = computed(() => {
  const items = [
    {
      label: "ALL",
      href: route("pictures.index"),
      active: route().current("pictures.*")
    },
    {
      label: "Collages",
      href: route("collages.index"),
      active: route().current("collages.*"),
      icon: "ri-layout-masonry-line"
    },
    {
      label: "Games",
      href: route("games.index"),
      active: route().current("games.*"),
      icon: "ri-gamepad-line"
    },
    {
      label: "Movies",
      href: route("movie-cast.index"),
      active: route().current("movie-cast.*"),
      icon: "ri-film-line"
    }
  ];

  if (soundsEnabled.value) {
    items.push({
      label: "Sounds",
      href: route("sounds.index"),
      active: route().current("sounds.*"),
      icon: "ri-volume-up-line"
    });
  }

  if (messagingEnabled.value) {
    items.push({
      label: "Chat",
      href: route("messages.index"),
      active: route().current("messages.*"),
      icon: "ri-chat-3-line"
    });
  }

  return items;
});

const desktopPrimaryItems = computed(() => topNavItems.value.slice(0, 1));
const desktopOverflowItems = computed(() => topNavItems.value.slice(1));
const desktopMoreActive = computed(() =>
  desktopOverflowItems.value.some((item) => item.active)
);

const secondaryMobilePageItems = computed(() => {
  const items = [
    {
      label: "Collages",
      href: route("collages.index"),
      active: route().current("collages.*"),
      icon: "ri-layout-masonry-line"
    },
    {
      label: "Games",
      href: route("games.index"),
      active: route().current("games.*"),
      icon: "ri-gamepad-line"
    },
    {
      label: "Movies",
      href: route("movie-cast.index"),
      active: route().current("movie-cast.*"),
      icon: "ri-film-line"
    }
  ];

  if (soundsEnabled.value) {
    items.push({
      label: "Sounds",
      href: route("sounds.index"),
      active: route().current("sounds.*"),
      icon: "ri-volume-up-line"
    });
  }

  if (messagingEnabled.value) {
    items.push({
      label: "Chat",
      href: route("messages.index"),
      active: route().current("messages.*"),
      icon: "ri-chat-3-line"
    });
  }

  return items;
});

const utilityMobileItems = computed(() => {
  const items = [
    {
      label: "Account",
      href: route("profile.edit"),
      icon: "ri-user-settings-line"
    }
  ];

  if (canEditPages.value) {
    items.push({
      label: "Log Out",
      href: route("logout"),
      method: "post",
      as: "button",
      icon: "ri-logout-box-line"
    });
  }

  return items;
});

const mobileMoreActive = computed(() => {
  if (route().current("profile.*")) return true;
  if (route().current("users.show")) return true;
  return secondaryMobilePageItems.value.some((item) => item.active);
});
</script>

<template>
  <nav
    class="sticky top-0 z-50 bg-rainbow border-b border-gray-100 dark:border-gray-700"
    :class="{ fireworks: $page.props.theme === 'fireworks' }"
  >
    <CockroachCrawl area="header" />

    <FireworksAnimation>
      <div class="px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex">
            <div class="flex items-center max-w-14">
              <Link :href="route('welcome')">
                <ApplicationLogo class="h-14" />
              </Link>
            </div>

            <div class="ml-4 flex items-center md:hidden">
              <Link
                :href="route('pictures.index')"
                class="btn-bulge inline-flex min-h-12 items-center border-b-2 px-1 text-lg font-heading leading-5 focus:outline-none transition-colors duration-150 ease-in-out"
                :class="
                  route().current('pictures.*')
                    ? 'border-theme-primary text-theme-primary'
                    : 'border-transparent text-white hover:text-theme-primary hover:border-theme-primary'
                "
              >
                ALL
              </Link>
            </div>

            <div class="hidden md:-my-px md:ml-10 md:flex md:items-stretch md:gap-6">
              <NavLink
                v-for="item in desktopPrimaryItems"
                :key="item.label"
                :href="item.href"
                :active="item.active"
              >
                {{ item.label }}
              </NavLink>

              <Dropdown
                v-if="desktopOverflowItems.length > 0"
                align="left"
                width="48"
                :content-classes="['p-2 bg-white dark:bg-gray-900']"
                connected
              >
                <template #trigger>
                  <button
                    type="button"
                    class="inline-flex items-center gap-2 border-b-2 px-1 pt-1 text-xl font-heading leading-5 focus:outline-none transition duration-150 ease-in-out"
                    :class="
                      desktopMoreActive
                        ? 'border-theme-primary text-theme-primary'
                        : 'border-transparent text-white hover:text-theme-primary hover:border-theme-primary'
                    "
                  >
                    <span>More</span>
                    <i class="ri-arrow-down-s-line text-lg" aria-hidden="true"></i>
                  </button>
                </template>

                <template #content>
                  <div class="space-y-2">
                    <NavMenuItem
                      v-for="item in desktopOverflowItems"
                      :key="`desktop-overflow-${item.label}`"
                      :href="item.href"
                      :label="item.label"
                      :icon="item.icon"
                      :active="item.active"
                    />
                  </div>
                </template>
              </Dropdown>
            </div>
          </div>

          <ThemeToggle />

          <div class="hidden md:flex md:items-stretch md:ml-6">
            <div v-if="messagingEnabled" class="ml-3 relative">
              <Dropdown align="right" width="80" connected>
                <template #trigger>
                  <button
                    type="button"
                    class="relative inline-flex items-center justify-center p-2 focus:outline-none transition-opacity hover:opacity-80"
                  >
                    <i class="ri-notification-fill text-2xl text-white"></i>
                    <span
                      v-if="unreadCount > 0"
                      class="absolute top-0 right-0 flex h-3 w-3"
                      title="You have unread notifications"
                    >
                      <span
                        v-if="isNewNotification"
                        class="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"
                      ></span>
                      <span class="relative inline-flex h-3 w-3 rounded-full bg-red-600 border-2 border-white dark:border-gray-800"></span>
                    </span>
                  </button>
                </template>

                <template #content>
                  <NotificationList />
                </template>
              </Dropdown>
            </div>
            <div class="ml-3 relative">
              <Dropdown
                align="right"
                width="56"
                :content-classes="['p-2 bg-white dark:bg-gray-900']"
                connected
                @open-change="isDesktopProfileOpen = $event"
              >
                <template #trigger>
                  <button
                    type="button"
                    class="relative inline-flex min-h-12 items-center gap-2 rounded-xl border border-transparent bg-transparent px-2 py-1 text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
                    :class="
                      isDesktopProfileOpen
                        ? 'border-theme-primary text-theme-primary'
                        : 'text-white hover:text-white'
                    "
                  >
                    <Avatar :user="$page.props.auth.user" size="md" />
                    <i class="ri-arrow-down-s-line text-lg" aria-hidden="true"></i>
                  </button>
                </template>

                <template #content>
                  <Link
                    :href="route('users.show', $page.props.auth.user.email)"
                    class="mb-2 block rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 transition-colors hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                  >
                    <div class="flex items-center gap-3">
                      <Avatar :user="$page.props.auth.user" size="md" />
                      <div>
                        <div class="text-sm font-semibold text-gray-900 dark:text-white">
                          {{ $page.props.auth.user.name }}
                        </div>
                        <div class="text-xs text-gray-500 dark:text-gray-300">
                          {{ $page.props.auth.user.email }}
                        </div>
                      </div>
                    </div>
                  </Link>
                  <div class="space-y-2">
                    <NavMenuItem
                      :href="route('profile.edit')"
                      label="Account"
                      icon="ri-user-settings-line"
                      :active="route().current('profile.*')"
                    />
                  </div>
                  <div class="mt-2">
                    <NavMenuItem
                      v-if="canEditProfile"
                      :href="route('logout')"
                      label="Log Out"
                      icon="ri-logout-box-line"
                      method="post"
                      as="button"
                      :use-active-style="false"
                    />
                  </div>
                </template>
              </Dropdown>
            </div>
          </div>

          <div class="-mr-2 flex items-stretch gap-2 md:hidden">
            <div v-if="messagingEnabled" class="relative">
              <Dropdown align="right" width="80" connected>
                <template #trigger>
                  <button
                    type="button"
                    class="relative inline-flex min-h-12 min-w-12 items-center justify-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 transition-opacity hover:opacity-80"
                  >
                    <i class="ri-notification-fill text-2xl text-white"></i>
                    <span
                      v-if="unreadCount > 0"
                      class="absolute top-0 right-0 flex h-3 w-3"
                      title="You have unread notifications"
                    >
                      <span
                        v-if="isNewNotification"
                        class="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"
                      ></span>
                      <span class="relative inline-flex h-3 w-3 rounded-full bg-red-600 border-2 border-white dark:border-gray-800"></span>
                    </span>
                  </button>
                </template>

                <template #content>
                  <NotificationList />
                </template>
              </Dropdown>
            </div>
            <Dropdown
              align="right"
              width="80"
              :content-classes="['p-2 bg-white dark:bg-gray-900']"
              connected
            >
              <template #trigger>
                <button
                  type="button"
                  class="btn-bulge inline-flex min-h-12 min-w-12 items-center justify-center rounded-lg border border-transparent bg-transparent text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
                  :class="
                    mobileMoreActive
                      ? 'border-theme-primary text-theme-primary'
                      : 'text-white hover:text-white'
                  "
                  aria-label="Open more menu"
                >
                  <i class="ri-menu-line text-2xl" aria-hidden="true"></i>
                </button>
              </template>

              <template #content>
                <div class="max-h-[70vh] overflow-y-auto space-y-2">
                  <Link
                    :href="route('users.show', $page.props.auth.user.email)"
                    class="mb-2 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 transition-colors hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                  >
                    <Avatar :user="$page.props.auth.user" size="md" />
                    <div>
                      <div class="text-sm font-semibold text-gray-900 dark:text-white">
                        {{ $page.props.auth.user.name }}
                      </div>
                      <div class="text-xs text-gray-500 dark:text-gray-300">
                        {{ $page.props.auth.user.email }}
                      </div>
                    </div>
                  </Link>

                  <NavMenuItem
                    v-for="item in secondaryMobilePageItems"
                    :key="item.label"
                    :href="item.href"
                    :label="item.label"
                    :icon="item.icon"
                    :active="item.active"
                  />

                  <div class="pt-1 mt-1 border-t border-gray-200 dark:border-gray-700 space-y-2">
                    <NavMenuItem
                      v-for="item in utilityMobileItems"
                      :key="item.label"
                      :href="item.href"
                      :label="item.label"
                      :icon="item.icon"
                      :method="item.method"
                      :as="item.as"
                      :use-active-style="false"
                    />
                  </div>
                </div>
              </template>
            </Dropdown>
          </div>
        </div>
      </div>
    </FireworksAnimation>
  </nav>
</template>
