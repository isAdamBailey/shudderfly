// Little cockroaches on a room's back wall, the same picture and crawl as
// the site header and footer (CockroachCrawl.vue). `top` is down from the
// ceiling, `size` is the picture's width in world units, `delay` is how
// far along the crawl already is.

const IMAGE = "/img/cockroach.png";
const ASPECT = 200 / 372;

export const WALL_CRAWLERS = [
    { top: 0.14, size: 52, duration: 22, delay: 5 },
    { top: 0.28, size: 36, duration: 18, delay: 14, reverse: true },
    { top: 0.48, size: 44, duration: 25, delay: 9 },
    { top: 0.64, size: 34, duration: 20, delay: 2, reverse: true },
    { top: 0.78, size: 42, duration: 24, delay: 19 },
    { top: 0.38, size: 30, duration: 17, delay: 11, reverse: true },
];

const SLOW = 60;

/** Where crawler `c` is on a `width` × `height` wall at `time` seconds. */
export function crawlerAt(c, width, height, time, reduced = false) {
    const duration = reduced ? SLOW : c.duration;
    const u =
        (((time + c.delay) % duration) + duration) % duration / duration;
    const along = c.reverse ? 1 - u : u;
    const x = -c.size + along * (width + c.size * 2);
    const wobble = reduced ? 0 : Math.sin((time / 0.45) * Math.PI);
    return {
        x,
        y: (1 - c.top) * height + wobble,
        tilt: wobble * ((5 * Math.PI) / 180),
    };
}

/** The crawling pictures for a room that asks for them. Unlit, so they
 * stay as bright as the header's in a dark room. */
export function createWallCrawlers(THREE, width, height) {
    const texture = new THREE.TextureLoader().load(IMAGE);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.05,
        opacity: 0.78,
        depthWrite: true,
    });
    const group = new THREE.Group();
    group.name = "wall-crawlers";
    const meshes = WALL_CRAWLERS.map((c) => {
        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(c.size, c.size * ASPECT),
            material
        );
        mesh.name = "wall-crawler";
        mesh.position.z = 4;
        if (c.reverse) mesh.scale.x = -1;
        group.add(mesh);
        return mesh;
    });

    let time = 0;
    pose(false);

    function pose(reduced) {
        WALL_CRAWLERS.forEach((c, i) => {
            const at = crawlerAt(c, width, height, time, reduced);
            meshes[i].position.x = at.x;
            meshes[i].position.y = at.y;
            meshes[i].rotation.z = at.tilt;
        });
    }

    return {
        group,
        tick(dt, reduced) {
            if (!(dt > 0)) return false;
            time += dt;
            pose(reduced);
            return true;
        },
        dispose() {
            group.removeFromParent();
            material.map?.dispose();
            material.dispose();
            for (const mesh of meshes) mesh.geometry.dispose();
        },
    };
}
