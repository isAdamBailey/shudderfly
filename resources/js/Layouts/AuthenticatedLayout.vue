<script setup>
import { ref } from "vue";
import ApplicationLogo from "@/Components/ApplicationLogo.vue";
import Dropdown from "@/Components/Dropdown.vue";
import DropdownLink from "@/Components/DropdownLink.vue";
import NavLink from "@/Components/NavLink.vue";
import ThemeToggle from "@/Layouts/Nav/ThemeToggle.vue";
import ResponsiveNavLink from "@/Components/ResponsiveNavLink.vue";
import { Link } from "@inertiajs/vue3";
import { usePermissions } from "@/composables/permissions";

const { canEditPages } = usePermissions();
const showingNavigationDropdown = ref(false);
</script>

<template>
    <div>
        <div
            class="min-h-screen bg-gradient-to-r from-yellow-900 dark:from-purple-900 via-green-500 dark:via-red-500 to-yellow-300 dark:to-yellow-500"
        >
            <nav
                class="bg-yellow-900 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700"
            >
                <!-- Primary Navigation Menu -->
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between h-16">
                        <div class="flex">
                            <!-- Logo -->
                            <div class="shrink-0 flex items-center">
                                <Link :href="route('welcome')">
                                    <ApplicationLogo
                                        :is-poop="true"
                                        class="block h-9 w-auto fill-current text-gray-800 dark:text-gray-200"
                                    />
                                </Link>
                            </div>

                            <!-- Navigation Links -->
                            <div
                                class="hidden space-x-8 sm:-my-px sm:ml-10 sm:flex"
                            >
                                <NavLink
                                    v-if="canEditPages"
                                    :href="route('dashboard')"
                                    :active="route().current('dashboard')"
                                >
                                    Admin
                                </NavLink>
                                <NavLink
                                    :href="route('books.index')"
                                    :active="route().current('books.*')"
                                >
                                    Books
                                </NavLink>
                                <NavLink
                                    :href="route('pictures.index')"
                                    :active="route().current('pictures.*')"
                                >
                                    Uploads
                                </NavLink>
                            </div>
                        </div>

                        <ThemeToggle />

                        <div class="hidden sm:flex sm:items-center sm:ml-6">
                            <!-- Settings Dropdown -->
                            <div class="ml-3 relative">
                                <Dropdown align="right" width="48">
                                    <template #trigger>
                                        <span class="inline-flex rounded-md">
                                            <button
                                                type="button"
                                                class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-yellow-200 dark:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none transition ease-in-out duration-150"
                                            >
                                                {{ $page.props.auth.user.name }}

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
                                        </span>
                                    </template>

                                    <template #content>
                                        <DropdownLink
                                            :href="route('profile.edit')"
                                        >
                                            Profile
                                        </DropdownLink>
                                        <DropdownLink
                                            v-if="canEditPages"
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
                                @click="
                                    showingNavigationDropdown =
                                        !showingNavigationDropdown
                                "
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
                                            'inline-flex':
                                                !showingNavigationDropdown,
                                        }"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                    <path
                                        :class="{
                                            hidden: !showingNavigationDropdown,
                                            'inline-flex':
                                                showingNavigationDropdown,
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
                        hidden: !showingNavigationDropdown,
                    }"
                    class="sm:hidden"
                >
                    <div class="pt-2 pb-3 space-y-1">
                        <ResponsiveNavLink
                            v-if="canEditPages"
                            :href="route('dashboard')"
                            :active="route().current('dashboard')"
                        >
                            Admin
                        </ResponsiveNavLink>
                        <ResponsiveNavLink
                            :href="route('books.index')"
                            :active="route().current('books.*')"
                        >
                            Books
                        </ResponsiveNavLink>
                        <ResponsiveNavLink
                            :href="route('pictures.index')"
                            :active="route().current('pictures.*')"
                        >
                            Uploads
                        </ResponsiveNavLink>
                    </div>

                    <!-- Responsive Settings Options -->
                    <div
                        class="pt-4 pb-1 border-t border-gray-200 dark:border-gray-600"
                    >
                        <div class="px-4">
                            <div
                                class="font-medium text-base text-gray-100 dark:text-gray-200"
                            >
                                {{ $page.props.auth.user.name }}
                            </div>
                            <div class="font-medium text-sm text-gray-100">
                                {{ $page.props.auth.user.email }}
                            </div>
                        </div>

                        <div class="mt-3 space-y-1">
                            <ResponsiveNavLink :href="route('profile.edit')">
                                Profile
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
            </nav>

            <!-- Page Heading -->
            <header v-if="$slots.header" class="border-gray-900">
                <div class="max-w-7xl mx-auto py-2 px-4 sm:px-6 lg:px-8">
                    <slot name="header" />
                </div>
            </header>

            <!-- Page Content -->
            <main>
                <slot />
            </main>

            <footer class="mt-10 border-gray-900 bg-blue-600">
                <div class="max-w-7xl mx-auto pt-12 lg:pt-20 pb-12">
                    <div
                        class="text-center underline hover:font-bold text-gray-100 pb-8"
                    >
                        <a :href="route('rules')">Rules and Instructions</a>
                    </div>
                    <div class="text-center text-sm font-bold text-gray-100">
                        &copy; {{ new Date().getFullYear() }} Shudderfly
                    </div>
                </div>
            </footer>
        </div>
    </div>
</template>
