<script setup>
import ApplicationLogo from "@/Components/ApplicationLogo.vue";
import Avatar from "@/Components/Avatar.vue";
import Dropdown from "@/Components/Dropdown.vue";
import DropdownLink from "@/Components/DropdownLink.vue";
import FireworksAnimation from "@/Components/FireworksAnimation.vue";
import NavLink from "@/Components/NavLink.vue";
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
                :href="route('dashboard')"
                :active="route().current('dashboard')"
              >
                Admin
              </NavLink>
              <NavLink
                :href="route('pictures.index')"
                :active="route().current('pictures.*')"
              >
                Uploads
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
            <!-- Settings Dropdown -->
            <div class="ml-3 relative">
              <Dropdown align="right" width="48">
                <template #trigger>
                  <span class="inline-flex rounded-md relative">
                    <button
                      type="button"
                      class="inline-flex items-center gap-2 px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-gray-100 dark:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none transition ease-in-out duration-150"
                    >
                      <Avatar :user="$page.props.auth.user" size="sm" />
                      <span class="hidden sm:inline">{{ $page.props.auth.user.name }}</span>

                      <svg
                        class="ml-2 -mr-0.5 h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </button>
                    <span
                      v-if="messagingEnabled && unreadCount > 0"
                      class="absolute -top-1 -right-1 h-3 w-3 bg-red-600 rounded-full border-2 border-white dark:border-gray-800"
                      title="You have unread notifications"
                    ></span>
                  </span>
                </template>

                <template #content>
                  <DropdownLink :href="route('profile.edit')">
                    Account
                  </DropdownLink>
                  <DropdownLink
                    v-if="canEditProfile"
                    :href="route('logout')"
                    method="post"
                    as="button"
                  >
                    Log Out
                  </DropdownLink>
                </template>
              </Dropdown>
            </div>
          </div>

          <!-- Hamburger -->
          <div class="-mr-2 flex items-center sm:hidden">
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
            :href="route('dashboard')"
            :active="route().current('dashboard')"
          >
            Admin
          </ResponsiveNavLink>
          <ResponsiveNavLink
            :href="route('pictures.index')"
            :active="route().current('pictures.*')"
          >
            Uploads
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
          <div class="px-4 flex items-center gap-3">
            <Avatar :user="$page.props.auth.user" size="md" />
            <div>
              <div class="font-medium text-base text-gray-100 dark:text-gray-200">
                {{ $page.props.auth.user.name }}
              </div>
              <div class="font-medium text-sm text-gray-100">
                {{ $page.props.auth.user.email }}
              </div>
            </div>
          </div>

          <div class="mt-3 space-y-1">
            <ResponsiveNavLink :href="route('profile.edit')" class="relative">
              Account
              <span
                v-if="messagingEnabled && unreadCount > 0"
                class="absolute right-4 top-1/2 -translate-y-1/2 h-2 w-2 bg-red-600 rounded-full"
                title="You have unread notifications"
              ></span>
            </ResponsiveNavLink>
            <ResponsiveNavLink
              v-if="canEditPages"
              :href="route('logout')"
              method="post"
              as="button"
            >
              Log Out
            </ResponsiveNavLink>
          </div>
        </div>
      </div>
    </FireworksAnimation>
  </nav>
</template>
