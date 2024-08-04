<script setup>
import ContactAdminsCommButtons from "@/Pages/Profile/Partials/ContactAdminsCommButtons.vue";
</script>

<template>
    <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">
        Contact Admins
    </h2>
    <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Send messages to mom and dad! You can email them or say it out loud.
    </p>
    <p class="mb-8 text-sm text-gray-600 dark:text-gray-400">
        You can only send one email every hour.
    </p>
    <div class="flex flex-wrap gap-8">
        <div>
            <ContactAdminsCommButtons
                title="Dont feel very good today?"
                message="I don't feel very good today."
            />

            <ContactAdminsCommButtons
                title="Feel excited today?"
                message="I feel very excited today!"
            />
        </div>
        <div>
            <ContactAdminsCommButtons
                title="Do you feel really silly today?"
                message="I feel really silly today!"
            />

            <ContactAdminsCommButtons
                title="Love mom and dad?"
                message="I love you mom and dad!"
            />
        </div>
    </div>
</template>
