<script setup>
import ApplicationLogo from "@/Components/ApplicationLogo.vue";
import Avatar from "@/Components/Avatar.vue";
import Dropdown from "@/Components/Dropdown.vue";
import DropdownLink from "@/Components/DropdownLink.vue";
import FireworksAnimation from "@/Components/FireworksAnimation.vue";
import NavLink from "@/Components/NavLink.vue";
import NotificationList from "@/Components/NotificationList.vue";
import ResponsiveNavLink from "@/Components/ResponsiveNavLink.vue";
import { usePermissions } from "@/composables/permissions";
import { useUnreadNotifications } from "@/composables/useUnreadNotifications";
import ThemeToggle from "@/Layouts/Nav/ThemeToggle.vue";
import { Link, usePage } from "@inertiajs/vue3";
import { computed, ref } from "vue";

const { canEditPages, canEditProfile } = usePermissions();
const showingNavigationDropdown = ref(false);
const { unreadCount } = useUnreadNotifications();

const messagingEnabled = computed(() => {
  const value = usePage().props.settings?.messaging_enabled;
  return value === "1" || value === 1 || value === true;
});
</script>

<template>
  <nav
    class="bg-rainbow border-b border-gray-100 dark:border-gray-700"
    :class="{ fireworks: $page.props.theme === 'fireworks' }"
  >
    <FireworksAnimation>
      <!-- Primary Navigation Menu -->
      <div class="px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex">
            <!-- Logo -->
            <div class="flex items-center max-w-14">
              <Link :href="route('welcome')">
                <ApplicationLogo class="h-14" />
              </Link>
            </div>

            <!-- Navigation Links -->
            <div class="hidden space-x-8 sm:-my-px sm:ml-10 sm:flex">
              <NavLink
                :href="route('pictures.index')"
                :active="route().current('pictures.*')"
              >
                ALL
              </NavLink>
              <NavLink
                :href="route('collages.index')"
                :active="route().current('collages.*')"
              >
                Collages
              </NavLink>
              <NavLink
                v-if="messagingEnabled"
                :href="route('messages.index')"
                :active="route().current('messages.*')"
              >
                Chat
              </NavLink>
            </div>
          </div>

          <ThemeToggle />

          <div class="hidden sm:flex sm:items-center sm:ml-6">
            <!-- Notifications Dropdown -->
            <div v-if="messagingEnabled" class="ml-3 relative">
              <Dropdown align="right" width="80">
                <template #trigger>
                  <button
                    type="button"
                    class="relative inline-flex items-center justify-center p-2 focus:outline-none transition-opacity hover:opacity-80"
                  >
                    <i class="ri-notification-fill text-2xl text-white"></i>
                    <span
                      v-if="unreadCount > 0"
                      class="absolute top-0 right-0 h-3 w-3 bg-red-600 rounded-full border-2 border-white dark:border-gray-800"
                      title="You have unread notifications"
                    ></span>
                  </button>
                </template>

                <template #content>
                  <NotificationList />
                </template>
              </Dropdown>
            </div>
            <!-- Settings Dropdown -->
            <div class="ml-3 relative">
              <Dropdown align="right" width="56">
                <template #trigger>
                  <button
                    type="button"
                    class="relative inline-flex items-center focus:outline-none transition-opacity hover:opacity-80"
                  >
                    <Avatar :user="$page.props.auth.user" size="md" />
                  </button>
                </template>

                <template #content>
                  <Link
                    :href="route('users.show', $page.props.auth.user.email)"
                    class="block px-4 py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div class="flex items-center gap-3">
                      <Avatar :user="$page.props.auth.user" size="md" />
                      <div>
                        <div
                          class="text-sm font-semibold text-gray-900 dark:text-gray-100"
                        >
                          {{ $page.props.auth.user.name }}
                        </div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">
                          {{ $page.props.auth.user.email }}
                        </div>
                      </div>
                    </div>
                  </Link>
                  <DropdownLink :href="route('dashboard')">
                    <div class="flex items-center gap-3">
                      <i class="ri-dashboard-line text-lg"></i>
                      <span>Admin</span>
                    </div>
                  </DropdownLink>
                  <DropdownLink :href="route('profile.edit')">
                    <div class="flex items-center gap-3">
                      <i class="ri-user-settings-line text-lg"></i>
                      <span>Account</span>
                    </div>
                  </DropdownLink>
                  <DropdownLink
                    v-if="canEditProfile"
                    :href="route('logout')"
                    method="post"
                    as="button"
                  >
                    <div class="flex items-center gap-3">
                      <i class="ri-logout-box-line text-lg"></i>
                      <span>Log Out</span>
                    </div>
                  </DropdownLink>
                </template>
              </Dropdown>
            </div>
          </div>

          <!-- Mobile Notifications and Hamburger -->
          <div class="-mr-2 flex items-center gap-2 sm:hidden">
            <!-- Notifications Dropdown (Mobile) -->
            <div v-if="messagingEnabled" class="relative">
              <Dropdown align="right" width="80">
                <template #trigger>
                  <button
                    type="button"
                    class="relative inline-flex items-center justify-center p-2 focus:outline-none transition-opacity hover:opacity-80"
                  >
                    <i class="ri-notification-fill text-2xl text-white"></i>
                    <span
                      v-if="unreadCount > 0"
                      class="absolute top-0 right-0 h-3 w-3 bg-red-600 rounded-full border-2 border-white dark:border-gray-800"
                      title="You have unread notifications"
                    ></span>
                  </button>
                </template>

                <template #content>
                  <NotificationList />
                </template>
              </Dropdown>
            </div>
            <!-- Hamburger -->
            <button
              class="inline-flex items-center justify-center p-2 rounded-md text-yellow-200 hover:text-yellow-400 hover:bg-blue-700 dark:text-gray-500 dark:hover:text-gray-400 dark:hover:bg-gray-900 focus:outline-none focus:bg-yellow-100 dark:focus:bg-gray-900 focus:text-gray-500 dark:focus:text-gray-400 transition duration-150 ease-in-out"
              @click="showingNavigationDropdown = !showingNavigationDropdown"
            >
              <svg
                class="h-6 w-6"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  :class="{
                    hidden: showingNavigationDropdown,
                    'inline-flex': !showingNavigationDropdown
                  }"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
                <path
                  :class="{
                    hidden: !showingNavigationDropdown,
                    'inline-flex': showingNavigationDropdown
                  }"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Responsive Navigation Menu -->
      <div
        :class="{
          block: showingNavigationDropdown,
          hidden: !showingNavigationDropdown
        }"
        class="sm:hidden"
      >
        <div class="pt-2 pb-3 space-y-1">
          <ResponsiveNavLink
            :href="route('pictures.index')"
            :active="route().current('pictures.*')"
          >
            ALL
          </ResponsiveNavLink>
          <ResponsiveNavLink
            :href="route('collages.index')"
            :active="route().current('collages.*')"
          >
            Collages
          </ResponsiveNavLink>
          <ResponsiveNavLink
            v-if="messagingEnabled"
            :href="route('messages.index')"
            :active="route().current('messages.*')"
          >
            Chat
          </ResponsiveNavLink>
        </div>

        <!-- Responsive Settings Options -->
        <div class="pt-4 pb-1 border-t border-gray-200 dark:border-gray-600">
          <Link
            :href="route('users.show', $page.props.auth.user.email)"
            class="px-4 flex items-center gap-3 hover:bg-gray-700 transition-colors py-2"
          >
            <Avatar :user="$page.props.auth.user" size="md" />
            <div>
              <div
                class="font-semibold text-base text-gray-100 dark:text-gray-200"
              >
                {{ $page.props.auth.user.name }}
              </div>
              <div class="text-sm text-gray-300 dark:text-gray-400">
                {{ $page.props.auth.user.email }}
              </div>
            </div>
          </Link>

          <div class="mt-3 space-y-1">
            <ResponsiveNavLink :href="route('dashboard')" class="relative">
              <div class="flex items-center gap-3">
                <i class="ri-dashboard-line text-lg"></i>
                <span>Admin</span>
              </div>
            </ResponsiveNavLink>
            <ResponsiveNavLink :href="route('profile.edit')" class="relative">
              <div class="flex items-center gap-3">
                <i class="ri-user-settings-line text-lg"></i>
                <span>Account</span>
              </div>
            </ResponsiveNavLink>
            <ResponsiveNavLink
              v-if="canEditPages"
              :href="route('logout')"
              method="post"
              as="button"
            >
              <div class="flex items-center gap-3">
                <i class="ri-logout-box-line text-lg"></i>
                <span>Log Out</span>
              </div>
            </ResponsiveNavLink>
          </div>
        </div>
      </div>
    </FireworksAnimation>
  </nav>
</template>
