/**
 * Shared by the WebGL scenes' DOM overlays (Road3D.vue, Room3D.vue): how a
 * hit box sits over what the canvas draws, and what counts as a tap.
 */

/** A square `size` px hit box standing on screen point (x, y): centred on
 * x, its bottom at y (a character's feet). */
export function boxStyle({ x, y, size }) {
    return {
        width: `${size}px`,
        height: `${size}px`,
        transform: `translate3d(${x - size / 2}px, ${y - size}px, 0)`,
    };
}

// A press that moves further than this is a drag or a pan, not a tap.
const TAP_SLOP = 8; // px

/** Whether a press from `start` has moved too far by `event` to be a tap. */
export function pastTap(start, event) {
    return (
        Math.hypot(
            event.clientX - start.clientX,
            event.clientY - start.clientY
        ) > TAP_SLOP
    );
}
