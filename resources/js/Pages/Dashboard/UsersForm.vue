<template>
    <div class="mt-10">
        <div v-if="canAdmin" class="mb-6">
            <p class="text-gray-700 dark:text-gray-100 mb-3">
                This is where you can manage other users, as an administrator of
                this application.
            </p>
            <ul class="text-gray-700 dark:text-gray-100 space-y-1">
                <li>
                    Making someone an <strong>admin</strong> lets them edit
                    other users (including you)! They have access to this page.
                </li>
                <li>
                    Allowing someone to <strong>edit pages</strong> gives them
                    access to add, edit and delete books and pages.
                </li>
                <li>
                    Allowing someone to <strong>edit profile</strong> gives them
                    access to edit and delete their own profile and the ability
                    to log out of the application.
                </li>
            </ul>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
                v-for="user in users"
                :key="user.email"
                class="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-shadow"
            >
                <div class="flex items-start justify-between">
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar :user="user" size="md" />
                        <div class="flex-1 min-w-0">
                            <Link
                                :href="route('users.show', user.email)"
                                class="font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors block truncate"
                            >
                                {{ user.name }}
                            </Link>
                            <p
                                class="text-sm text-gray-500 dark:text-gray-400 truncate"
                            >
                                {{ user.email }}
                            </p>
                            <div class="flex flex-wrap gap-1 mt-2">
                                <span
                                    v-if="userIsAdmin(user)"
                                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                                >
                                    Admin
                                </span>
                                <span
                                    v-if="userCanEditPages(user)"
                                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                >
                                    Edit Pages
                                </span>
                                <span
                                    v-if="userCanEditProfile(user)"
                                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                >
                                    Edit Profile
                                </span>
                            </div>
                        </div>
                    </div>
                    <div v-if="canAdmin" class="flex-shrink-0 ml-2">
                        <Dropdown align="right" width="48">
                            <template #trigger>
                                <button
                                    type="button"
                                    class="w-8 h-8 p-0 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                                    title="User actions"
                                    aria-label="User actions"
                                >
                                    <i class="ri-more-2-fill text-lg"></i>
                                </button>
                            </template>
                            <template #content>
                                <div class="py-1">
                                    <div v-if="userIsAdmin(user)">
                                        <button
                                            type="button"
                                            :disabled="isCurrentUser(user)"
                                            class="block w-full px-4 py-2 text-left text-sm leading-5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                                            @click="
                                                removePermission(user, 'admin')
                                            "
                                        >
                                            <div
                                                class="flex items-center gap-2"
                                            >
                                                <i
                                                    class="ri-shield-cross-line"
                                                ></i>
                                                <span>Revoke Admin</span>
                                            </div>
                                        </button>
                                    </div>
                                    <div v-else>
                                        <button
                                            type="button"
                                            class="block w-full px-4 py-2 text-left text-sm leading-5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none transition duration-150 ease-in-out"
                                            @click="
                                                addPermission(user, 'admin')
                                            "
                                        >
                                            <div
                                                class="flex items-center gap-2"
                                            >
                                                <i
                                                    class="ri-shield-check-line"
                                                ></i>
                                                <span>Make Admin</span>
                                            </div>
                                        </button>
                                    </div>
                                    <div v-if="userCanEditPages(user)">
                                        <button
                                            type="button"
                                            :disabled="isCurrentUser(user)"
                                            class="block w-full px-4 py-2 text-left text-sm leading-5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                                            @click="
                                                removePermission(
                                                    user,
                                                    'edit pages'
                                                )
                                            "
                                        >
                                            <div
                                                class="flex items-center gap-2"
                                            >
                                                <i class="ri-edit-box-line"></i>
                                                <span>Revoke Edit Pages</span>
                                            </div>
                                        </button>
                                    </div>
                                    <div v-else>
                                        <button
                                            type="button"
                                            class="block w-full px-4 py-2 text-left text-sm leading-5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none transition duration-150 ease-in-out"
                                            @click="
                                                addPermission(
                                                    user,
                                                    'edit pages'
                                                )
                                            "
                                        >
                                            <div
                                                class="flex items-center gap-2"
                                            >
                                                <i class="ri-edit-box-line"></i>
                                                <span>Allow Edit Pages</span>
                                            </div>
                                        </button>
                                    </div>
                                    <div v-if="userCanEditProfile(user)">
                                        <button
                                            type="button"
                                            :disabled="isCurrentUser(user)"
                                            class="block w-full px-4 py-2 text-left text-sm leading-5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                                            @click="
                                                removePermission(
                                                    user,
                                                    'edit profile'
                                                )
                                            "
                                        >
                                            <div
                                                class="flex items-center gap-2"
                                            >
                                                <i
                                                    class="ri-user-settings-line"
                                                ></i>
                                                <span
                                                    >Revoke Profile
                                                    Editing</span
                                                >
                                            </div>
                                        </button>
                                    </div>
                                    <div v-else>
                                        <button
                                            type="button"
                                            class="block w-full px-4 py-2 text-left text-sm leading-5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none transition duration-150 ease-in-out"
                                            @click="
                                                addPermission(
                                                    user,
                                                    'edit profile'
                                                )
                                            "
                                        >
                                            <div
                                                class="flex items-center gap-2"
                                            >
                                                <i
                                                    class="ri-user-settings-line"
                                                ></i>
                                                <span
                                                    >Allow Profile Editing</span
                                                >
                                            </div>
                                        </button>
                                    </div>
                                    <div
                                        class="border-t border-gray-200 dark:border-gray-600 my-1"
                                    ></div>
                                    <button
                                        type="button"
                                        :disabled="isCurrentUser(user)"
                                        class="block w-full px-4 py-2 text-left text-sm leading-5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                                        @click="deleteUser(user)"
                                    >
                                        <div class="flex items-center gap-2">
                                            <i class="ri-delete-bin-line"></i>
                                            <span>Delete User</span>
                                        </div>
                                    </button>
                                </div>
                            </template>
                        </Dropdown>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import Avatar from "@/Components/Avatar.vue";
import Dropdown from "@/Components/Dropdown.vue";
import { usePermissions } from "@/composables/permissions";
import { Link, useForm, usePage } from "@inertiajs/vue3";

const { canAdmin } = usePermissions();

const isCurrentUser = (user) =>
    usePage().props.auth.user.name === user.name ||
    user.email === "adamjbailey7@gmail.com";

const form = useForm({
    user: null,
    permissions: null,
});

const addPermission = (user, permission) => {
    form.user = user;
    form.permissions = [...new Set([...user.permissions_list, permission])];
    form.put(route("admin.permissions"), {
        preserveScroll: true,
    });
};

const removePermission = (user, permission) => {
    form.user = user;
    form.permissions = user.permissions_list.filter((p) => p !== permission);
    form.put(route("admin.permissions"), {
        preserveScroll: true,
    });
};

const deleteUser = (user) => {
    form.delete(route("admin.destroy", { email: user.email }), {
        onBefore: () =>
            confirm(
                `Are you sure you want to delete ${user.name}? All data related to them will be deleted.`
            ),
    });
};

const userIsAdmin = (user) => {
    return user.permissions_list.includes("admin");
};

const userCanEditPages = (user) => {
    return user.permissions_list.includes("edit pages");
};

const userCanEditProfile = (user) => {
    return user.permissions_list.includes("edit profile");
};

defineProps({
    users: { type: Array, required: true },
});
</script>
