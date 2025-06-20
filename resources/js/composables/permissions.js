import { usePage } from "@inertiajs/vue3";
import { computed } from "vue";

export function usePermissions() {
  const canEditPages = computed(() => {
    return usePage().props.auth.user.permissions_list.includes("edit pages");
  });

  const canEditProfile = computed(() => {
    return usePage().props.auth.user.permissions_list.includes("edit profile");
  });

  const canAdmin = computed(() => {
    return usePage().props.auth.user.permissions_list.includes("admin");
  });

  return { canEditPages, canEditProfile, canAdmin };
}
