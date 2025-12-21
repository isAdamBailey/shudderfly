import { usePage } from "@inertiajs/vue3";
import { computed } from "vue";

/**
 * Composable for accessing translations in Vue components.
 * Translations are passed from Laravel via Inertia shared props.
 */
export function useTranslations() {
  const page = usePage();

  const translations = computed(() => {
    return page.props.translations || {};
  });

  /**
   * Get a translation by key.
   * @param {string} key - The translation key
   * @param {object} replacements - Optional replacements for placeholders
   * @returns {string} The translated string
   */
  const t = (key, replacements = {}) => {
    let translation = translations.value[key] || key;

    // Replace placeholders (e.g., :book, :name)
    Object.keys(replacements).forEach((placeholder) => {
      translation = translation.replace(
        new RegExp(`:${placeholder}`, "g"),
        replacements[placeholder]
      );
    });

    return translation;
  };

  return {
    translations,
    t
  };
}
