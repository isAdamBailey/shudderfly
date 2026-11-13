import { jitter } from "@/utils/math";
import { canvasTexture } from "../three/useWorldRenderer.js";

// Pixie dust swirling round Guster's can (streetGeometry.js beanCan()), as
// in the video he was born in: a burst of light behind the can, turning
// slowly, and specks of every colour drifting round it. Two kinds: crisp
// four-pointed `sparkles` and big soft `bokeh` glows. Each rises from the
// can's foot past its lid in about `period` s (some quicker, some slower)
// while it circles the can `turns` times, between `reach` radii from its
// middle, fanning out by `fan` as it goes up; each twinkles at its own pace
// within `twinkle` rad/s, and fades in at the foot and out at the top. A
// speck is `size` radii across.
export const PIXIE_DUST = {
    period: 9,
    turns: 1.5,
    reach: [1.08, 1.6],
    fan: 0.35,
    rise: 1.15, // how high it goes, in shares of the can's own height
    twinkle: [2, 5],
    sparkles: { count: 170, size: 0.2 },
    bokeh: { count: 70, size: 0.75 },
    // The burst behind: `size` radii across, turning `spin` rad/s, as
    // bright as `glow` at its heart.
    burst: { size: 4.2, spin: 0.08, glow: 0.75 },
};

/** A white four-pointed sparkle with a soft glow round it. */
function sparkleTexture(THREE) {
    return canvasTexture(THREE, 64, 64, (ctx) => {
        const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        glow.addColorStop(0, "rgba(255,255,255,1)");
        glow.addColorStop(0.25, "rgba(255,255,255,0.5)");
        glow.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        for (let i = 0; i < 8; i += 1) {
            const a = (i * Math.PI) / 4;
            const d = i % 2 === 0 ? 31 : 4;
            ctx[i ? "lineTo" : "moveTo"](
                32 + Math.sin(a) * d,
                32 - Math.cos(a) * d
            );
        }
        ctx.closePath();
        ctx.fill();
    });
}

/** A soft round glow, out of focus. */
function bokehTexture(THREE) {
    return canvasTexture(THREE, 64, 64, (ctx) => {
        const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        glow.addColorStop(0, "rgba(255,255,255,0.9)");
        glow.addColorStop(0.45, "rgba(255,255,255,0.45)");
        glow.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, 64, 64);
    });
}

/** Rays bursting out from the middle in the dust's colours, round a warm
 * white heart, fading to nothing at the edge. */
function burstTexture(THREE, colors) {
    return canvasTexture(THREE, 512, 512, (ctx) => {
        const rays = 28;
        for (let i = 0; i < rays; i += 1) {
            const a = (i / rays) * Math.PI * 2 + jitter(i + 0.4) * 0.15;
            const wide = 0.04 + jitter(i + 0.8) * 0.07;
            const long = 0.6 + jitter(i + 0.2) * 0.4;
            const ray = ctx.createRadialGradient(
                256,
                256,
                0,
                256,
                256,
                256 * long
            );
            ray.addColorStop(0, colors[i % colors.length]);
            // Fading to the same colour, clear, not through grey: the
            // burst is drawn over the sky, not added to it.
            ray.addColorStop(1, `${colors[i % colors.length]}00`);
            ctx.fillStyle = ray;
            ctx.beginPath();
            ctx.moveTo(256, 256);
            ctx.arc(256, 256, 256 * long, a - wide, a + wide);
            ctx.closePath();
            ctx.fill();
        }
        const heart = ctx.createRadialGradient(256, 256, 0, 256, 256, 200);
        heart.addColorStop(0, "rgba(255,250,220,0.9)");
        heart.addColorStop(0.4, "rgba(255,240,200,0.35)");
        heart.addColorStop(1, "rgba(255,240,200,0)");
        ctx.fillStyle = heart;
        ctx.fillRect(0, 0, 512, 512);
    });
}

