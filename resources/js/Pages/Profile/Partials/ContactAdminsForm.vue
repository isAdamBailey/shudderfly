<script setup>
import ContactAdminsCommButtons from "@/Pages/Profile/Partials/ContactAdminsCommButtons.vue";

defineProps({
  adminUsers: {
    type: Array,
    default: () => []
  }
});
</script>

<template>
  <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
    Send messages! You can email them or say it out loud. You can only send one
    email every hour.
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
  <div class="flex flex-wrap gap-8">
    <div>
      <ContactAdminsCommButtons
        title="Dont feel very good today?"
        message="I don't feel very good today."
        icon="ri-emotion-sad-fill"
      />

      <ContactAdminsCommButtons
        title="Does your tummy hurt?"
        message="My tummy hurts!"
        icon="ri-emotion-unhappy-fill"
      />
    </div>
    <div>
      <ContactAdminsCommButtons
        title="Do your legs hurt?"
        message="My legs hurt!"
        icon="ri-emotion-unhappy-fill"
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
