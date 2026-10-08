import { createCastKit } from "@/Components/Games/Cast/three/castMesh.js";
import { playAmbientSound } from "../sounds.js";

// Pixel ratio cap: past 2 a phone pays four times the fill for detail nobody
// can see (issue #130's performance budget).
const MAX_PIXEL_RATIO = 2;
const MAX_DT = 0.05; // s; a long frame (or a resume) can't teleport anything

let threeModule = null;

/** `three`, loaded on first use. Only the Games World imports it, and only
 * through here, so no other page pays for it. */
export function loadThree() {
    if (!threeModule) {
        threeModule = import("three").catch((error) => {
            // Not remembered: the next visit tries the download again.
            threeModule = null;
            throw error;
        });
    }
    return threeModule;
}

/** Whether this browser can make the WebGL2 context Three.js needs. The test
 * context is given straight back, since browsers cap how many a page holds. */
export function supportsWebGL() {
    if (typeof window === "undefined" || !window.WebGL2RenderingContext) {
        return false;
    }
    try {
        const gl = document.createElement("canvas").getContext("webgl2");
        gl?.getExtension("WEBGL_lose_context")?.loseContext();
        return Boolean(gl);
    } catch {
        return false;
    }
}

/**
 * Points a Three.js PerspectiveCamera the way a projection.js camera
 * describes: level, at its position, with the lens shifted so its eye height
 * is drawn at `eyeRow` (and its centre `lensX` px off the middle). The
 * shift is a view offset into a larger frame centred on the camera's axis, so
 * projection.js's maths and Three's agree.
 */
export function applyCamera(threeCamera, camera) {
    const { w, h, eyeRow, focal } = camera;
    const axisX = w / 2 + (camera.lensX ?? 0);
    const halfW = Math.max(axisX, w - axisX);
    const halfH = Math.max(eyeRow, h - eyeRow);
    threeCamera.fov = (2 * Math.atan(halfH / focal) * 180) / Math.PI;
    threeCamera.aspect = halfW / halfH;
    threeCamera.setViewOffset(
        halfW * 2,
        halfH * 2,
        halfW - axisX,
        halfH - eyeRow,
        w,
        h
    );
    threeCamera.position.set(camera.x, camera.y, camera.z);
    threeCamera.rotation.set(0, 0, 0);
    threeCamera.updateProjectionMatrix();
}

/** A w × h canvas drawn by `draw(ctx)` (skipped where there is no 2D
 * context, as in tests), as an sRGB texture. */
export function canvasTexture(THREE, w, h, draw) {
    const el = document.createElement("canvas");
    el.width = w;
    el.height = h;
    const ctx = el.getContext("2d");
    if (ctx) draw(ctx);
    const texture = new THREE.CanvasTexture(el);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

/** Frees every geometry, material and texture under `root`, except the
 * materials in `keep`. Keep shared ones (the cast kit's) out of it. */
export function disposeTree(root, keep = []) {
    root.traverse((object) => {
        object.geometry?.dispose();
        for (const material of [object.material ?? []].flat()) {
            if (keep.includes(material)) continue;
            material.map?.dispose();
            material.dispose();
        }
    });
}

/**
 * The Games World's one WebGL renderer (issue #130), owned by the stage. It
 * draws whichever scene graph the current scene shows, only on frames where
 * something changed, at a capped pixel ratio, and stops while the page is
 * hidden.
 *
 * Scenes hook the frame loop with onFrame(fn): fn(dt) runs every frame and
 * returns whether it changed anything visible. invalidate() asks for one
 * draw. `three` and `kit` (the cast kit, see castMesh.js) are ready once
 * init() resolves true.
 */
export function useWorldRenderer() {
    let renderer = null;
    let view = null;
    let rafId = null;
    let lastFrame = 0;
    let paused = false;
    let dirty = true;
    const hooks = new Set();

    const handle = {
        three: null,
        kit: null,

        /** Loads three and makes the renderer on `canvas`. False if either
         * fails, and the stage falls back to the DOM. */
        async init(canvas) {
            let THREE;
            try {
                THREE = await loadThree();
                renderer = new THREE.WebGLRenderer({
                    canvas,
                    antialias: true,
                    powerPreference: "default",
                });
            } catch {
                return false;
            }
            renderer.setPixelRatio(
                Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)
            );
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFShadowMap;
            handle.three = THREE;
            // A cast member's move makes its sound (CAST's `sounds`)
            // wherever it's played.
            handle.kit = createCastKit(THREE, { onSound: playAmbientSound });
            // Hidden while three loaded: resume() starts it.
            if (!paused) start();
            return true;
        },

        /** The canvas's size in CSS px; it fills the stage. */
        setSize(w, h) {
            if (!renderer || !w || !h) return;
            renderer.setSize(w, h, false);
            dirty = true;
        },

        /** What to draw: a scene and its camera, or null for nothing. */
        show(scene, camera) {
            view = scene ? { scene, camera } : null;
            dirty = true;
        },

        onFrame(fn) {
            hooks.add(fn);
            return () => hooks.delete(fn);
        },

        invalidate() {
            dirty = true;
        },

        pause() {
            paused = true;
            stop();
        },

        resume() {
            if (!paused) return;
            paused = false;
            start();
        },

        dispose() {
            stop();
            hooks.clear();
            view = null;
            handle.kit?.dispose();
            handle.kit = null;
            renderer?.dispose();
            // Hand the context back now: Inertia keeps the tab alive across
            // visits, and browsers cap live contexts per page.
            renderer?.forceContextLoss();
            renderer = null;
        },
    };

    function frame(now) {
        rafId = requestAnimationFrame(frame);
        const dt = lastFrame ? Math.min(MAX_DT, (now - lastFrame) / 1000) : 0;
        lastFrame = now;

        let changed = dirty;
        dirty = false;
        // Every hook runs, even after one reports a change.
        for (const hook of hooks) changed = hook(dt) || changed;
        if (changed && view) renderer.render(view.scene, view.camera);
    }

    function start() {
        if (rafId !== null || !renderer) return;
        // A fresh clock, so a resume can't land one giant dt.
        lastFrame = 0;
        dirty = true;
        rafId = requestAnimationFrame(frame);
    }

    function stop() {
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = null;
    }

    return handle;
}
