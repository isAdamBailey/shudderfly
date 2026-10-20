/**
 * Other people's butts in a scene (issue #174), for the road and the rooms
 * alike: a `castMesh("butt")` each, made as they turn up and dropped as they
 * go. Returns { sync(others, place, dt), setSize(size),
 * setReducedMotion(on), dispose() }.
 */
export function createOtherPuppets(kit, scene) {
    // User id → puppet.
    const puppets = new Map();
    let size = null;
    let reduced = false;

    /** Stands everyone in `others` (useOthers' { id, x, z, lane, facing,
     * walking, lift }) at `place(other)`, { x, z } in the scene; true if
     * that changed anything. */
    function sync(others, place, dt) {
        let changed = false;
        for (const [id, puppet] of puppets) {
            if (others.some((o) => o.id === id)) continue;
            puppet.dispose();
            puppets.delete(id);
            changed = true;
        }
        for (const other of others) {
            let puppet = puppets.get(other.id);
            if (!puppet) {
                puppet = kit.castMesh("butt", size ? { size } : {});
                puppet.setReducedMotion(reduced);
                scene.add(puppet.group);
                puppets.set(other.id, puppet);
                changed = true;
            }
            const { x, z } = place(other);
            const at = puppet.group.position;
            if (at.x !== x || at.z !== z) {
                at.set(x, 0, z);
                changed = true;
            }
            puppet.set({
                lift: other.lift,
                facing: other.facing < 0 ? "left" : "right",
            });
            puppet.setMove(other.walking ? "walk" : null);
            changed = puppet.tick(dt) || changed;
        }
        return changed;
    }

    return {
        sync,
        setSize(next) {
            size = next;
            for (const puppet of puppets.values()) puppet.set({ size });
        },
        setReducedMotion(on) {
            reduced = on;
            for (const puppet of puppets.values()) {
                puppet.setReducedMotion(on);
            }
        },
        dispose() {
            for (const puppet of puppets.values()) puppet.dispose();
            puppets.clear();
        },
    };
}
