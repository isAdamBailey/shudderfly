import { nextTick } from "vue";

const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(panelRef) {
    let lastFocusedElement = null;

    function focusableElements() {
        if (!panelRef.value) return [];
        return Array.from(
            panelRef.value.querySelectorAll(FOCUSABLE_SELECTOR)
        ).filter((el) => el.offsetParent !== null);
    }

    function activate() {
        lastFocusedElement = document.activeElement;
        nextTick(() => panelRef.value?.focus());
    }

    function deactivate() {
        if (
            lastFocusedElement &&
            document.contains(lastFocusedElement) &&
            typeof lastFocusedElement.focus === "function"
        ) {
            lastFocusedElement.focus();
        }
        lastFocusedElement = null;
    }

    function trapKeydown(e) {
        if (e.key !== "Tab") return;

        const elements = focusableElements();
        if (elements.length === 0) {
            e.preventDefault();
            return;
        }

        const first = elements[0];
        const last = elements[elements.length - 1];
        const isOutside = !panelRef.value.contains(document.activeElement);

        if (e.shiftKey) {
            if (document.activeElement === first || isOutside) {
                e.preventDefault();
                last.focus();
            }
        } else if (document.activeElement === last || isOutside) {
            e.preventDefault();
            first.focus();
        }
    }

    return { activate, deactivate, trapKeydown };
}
