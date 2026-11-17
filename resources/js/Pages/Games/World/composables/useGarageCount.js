import { ref } from "vue";

/**
 * How many times the Garage door has gone all the way up on this device
 * (issue #227), shown on the opener's readout. It's kept in localStorage,
 * not on the server: storage can be blocked (a private window), and then
 * it counts from 0 for the visit.
 */
const KEY = "games.world.garage.opened";

function stored() {
    try {
        const n = Number.parseInt(localStorage.getItem(KEY), 10);
        return n > 0 ? n : 0;
    } catch {
        return 0;
    }
}

/** { count, opened() }: `count` a ref, opened() adding one to it. */
export function useGarageCount() {
    const count = ref(stored());
    const opened = () => {
        count.value += 1;
        try {
            localStorage.setItem(KEY, String(count.value));
        } catch {
            // Counted for this visit only.
        }
    };
    return { count, opened };
}
