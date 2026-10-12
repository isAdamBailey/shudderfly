/*
 * The view a drawn cast figure is seen from (the Butt, Guster): a yaw, then
 * a pitch, then perspective, in the same YXZ order castMesh turns its WebGL
 * figure, so the DOM and WebGL drawings match. No Three.js and no Vue.
 *
 * A view is { yaw, pitch, focal }: degrees, and the camera's distance.
 */

const DEG = Math.PI / 180;

/** `point` ({ x, y, z }, y up) turned to `view`. */
export function turn(point, view) {
    const pitch = view.pitch * DEG;
    const yaw = view.yaw * DEG;
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const y1 = point.y * cp - point.z * sp;
    const z1 = point.y * sp + point.z * cp;
    return {
        x: point.x * cy + z1 * sy,
        y: y1,
        z: -point.x * sy + z1 * cy,
    };
}

/** `point` turned to `view` and put in perspective: `scale` is how much
 * nearer things grow. */
export function project(point, view) {
    const viewed = turn(point, view);
    const scale = view.focal / (view.focal - viewed.z);
    return {
        x: viewed.x * scale,
        y: viewed.y * scale,
        z: viewed.z,
        scale,
    };
}

/** The box round projected shapes: ellipses (`rx`, `ry`), circles (`r`)
 * and round-capped lines (`x1`…`y2`, `width`). */
export function boundsOf(shapes) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const add = (x, y, rx, ry = rx) => {
        minX = Math.min(minX, x - rx);
        maxX = Math.max(maxX, x + rx);
        minY = Math.min(minY, y - ry);
        maxY = Math.max(maxY, y + ry);
    };
    for (const shape of shapes) {
        if (shape.rx) add(shape.x, shape.y, shape.rx, shape.ry);
        else if (shape.r) add(shape.x, shape.y, shape.r);
        else {
            add(shape.x1, shape.y1, shape.width / 2);
            add(shape.x2, shape.y2, shape.width / 2);
        }
    }
    return {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
    };
}