/**
 * The pixie dust round a can `radius` across its middle and `high` to the
 * top of its lid, standing as streetGeometry.js builds it (its axis at
 * z = -radius), in the look's `colors`. Returns a `group` to add to the
 * scene and `place(time)`, which poses it all at that many seconds in (the
 * road calls it each frame, and holds it still under reduced motion). It
 * shines on its own, day and night, in its own colours: drawn over what's
 * behind rather than added to it, which would wash it out to white against
 * a daylit sky.
 */
export function pixieDust(THREE, { radius, high, colors }) {
    const { lerp } = THREE.MathUtils;
    const spec = PIXIE_DUST;
    const hues = colors?.length ? colors : ["#ffffff"];
    const palette = hues.map((c) => new THREE.Color(c));
    const glowing = { transparent: true, depthWrite: false };
    const group = new THREE.Group();
    group.name = "pixie-dust";

    // The burst, behind the can, so it shines out round its sides and lid.
    const burst = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
            map: burstTexture(THREE, hues),
            opacity: spec.burst.glow,
            ...glowing,
        })
    );
    burst.name = "pixie-dust-burst";
    burst.scale.setScalar(radius * spec.burst.size);
    burst.position.set(0, high * 0.55, -radius * 2.2);
    group.add(burst);

    /** One layer of specks, `kind` (sparkles or bokeh) of PIXIE_DUST. */
    const layer = (kind, map, seed) => {
        const { count, size } = spec[kind];
        const specks = Array.from({ length: count }, (_, i) => {
            const n = seed + i;
            return {
                start: jitter(n + 0.13),
                angle: jitter(n + 0.29) * Math.PI * 2,
                reach: lerp(spec.reach[0], spec.reach[1], jitter(n + 0.47)),
                speed: lerp(0.7, 1.3, jitter(n + 0.61)),
                twinkle: lerp(
                    spec.twinkle[0],
                    spec.twinkle[1],
                    jitter(n + 0.79)
                ),
                phase: jitter(n + 0.97) * Math.PI * 2,
                color: palette[Math.floor(jitter(n + 0.53) * palette.length)],
            };
        });
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(new Float32Array(count * 3), 3)
        );
        // Each speck's colour, and how much of it shows (it fades and
        // twinkles by this, so its colour holds).
        geometry.setAttribute(
            "color",
            new THREE.BufferAttribute(new Float32Array(count * 4), 4)
        );
        const points = new THREE.Points(
            geometry,
            new THREE.PointsMaterial({
                size: radius * size * 2,
                map,
                vertexColors: true,
                ...glowing,
            })
        );
        points.name = `pixie-dust-${kind}`;
        // The specks move every frame; a fixed bound would only go stale.
        points.frustumCulled = false;
        group.add(points);
        return { specks, points };
    };
    const layers = [
        layer("bokeh", bokehTexture(THREE), 500),
        layer("sparkles", sparkleTexture(THREE), 0),
    ];

    const top = high * spec.rise;
    function place(time) {
        burst.rotation.z = time * spec.burst.spin;
        for (const { specks, points } of layers) {
            const position = points.geometry.attributes.position;
            const color = points.geometry.attributes.color;
            specks.forEach((s, i) => {
                const up = (s.start + (time * s.speed) / spec.period) % 1;
                const angle =
                    s.angle +
                    up * spec.turns * Math.PI * 2 +
                    time * 0.2 * s.speed;
                const out = radius * s.reach * (1 + spec.fan * up);
                position.setXYZ(
                    i,
                    Math.sin(angle) * out,
                    up * top,
                    -radius + Math.cos(angle) * out
                );
                // Faded in at the foot and out at the top, and twinkling.
                const glow =
                    Math.sqrt(Math.sin(up * Math.PI)) *
                    (0.7 + 0.3 * Math.sin(time * s.twinkle + s.phase));
                color.setXYZW(i, s.color.r, s.color.g, s.color.b, glow);
            });
            position.needsUpdate = true;
            color.needsUpdate = true;
        }
    }
    place(0);

    return { group, place };
}
