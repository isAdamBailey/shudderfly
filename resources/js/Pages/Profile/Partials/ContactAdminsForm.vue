<script setup>
import ContactAdminsCommButtons from "@/Pages/Profile/Partials/ContactAdminsCommButtons.vue";
</script>

<template>
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
                icon="ri-emotion-sad-fill"
            />

            <ContactAdminsCommButtons
                title="Feel excited today?"
                message="I feel very excited today!"
                icon="ri-emotion-laugh-fill"
            />
        </div>
        <div>
            <ContactAdminsCommButtons
                title="Do you feel really silly today?"
                message="I feel really silly today!"
                icon="ri-emotion-happy-fill"
            />

            <ContactAdminsCommButtons
                title="Love mom and dad?"
                message="I love you mom and dad!"
                icon="ri-hearts-fill"
            />
        </div>
    </div>
</template>
