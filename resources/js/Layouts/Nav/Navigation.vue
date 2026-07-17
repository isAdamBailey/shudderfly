<script setup>
import ApplicationLogo from "@/Components/ApplicationLogo.vue";
import Avatar from "@/Components/Avatar.vue";
import CockroachCrawl from "@/Components/CockroachCrawl.vue";
import Dropdown from "@/Components/Dropdown.vue";
import EmojiRiseOverlay from "@/Components/EmojiRiseOverlay.vue";
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
            label: "Books",
            href: route("books.index"),
            active: route().current("books.*"),
            icon: "ri-book-open-line",
        },
        {
            label: "ALL",
            href: route("pictures.index"),
            active: route().current("pictures.*"),
        },
        {
            label: "Collages",
            href: route("collages.index"),
            active: route().current("collages.*"),
            icon: "ri-layout-masonry-line",
        },
        {
            label: "Games",
            href: route("games.index"),
            active: route().current("games.*"),
            icon: "ri-gamepad-line",
        },
        {
            label: "Movies",
            href: route("movie-cast.index"),
            active: route().current("movie-cast.*"),
            icon: "ri-film-line",
        },
    ];

    if (soundsEnabled.value) {
        items.push({
            label: "Sounds",
            href: route("sounds.index"),
            active: route().current("sounds.*"),
            icon: "ri-volume-up-line",
        });
    }

    if (messagingEnabled.value) {
        items.push({
            label: "Chat",
            href: route("messages.index"),
            active: route().current("messages.*"),
            icon: "ri-chat-3-line",
        });
    }

    return items;
});

const primaryItems = computed(() => topNavItems.value.slice(0, 2));
const overflowItems = computed(() => topNavItems.value.slice(2));
const moreActive = computed(() =>
    overflowItems.value.some((item) => item.active)
);
</script>

<template>
    <nav
        class="sticky top-0 z-50 bg-rainbow border-b border-gray-100 dark:border-gray-700"
        :class="{ fireworks: $page.props.theme === 'fireworks' }"
    >
        <CockroachCrawl area="header" />
        <EmojiRiseOverlay />

        <FireworksAnimation>
            <div class="px-2 sm:px-6 lg:px-8">
                <div class="flex items-center justify-between h-16 gap-1">
                    <div
                        class="flex items-center min-w-0 flex-1 gap-2 sm:gap-4 md:gap-6"
                    >
                        <Link
                            :href="route('welcome')"
                            class="shrink-0 flex items-center max-w-10 sm:max-w-14"
                        >
                            <ApplicationLogo class="h-10 sm:h-14" />
                        </Link>

                        <NavLink
                            v-for="item in primaryItems"
                            :key="item.label"
                            :href="item.href"
                            :active="item.active"
                        >
                            {{ item.label }}
                        </NavLink>

                        <Dropdown
                            v-if="overflowItems.length > 0"
                            align="left"
                            width="48"
                            :content-classes="['p-2 bg-white dark:bg-gray-900']"
                            connected
                        >
                            <template #trigger>
                                <button
                                    type="button"
                                    class="inline-flex items-center gap-1 whitespace-nowrap border-b-2 px-1 pt-1 text-base sm:text-xl font-heading leading-5 focus:outline-none transition duration-150 ease-in-out"
                                    :class="
                                        moreActive
                                            ? 'border-theme-primary text-theme-primary'
                                            : 'border-transparent text-white hover:text-theme-primary hover:border-theme-primary'
                                    "
                                >
                                    <span>More</span>
                                    <i
                                        class="ri-arrow-down-s-line text-lg"
                                        aria-hidden="true"
                                    ></i>
                                </button>
                            </template>

                            <template #content>
                                <div class="space-y-2">
                                    <NavMenuItem
                                        v-for="item in overflowItems"
                                        :key="`overflow-${item.label}`"
                                        :href="item.href"
                                        :label="item.label"
                                        :icon="item.icon"
                                        :active="item.active"
                                    />
                                </div>
                            </template>
                        </Dropdown>
                    </div>

                    <div class="flex items-center gap-0.5 sm:gap-2 shrink-0">
                        <ThemeToggle />

                        <div v-if="messagingEnabled" class="relative">
                            <Dropdown
                                align="right"
                                width="80"
                                connected
                                :content-classes="[
                                    'bg-white dark:bg-gray-800',
                                ]"
                            >
                                <template #trigger>
                                    <button
                                        type="button"
                                        class="relative inline-flex min-h-12 min-w-12 items-center justify-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 transition-opacity hover:opacity-80"
                                    >
                                        <i
                                            class="ri-notification-fill text-2xl text-white"
                                        ></i>
                                        <span
                                            v-if="unreadCount > 0"
                                            class="absolute top-0 right-0 flex h-3 w-3"
                                            title="You have unread notifications"
                                        >
                                            <span
                                                v-if="isNewNotification"
                                                class="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"
                                            ></span>
                                            <span
                                                class="relative inline-flex h-3 w-3 rounded-full bg-red-600 border-2 border-white dark:border-gray-800"
                                            ></span>
                                        </span>
                                    </button>
                                </template>

                                <template #content>
                                    <NotificationList />
                                </template>
                            </Dropdown>
                        </div>

                        <div class="relative">
                            <Dropdown
                                v-if="canEditProfile"
                                align="right"
                                width="56"
                                :content-classes="[
                                    'p-2 bg-white dark:bg-gray-900',
                                ]"
                                connected
                                @open-change="isDesktopProfileOpen = $event"
                            >
                                <template #trigger>
                                    <button
                                        type="button"
                                        class="relative inline-flex min-h-12 items-center gap-1 rounded-xl border border-transparent bg-transparent px-1 sm:px-2 py-1 text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
                                        :class="
                                            isDesktopProfileOpen
                                                ? 'border-theme-primary text-theme-primary'
                                                : 'text-white hover:text-white'
                                        "
                                        aria-label="Account menu"
                                    >
                                        <Avatar
                                            :user="$page.props.auth.user"
                                            size="sm"
                                        />
                                        <i
                                            class="hidden sm:inline ri-arrow-down-s-line text-lg"
                                            aria-hidden="true"
                                        ></i>
                                    </button>
                                </template>

                                <template #content>
                                    <div class="space-y-2">
                                        <NavMenuItem
                                            :href="route('profile.edit')"
                                            label="Account"
                                            icon="ri-user-settings-line"
                                            :active="
                                                route().current('profile.*')
                                            "
                                        />
                                    </div>
                                    <div class="mt-2">
                                        <NavMenuItem
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
                            <div
                                v-else
                                class="relative inline-flex min-h-12 items-center gap-2 rounded-xl px-2 py-1"
                                aria-hidden="true"
                            >
                                <Avatar
                                    :user="$page.props.auth.user"
                                    size="sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </FireworksAnimation>
    </nav>
</template>
