import { ref } from "vue";

/**
 * Promise-based confirm using `<ConfirmDialog>` (mount one dialog per component).
 *
 * @param {string|{ message: string, title?: string, confirmLabel?: string, cancelLabel?: string, confirmVariant?: 'primary'|'danger' }} options
 * @returns {Promise<boolean>}
 */
export function useConfirmDialog() {
    const show = ref(false);
    const message = ref("");
    const title = ref("");
    const confirmLabel = ref("");
    const cancelLabel = ref("");
    const confirmVariant = ref("primary");
    let resolveFn = null;

    function ask(options) {
        const o = typeof options === "string" ? { message: options } : options;
        return new Promise((resolve) => {
            if (resolveFn !== null) {
                resolveFn(false);
                resolveFn = null;
            }
            message.value = o.message ?? "";
            title.value = o.title ?? "";
            confirmLabel.value = o.confirmLabel ?? "";
            cancelLabel.value = o.cancelLabel ?? "";
            confirmVariant.value = o.confirmVariant ?? "primary";
            resolveFn = resolve;
            show.value = true;
        });
    }

    function onConfirmed() {
        resolveFn?.(true);
        resolveFn = null;
    }

    function onCancelled() {
        resolveFn?.(false);
        resolveFn = null;
    }

    return {
        show,
        message,
        title,
        confirmLabel,
        cancelLabel,
        confirmVariant,
        ask,
        onConfirmed,
        onCancelled,
    };
}
