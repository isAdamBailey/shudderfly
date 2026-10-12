/** Toot Slots' machine colours, shared by the one on Guster's wall
 * (three/slotMachine.js) and the one played in the minigame: bright toot
 * greens, brighter than his own olive so they read green in every room
 * light, gold trim and a red knob and payline. */
export const MACHINE_COLORS = Object.freeze({
    green: "#22c55e",
    greenLight: "#4ade80",
    greenDark: "#166534",
    cloud: "#bbf7d0",
    gold: "#facc15",
    red: "#dc2626",
});

/** MACHINE_COLORS as CSS custom properties (`--machine-green-dark`), for
 * the minigame to bind on its root. */
export const MACHINE_CSS_VARS = Object.freeze(
    Object.fromEntries(
        Object.entries(MACHINE_COLORS).map(([name, color]) => [
            `--machine-${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`,
            color,
        ])
    )
);
