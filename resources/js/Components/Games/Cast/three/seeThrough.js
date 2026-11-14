/**
 * Fades `meshes` from solid (1) to gone (0) with see-through copies of
 * their materials, made the first time they fade, so the materials they
 * share with everything else (a cast kit's, a street's) stay opaque and out
 * of the blended pass. Back at 1 (or more), the shared ones go back and the
 * copies are freed; only the copies are ever changed or freed. `set(opacity)`
 * returns whether anything changed.
 */
export function seeThrough(meshes) {
    // [{ mesh, shared, copy }] while faded.
    let faded = null;
    let shown = 1;
    return {
        set(opacity) {
            const o = Math.min(1, opacity);
            if (o === shown) return false;
            shown = o;
            if (o === 1) {
                for (const { mesh, shared, copy } of faded) {
                    if (mesh.material === copy) mesh.material = shared;
                    copy.dispose();
                }
                faded = null;
                return true;
            }
            if (!faded) {
                faded = meshes.map((mesh) => {
                    const copy = mesh.material.clone();
                    copy.transparent = true;
                    const shared = mesh.material;
                    mesh.material = copy;
                    return { mesh, shared, copy };
                });
            }
            for (const { copy } of faded) copy.opacity = o;
            return true;
        },
    };
}
