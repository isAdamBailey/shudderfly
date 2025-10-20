<script setup>
import ContactAdminsMessageBuilder from "@/Pages/Profile/Partials/ContactAdminsMessageBuilder.vue";

defineProps({
    adminUsers: {
        type: Array,
        default: () => [],
    },
});
</script>

<template>
    <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Send messages! You can email them or say it out loud. You can only send
        one email every hour.
    </p>
    <p class="mt-1 text-sm text-gray-600 dark:text-gray-400 mb-5">
        These messages will be sent to
        <span
            v-for="(admin, index) in adminUsers"
            :key="index"
            class="font-medium text-gray-900 dark:text-gray-100"
        >
            {{ admin.name }}{{ index < adminUsers.length - 1 ? ", " : "." }}
        </span>
    </p>

    <div class="w-full">
        <ContactAdminsMessageBuilder :admin-users="adminUsers" />
    </div>
</template>
