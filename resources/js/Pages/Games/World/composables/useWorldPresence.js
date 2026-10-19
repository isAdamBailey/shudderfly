import { channelName } from "@/utils/broadcastChannel";
import { ref } from "vue";

// Echo is made after the page boots (bootstrap.js), and never when Pusher
// isn't configured: look for it this many times, this far apart, then give
// up quietly and leave the world as it is alone (useWorldClockSync does the
// same).
const ECHO_ATTEMPTS = 20;
const ECHO_RETRY_MS = 500;

const ROSTER = "world";

/**
 * Being in the Games World with other people (issue #174): the presence
 * roster of who else is in the world, as `{ id, name }` members. This is the
 * only place that joins the world's channels, and later the only place that
 * whispers on them.
 *
 * `enabled` is decided once by the page (the `world_together_enabled` setting
 * and a logged-in visitor). Off, `join()` does nothing at all, so the world is
 * exactly what it is without this.
 */
export function useWorldPresence({ enabled }) {
    const members = ref([]);

    let joined = false;
    let retry = null;
    let attempts = 0;

    const without = (member) => members.value.filter((m) => m.id !== member.id);

    function join() {
        if (!enabled || joined || retry) return;
        if (!window.Echo) {
            if (attempts++ >= ECHO_ATTEMPTS) return;
            retry = setTimeout(() => {
                retry = null;
                join();
            }, ECHO_RETRY_MS);
            return;
        }
        try {
            window.Echo.join(channelName(ROSTER))
                .here((here) => {
                    members.value = here;
                })
                .joining((member) => {
                    members.value = [...without(member), member];
                })
                .leaving((member) => {
                    members.value = without(member);
                })
                // Refused (switched off since the page loaded): nobody
                // to see, and nothing else changes.
                .error((error) => {
                    console.warn("Not let into the Games World roster:", error);
                    members.value = [];
                });
            joined = true;
        } catch (e) {
            console.error("Error joining the Games World roster:", e);
        }
    }

    function leave() {
        clearTimeout(retry);
        retry = null;
        members.value = [];
        if (!joined) return;
        joined = false;
        window.Echo?.leave(channelName(ROSTER));
    }

    return { members, join, leave };
}
