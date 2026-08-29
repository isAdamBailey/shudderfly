import { onMounted } from "vue";

/**
 * Starts a game as soon as its page mounts.
 *
 * The games used to open on a start screen with a Play button. That job now
 * belongs to the confirm card in the Games World (`/games`): by the time a
 * player lands on a game page they have already picked it and pressed Play,
 * so a second Play button would just be a door in front of a door.
 *
 * Pass the same function the old start screen's `@play` was wired to — the
 * one that unlocks audio and starts the round.
 */
export function useAutoStartGame(start) {
    onMounted(start);
}
