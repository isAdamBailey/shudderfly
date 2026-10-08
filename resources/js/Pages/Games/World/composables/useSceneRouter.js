import { computed, unref } from "vue";

/**
 * Which scene of the Games World is showing. DOM-free like useGamesWorld: the
 * stage reads `current` and mounts its renderer.
 *
 * Only the road exists so far; moving between scenes, history and
 * sessionStorage restore arrive with doors (issue #130, Phase 4).
 */
export function useSceneRouter(scenes) {
    const current = computed(() => unref(scenes)?.road ?? null);

    return { current };
}
