// Picture frames a room can hang round a picture or a photo, by the name
// its `image.frame` gives (GamesWorld::PICTURE_FRAMES; a test keeps the
// lists in step). Any wall picture or room photo can take one; with none it
// hangs on a plain panel (RoomScene.js panelMesh()).
//
// Each style is data: how wide its moulding is round the picture
// (`border`), how far it stands off the wall (`depth`), its bevel, its
// finish, and an inner lip (`lip`) of a second finish, with `beads` (how
// many along each side, if any) and corner `rosettes`. A new style is a
// new entry, no new code.
//
// Built in world units: the picture `w` × `h` in the frame's hole, its
// bottom middle at the origin, the back on z = 0 facing +z (the room poses
// it on its wall). The moulding reaches `border` past the picture all
// round, so what's around the picture must clear that too.

export const PICTURE_FRAMES = {
    // Old gilt: a raised, bevelled moulding that the candles glint off, a
    // darker beaded lip round the picture and a rosette at each corner.
    ornate: {
        border: 18,
        depth: 8,
        bevel: 4,
        finish: { color: "#c9a227", metalness: 0.75, roughness: 0.3 },
        lip: {
            width: 4,
            finish: { color: "#8a6a1c", metalness: 0.7, roughness: 0.4 },
            beads: 9,
        },
        rosettes: 7,
    },
    // Guster's: chunky wood painted his toot green, a plain gold lip round
    // the picture and a green knob at each corner.
    green: {
        border: 14,
        depth: 9,
        bevel: 3,
        finish: { color: "#16a34a", metalness: 0.05, roughness: 0.55 },
        lip: {
            width: 3,
            finish: { color: "#facc15", metalness: 0.6, roughness: 0.35 },
            beads: 0,
        },
        rosettes: 5,
    },
};

/** How far frame style `name`'s moulding reaches past its picture (0 for
 * none, or a style there isn't). */
export const frameBorder = (name) => PICTURE_FRAMES[name]?.border ?? 0;

/** A rectangle `w` × `h` round (cx, cy), as a path for a Shape. */
function rect(path, cx, cy, w, h) {
    path.moveTo(cx - w / 2, cy - h / 2);
    path.lineTo(cx + w / 2, cy - h / 2);
    path.lineTo(cx + w / 2, cy + h / 2);
    path.lineTo(cx - w / 2, cy + h / 2);
    path.closePath();
    return path;
}

/** A flat ring `thick` wide round a `w` × `h` hole centred on (0, cy),
 * pushed out `depth` with a `bevel` on its edges. A bevel swells a shape's
 * outline, round its hole too, so the shape is drawn that much inside. */
function ring(THREE, w, h, cy, thick, depth, bevel) {
    const size = Math.min(bevel, thick / 3);
    const shape = rect(
        new THREE.Shape(),
        0,
        cy,
        w + (thick - size) * 2,
        h + (thick - size) * 2
    );
    shape.holes.push(rect(new THREE.Path(), 0, cy, w + size * 2, h + size * 2));
    return new THREE.ExtrudeGeometry(shape, {
        depth: depth - bevel * 2,
        bevelEnabled: bevel > 0,
        bevelThickness: bevel,
        bevelSize: size,
        bevelSegments: 2,
        curveSegments: 1,
    }).translate(0, 0, bevel);
}

/** Points spaced along the edge of a `w` × `h` rectangle centred on
 * (0, cy): `n` along each side, the corners counted once. */
function edgePoints(w, h, cy, n) {
    const points = [];
    for (let i = 0; i < n; i += 1) {
        const t = i / n;
        points.push(
            [-w / 2 + w * t, cy - h / 2],
            [w / 2, cy - h / 2 + h * t],
            [w / 2 - w * t, cy + h / 2],
            [-w / 2, cy + h / 2 - h * t]
        );
    }
    return points;
}

/** Spheres of `radius` at `points` at height `z`, as one instanced mesh. */
function studs(THREE, points, radius, z, material) {
    const mesh = new THREE.InstancedMesh(
        new THREE.SphereGeometry(radius, 8, 6),
        material,
        points.length
    );
    const at = new THREE.Matrix4();
    points.forEach(([x, y], i) => {
        mesh.setMatrixAt(i, at.makeTranslation(x, y, z));
    });
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
}

/**
 * Frame style `name` round a `w` × `h` picture, as a Group (see the top of
 * this file), or null if there's no such style.
 */
export function pictureFrame(THREE, name, w, h) {
    const style = PICTURE_FRAMES[name];
    if (!style) return null;
    const { border, depth, bevel, lip } = style;
    const cy = h / 2;
    const group = new THREE.Group();
    const add = (mesh) => {
        mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
    };
    const gilt = new THREE.MeshStandardMaterial(style.finish);

    // The moulding, past the lip, and the lip round the picture.
    add(
        new THREE.Mesh(
            ring(
                THREE,
                w + lip.width * 2,
                h + lip.width * 2,
                cy,
                border - lip.width,
                depth,
                bevel
            ),
            gilt
        )
    );
    const lipFinish = new THREE.MeshStandardMaterial(lip.finish);
    add(
        new THREE.Mesh(
            ring(THREE, w, h, cy, lip.width, depth * 0.6, 1),
            lipFinish
        )
    );
    if (lip.beads) {
        add(
            studs(
                THREE,
                edgePoints(w + lip.width, h + lip.width, cy, lip.beads),
                lip.width * 0.45,
                depth * 0.6,
                lipFinish
            )
        );
    }
    if (style.rosettes) {
        const inset = border / 2;
        add(
            studs(
                THREE,
                [-1, 1].flatMap((sx) =>
                    [-1, 1].map((sy) => [
                        sx * (w / 2 + inset),
                        cy + sy * (h / 2 + inset),
                    ])
                ),
                style.rosettes,
                depth,
                gilt
            )
        );
    }
    return group;
}
