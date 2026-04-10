import { usePage } from "@inertiajs/vue3";
import { computed } from "vue";

function permissionNames(page) {
  const raw = page.props.auth?.user?.permissions_list;
  return Array.isArray(raw) ? raw : [];
}

export function usePermissions() {
  const page = usePage();

  const canEditPages = computed(() =>
    permissionNames(page).includes("edit pages")
  );

  const canEditProfile = computed(() =>
    permissionNames(page).includes("edit profile")
  );

  const canAdmin = computed(() =>
    permissionNames(page).includes("admin")
  );

  return { canEditPages, canEditProfile, canAdmin };
}
