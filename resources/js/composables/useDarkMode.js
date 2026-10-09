import { useMutationObserver } from "@vueuse/core";
import { ref } from "vue";

const isDark = () => document.documentElement.classList.contains("dark");

/** Whether the site is in dark mode: the `dark` class on <html>, which the
 * header's ThemeToggle and the OS preference (app.blade.php) set. Follows
 * it as it changes. */
export function useDarkMode() {
    const dark = ref(isDark());
    useMutationObserver(
        document.documentElement,
        () => {
            dark.value = isDark();
        },
        { attributes: true, attributeFilter: ["class"] }
    );
    return dark;
}
