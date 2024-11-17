<template>
    <div class="mt-10 flex flex-col">
        <div class="overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div class="inline-block min-w-full sm:px-6 lg:px-8">
                <p class="text-gray-700 dark:text-gray-100 mb-3">
                    This is where you can manage other users, as an
                    administrator of this application.
                </p>
                <ul class="text-gray-700 dark:text-gray-100">
                    <li>
                        Making someone an admin lets them add, edit and delete
                        books and pages, as well as edit other users (including
                        you)! They have access to this page.
                    </li>
                    <li>
                        Allowing someone to edit their profile gives them access
                        to edit and delete their own profile and the ability to
                        log out of the application.
                    </li>
                </ul>
                <div class="overflow-hidden">
                    <table class="min-w-full">
                        <thead class="border-b">
                            <tr>
                                <th
                                    scope="col"
                                    class="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100"
                                >
                                    Name
                                </th>
                                <th
                                    scope="col"
                                    class="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100"
                                >
                                    Email
                                </th>
                                <th
                                    scope="col"
                                    class="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100"
                                >
                                    Role
                                </th>
                                <th scope="col"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="(user, index) in users.data"
                                :key="index"
                                class="border-b bg-white"
                            >
                                <td
                                    class="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900"
                                >
                                    {{ user.name }}
                                </td>
                                <td
                                    class="whitespace-nowrap px-6 py-4 text-sm font-light text-gray-900"
                                >
                                    {{ user.email }}
                                </td>
                                <td>
                                    <div v-if="userIsAdmin(user)">
                                        <Button
                                            :disabled="isCurrentUser(user)"
                                            :class="{
                                                'opacity-25':
                                                    isCurrentUser(user),
                                            }"
                                            @click="
                                                removePermission(
                                                    user,
                                                    'edit pages'
                                                )
                                            "
                                        >
                                            Revoke Admin
                                        </Button>
                                    </div>
                                    <div v-else class="my-1">
                                        <DangerButton
                                            @click="
                                                addPermission(
                                                    user,
                                                    'edit pages'
                                                )
                                            "
                                            >Make Admin</DangerButton
                                        >
                                    </div>
                                    <div v-if="userCanEditProfile(user)">
                                        <Button
                                            :disabled="isCurrentUser(user)"
                                            :class="{
                                                'opacity-25':
                                                    isCurrentUser(user),
                                            }"
                                            @click="
                                                removePermission(
                                                    user,
                                                    'edit profile'
                                                )
                                            "
                                        >
                                            Revoke Profile Editing
                                        </Button>
                                    </div>
                                    <div v-else>
                                        <DangerButton
                                            @click="
                                                addPermission(
                                                    user,
                                                    'edit profile'
                                                )
                                            "
                                            >Allow Profile Editing</DangerButton
                                        >
                                    </div>
                                </td>
                                <td>
                                    <DangerButton
                                        :disabled="isCurrentUser(user)"
                                        :class="{
                                            'opacity-25': isCurrentUser(user),
                                        }"
                                        @click="deleteUser(user)"
                                    >
                                        X
                                    </DangerButton>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import DangerButton from "@/Components/DangerButton.vue";
import { useForm, usePage } from "@inertiajs/vue3";
import Button from "@/Components/Button.vue";

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
    return user.permissions_list.includes("edit pages");
};

const userCanEditProfile = (user) => {
    return user.permissions_list.includes("edit profile");
};

defineProps({
    users: Object,
});
</script>
