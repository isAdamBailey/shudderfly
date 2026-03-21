import { onMounted, onUnmounted } from "vue";

export const GAME_VIEWPORT =
    "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";

export function useGameViewportLock() {
    let savedViewportContent = null;
    let htmlTouchAction = "";
    let bodyTouchAction = "";

    onMounted(() => {
        const metas = document.querySelectorAll('meta[name="viewport"]');
        if (metas.length) {
            savedViewportContent = metas[0].getAttribute("content");
            metas.forEach((m) => m.setAttribute("content", GAME_VIEWPORT));
        }

        htmlTouchAction = document.documentElement.style.touchAction;
        bodyTouchAction = document.body.style.touchAction;
        document.documentElement.style.touchAction = "manipulation";
        document.body.style.touchAction = "manipulation";
    });

    onUnmounted(() => {
        if (savedViewportContent !== null) {
            document.querySelectorAll('meta[name="viewport"]').forEach((m) => {
                m.setAttribute("content", savedViewportContent);
            });
        }
        document.documentElement.style.touchAction = htmlTouchAction;
        document.body.style.touchAction = bodyTouchAction;
    });
}
