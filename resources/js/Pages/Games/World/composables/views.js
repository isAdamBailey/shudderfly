/**
 * Which wall of a room the camera faces (issue #183), as a quarter turn of
 * the room. Each view has its own frame in which the faced wall is "the back
 * wall": it runs along x from 0 to its width at z = 0, and the room reaches
 * toward +z, so projection.js's level camera looking down -z works the same
 * in every view. Room points go in and come out in the room's own frame
 * (back wall at z = 0, open front at z = size.d).
 *
 * view = { wall, size: { w, d } }  // wall: back, right, front or left
 *
 * No view, as on the road, is the back view: the room's frame as it is.
 */

// Each view's turn, as `toView`/`fromView` between a room point and the
// view's frame, and the camera's `yaw` (Three.js, turning about +y) that
// looks at it. Turning right faces the right wall (x = w) with the back
// wall on your left; front is half a turn, left three quarters.
const VIEWS = {
    back: {
        yaw: 0,
        toView: ({ x, z }) => ({ x, z }),
        fromView: ({ x, z }) => ({ x, z }),
    },
    right: {
        yaw: -Math.PI / 2,
        toView: ({ x, z }, { w }) => ({ x: z, z: w - x }),
        fromView: ({ x, z }, { w }) => ({ x: w - z, z: x }),
    },
    front: {
        yaw: Math.PI,
        toView: ({ x, z }, { w, d }) => ({ x: w - x, z: d - z }),
        fromView: ({ x, z }, { w, d }) => ({ x: w - x, z: d - z }),
    },
    left: {
        yaw: Math.PI / 2,
        toView: ({ x, z }, { d }) => ({ x: d - z, z: x }),
        fromView: ({ x, z }, { d }) => ({ x: z, z: d - x }),
    },
};

/** The walls a view can face, turning right from the back. */
export const WALLS = Object.keys(VIEWS);

/** The wall across the room from `wall`: behind a camera facing it. */
export function wallBehind(wall) {
    return WALLS[(WALLS.indexOf(wall) + 2) % WALLS.length];
}

/** Whether `view` turns the room at all: not on the road, nor facing back. */
export function turned(view) {
    return Boolean(view) && view.wall !== "back";
}

function turnOf(view) {
    return VIEWS[view?.wall] ?? VIEWS.back;
}

/** Room point `point` ({ x, y?, z }) in `view`'s frame, `y` kept. */
export function toView(view, point) {
    return { ...point, ...turnOf(view).toView(point, view?.size) };
}

/** `view`'s frame point `point` back in the room: toView() undone. */
export function fromView(view, point) {
    return { ...point, ...turnOf(view).fromView(point, view?.size) };
}

/** The camera's turn about +y for `view`, in radians (0 facing back). */
export function viewYaw(view) {
    return turnOf(view).yaw;
}

/** The room as `view` sees it: `w` along the faced wall, `d` from it to
 * the wall behind the camera. */
export function viewSize(view) {
    const { w, d } = view.size;
    return view.wall === "left" || view.wall === "right"
        ? { w: d, d: w }
        : { w, d };
}
