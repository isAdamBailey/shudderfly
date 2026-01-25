/* global route */
import axios from "axios";
import { nextTick, onMounted, onUnmounted, ref } from "vue";

export function useMessageLocator({
    messages,
    normalizeMessage,
    pauseInfiniteScroll,
    resumeInfiniteScroll,
}) {
    const isScrollingToMessage = ref(false);
    const targetMessageId = ref(null);

    const getAbsoluteOffsetTop = (element) => {
        if (!element) {
            return 0;
        }

        let offsetTop = 0;
        let currentElement = element;

        while (currentElement) {
            offsetTop += currentElement.offsetTop;
            currentElement = currentElement.offsetParent;

            if (!currentElement) {
                break;
            }
        }

        return offsetTop;
    };

    const createScrollState = () => ({
        savedScrollElement: null,
        savedAbsoluteOffset: 0,
    });

    const saveScrollPosition = (state) => {
        if (isScrollingToMessage.value && targetMessageId.value) {
            state.savedScrollElement = document.getElementById(
                `message-${targetMessageId.value}`
            );
            if (state.savedScrollElement) {
                state.savedAbsoluteOffset = getAbsoluteOffsetTop(
                    state.savedScrollElement
                );
            }
        }
    };

    const restoreScrollPosition = (state) => {
        if (
            !state ||
            !state.savedScrollElement ||
            !isScrollingToMessage.value
        ) {
            return;
        }

        nextTick(() => {
            const element = document.getElementById(
                `message-${targetMessageId.value}`
            );
            if (element) {
                const currentAbsoluteOffset = getAbsoluteOffsetTop(element);
                const offsetDiff = currentAbsoluteOffset - state.savedAbsoluteOffset;
                if (Math.abs(offsetDiff) > 1) {
                    window.scrollBy(0, offsetDiff);
                }
            }
        });
    };

    const clearMessageTarget = () => {
        isScrollingToMessage.value = false;
        targetMessageId.value = null;
        if (resumeInfiniteScroll) {
            resumeInfiniteScroll();
        }
    };

    const scrollToMessage = async () => {
        if (typeof window === "undefined" || !window?.location) {
            return;
        }

        const hash = window.location?.hash;
        if (!hash || !hash.startsWith("#message-")) {
            return;
        }

        const messageId = parseInt(hash.replace("#message-", ""), 10);
        if (!messageId) {
            return;
        }

        isScrollingToMessage.value = true;
        targetMessageId.value = messageId;

        if (pauseInfiniteScroll) {
            pauseInfiniteScroll();
        }

        const messageExists = messages.value.some((m) => m.id === messageId);
        if (!messageExists) {
            try {
                const response = await axios.get(
                    route("messages.show", messageId)
                );
                const fetchedMessage = normalizeMessage(response.data);
                messages.value.push(fetchedMessage);
                messages.value.sort((a, b) => {
                    const dateA = new Date(a.created_at);
                    const dateB = new Date(b.created_at);
                    return dateB - dateA;
                });
                await nextTick();
            } catch (error) {
                console.error("Failed to fetch message:", error);
                clearMessageTarget();
                return;
            }
        }

        setTimeout(() => {
            const element = document.getElementById(`message-${messageId}`);
            if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "center" });
                element.classList.add(
                    "ring-2",
                    "ring-blue-500",
                    "ring-offset-2"
                );
                setTimeout(() => {
                    element.classList.remove(
                        "ring-2",
                        "ring-blue-500",
                        "ring-offset-2"
                    );
                    setTimeout(() => {
                        clearMessageTarget();
                    }, 1000);
                }, 2000);
            } else {
                clearMessageTarget();
            }
        }, 100);
    };

    onMounted(() => {
        scrollToMessage();
        if (
            typeof window !== "undefined" &&
            typeof window.addEventListener === "function"
        ) {
            window.addEventListener("hashchange", scrollToMessage);
        }
    });

    onUnmounted(() => {
        if (
            typeof window !== "undefined" &&
            typeof window.removeEventListener === "function"
        ) {
            window.removeEventListener("hashchange", scrollToMessage);
        }
    });

    return {
        saveScrollPosition,
        restoreScrollPosition,
        createScrollState,
    };
}
