<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ config('app.name') }} - Maintenance Mode</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Spicy+Rice&display=swap" rel="stylesheet">
    <style>
        :root {
            --stage-night: #111827;
            --backstage: #1f2937;
            --amber: #fbbf24;
            --amber-bulb: #f59e0b;
            --teal: #0f766e;
            --curtain: #c2410c;
            --mist: #f3f4f6;
            --z-stage: 0;
            --z-panel: 10;
            --z-cast: 20;
            --z-fx: 30;
            --z-bar: 40;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        html, body {
            height: 100%;
        }

        body {
            font-family: 'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--stage-night);
            background-image:
                radial-gradient(at 50% 18%, rgba(251, 191, 36, 0.18) 0, transparent 55%),
                radial-gradient(at 18% 85%, rgba(15, 118, 110, 0.16) 0, transparent 50%),
                radial-gradient(at 85% 75%, rgba(194, 65, 11, 0.14) 0, transparent 50%);
            min-height: 100vh;
            color: white;
            overflow: hidden;
            overscroll-behavior: none;
            -webkit-user-select: none;
            user-select: none;
            touch-action: none;
        }

        .rainbow-bar {
            position: fixed;
            left: 0;
            right: 0;
            height: 6px;
            z-index: var(--z-bar);
            background: linear-gradient(
                90deg,
                #ef4444, #f97316, #fbbf24, #22c55e, #3b82f6, #a855f7
            );
            background-size: 200% 100%;
            animation: barShift 14s linear infinite;
            box-shadow: 0 0 18px rgba(251, 191, 36, 0.35);
        }
        .rainbow-bar.top { top: 0; }
        .rainbow-bar.bottom { bottom: 0; }

        @keyframes barShift {
            to { background-position: 200% 0; }
        }

        /* The cast layer sits over the whole stage; only the characters themselves
           catch pointer events, so the panel underneath stays interactive. */
        .stage {
            position: fixed;
            inset: 0;
            z-index: var(--z-cast);
            pointer-events: none;
            overflow: hidden;
        }

        .cast {
            position: absolute;
            top: 0;
            left: 0;
            font-size: var(--size, 56px);
            line-height: 1;
            will-change: transform;
            cursor: grab;
            pointer-events: auto;
            filter: drop-shadow(2px 5px 6px rgba(0, 0, 0, 0.55));
            transform: translate(-50%, -50%);
            transition: filter 0.2s ease-out;
            -webkit-tap-highlight-color: transparent;
        }
        .cast .glyph {
            display: block;
            will-change: transform;
        }
        .cast.idle .glyph {
            animation: sway var(--sway, 3.2s) ease-in-out infinite alternate;
        }
        .cast.dragging {
            cursor: grabbing;
            z-index: 5;
            filter: drop-shadow(0 12px 18px rgba(0, 0, 0, 0.6))
                    drop-shadow(0 0 14px rgba(251, 191, 36, 0.5));
        }
        .cast.dragging .glyph {
            animation: none;
            transform: scale(1.18) rotate(-4deg);
        }
        .cast.is-butt.squashing .glyph {
            animation: squash 0.42s cubic-bezier(0.22, 1, 0.36, 1);
        }

        @keyframes sway {
            from { transform: rotate(calc(var(--swayDeg, 5deg) * -1)); }
            to   { transform: rotate(var(--swayDeg, 5deg)); }
        }
        @keyframes squash {
            0%   { transform: scale(1, 1); }
            35%  { transform: scale(1.32, 0.72); }
            70%  { transform: scale(0.9, 1.12); }
            100% { transform: scale(1, 1); }
        }

        .fx {
            position: fixed;
            inset: 0;
            z-index: var(--z-fx);
            pointer-events: none;
            overflow: hidden;
        }
        .puff {
            position: absolute;
            font-size: 40px;
            transform: translate(-50%, -50%);
            animation: puff 0.72s ease-out forwards;
        }
        @keyframes puff {
            0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
            25%  { opacity: 1; }
            100% { opacity: 0; transform: translate(-50%, -160%) scale(1.5) rotate(12deg); }
        }
        .pop {
            position: absolute;
            font-family: 'Spicy Rice', cursive;
            font-weight: 400;
            color: var(--amber);
            text-shadow: 0 2px 6px rgba(0, 0, 0, 0.7);
            transform: translate(-50%, -50%);
            white-space: nowrap;
            animation: popUp 0.78s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes popUp {
            0%   { opacity: 0; transform: translate(-50%, -40%) scale(0.6); }
            20%  { opacity: 1; }
            100% { opacity: 0; transform: translate(-50%, -260%) scale(1.05); }
        }

        .container {
            position: relative;
            z-index: var(--z-panel);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
        }

        .panel {
            text-align: center;
            max-width: 560px;
            width: 100%;
            background: rgba(17, 24, 39, 0.62);
            backdrop-filter: blur(18px);
            -webkit-backdrop-filter: blur(18px);
            border-radius: 20px;
            padding: 2.75rem 2rem 2.25rem;
            box-shadow:
                0 18px 50px rgba(0, 0, 0, 0.5),
                0 0 0 1px rgba(251, 191, 36, 0.18);
            border: 1px solid rgba(255, 255, 255, 0.08);
            position: relative;
            pointer-events: auto;
        }

        .eyebrow {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.04em;
            color: var(--amber);
            margin-bottom: 14px;
        }
        .bulbs {
            display: inline-flex;
            gap: 5px;
        }
        .bulbs i {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--amber);
            display: block;
            animation: bulb 1.2s ease-in-out infinite;
            box-shadow: 0 0 8px rgba(251, 191, 36, 0.7);
        }
        .bulbs i:nth-child(2) { animation-delay: 0.2s; }
        .bulbs i:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bulb {
            0%, 100% { opacity: 0.25; transform: scale(0.8); }
            50%      { opacity: 1; transform: scale(1); }
        }

        h1 {
            font-family: 'Spicy Rice', cursive;
            font-size: clamp(2rem, 7vw, 3.25rem);
            font-weight: 400;
            line-height: 1.1;
            letter-spacing: 0.01em;
            color: var(--amber);
            text-shadow: 0 3px 0 rgba(0, 0, 0, 0.35), 0 0 24px rgba(251, 191, 36, 0.25);
            text-wrap: balance;
        }

        .lead {
            font-size: clamp(1rem, 2.6vw, 1.15rem);
            line-height: 1.6;
            color: rgba(243, 244, 246, 0.92);
            margin-top: 14px;
        }
        .controls {
            margin-top: 18px;
        }
        .speak-btn {
            display: inline-flex;
            align-items: center;
            gap: 9px;
            font-family: 'Nunito', sans-serif;
            font-weight: 700;
            font-size: clamp(0.9rem, 2.4vw, 1rem);
            color: var(--mist);
            background: rgba(255, 255, 255, 0.1);
            border: 2px solid rgba(255, 255, 255, 0.22);
            border-radius: 9999px;
            padding: 11px 20px;
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
            transition: transform 0.15s ease-out, color 0.2s ease-out,
                        border-color 0.2s ease-out, background-color 0.2s ease-out;
        }
        .speak-btn:hover {
            background: rgba(255, 255, 255, 0.16);
        }
        .speak-btn:active {
            transform: scale(0.95);
        }
        .speak-btn:focus-visible {
            outline: none;
            border-color: var(--amber);
            box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.35);
        }
        .speak-btn.speaking {
            color: var(--amber);
            border-color: var(--amber);
            background: rgba(251, 191, 36, 0.14);
        }
        .speak-icon {
            font-size: 1.15em;
            line-height: 1;
        }

        .scoreboard {
            margin-top: 18px;
            font-size: 0.95rem;
            color: rgba(243, 244, 246, 0.7);
            font-weight: 600;
            min-height: 1.4em;
        }
        .scoreboard b {
            font-family: 'Spicy Rice', cursive;
            font-weight: 400;
            color: var(--amber);
            font-size: 1.25em;
            padding: 0 2px;
        }

        @media (max-width: 600px) {
            .panel {
                padding: 2.25rem 1.4rem 2rem;
                border-radius: 16px;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            .rainbow-bar,
            .bulbs i,
            .cast.idle .glyph,
            .cast.is-butt.squashing .glyph {
                animation: none !important;
            }
            .puff, .pop {
                animation-duration: 0.01ms !important;
            }
        }
    </style>
</head>
<body>
    <div class="rainbow-bar top"></div>

    <div class="stage" id="stage" aria-hidden="true"></div>
    <div class="fx" id="fx" aria-hidden="true"></div>

    <div class="container">
        <div class="panel">
            <span class="eyebrow">
                <span class="bulbs"><i></i><i></i><i></i></span>
                The marquee is between shows
            </span>
            <h1>We&rsquo;ll be right back!</h1>
            <p class="lead">We&rsquo;re away setting a toot trap.</p>

            <div class="controls">
                <button type="button" id="speakBtn" class="speak-btn" hidden
                        aria-label="Read this page aloud">
                    <span class="speak-icon" aria-hidden="true">🔊</span>
                    <span class="speak-label">Read this to me</span>
                </button>
            </div>

            <p class="scoreboard" id="scoreboard">Toots served while you wait: <b id="score">0</b></p>
        </div>
    </div>

    <div class="rainbow-bar bottom"></div>

    <script>
        (function () {
            const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const stage = document.getElementById('stage');
            const fx = document.getElementById('fx');
            const scoreEl = document.getElementById('score');

            // Characters mirror resources/js/constants/characters.js (inline here; can't import modules in a standalone blade template).
            const SNACKS = ['🫐', '🍇', '🍓', '🍎', '🥦'];
            const CAST = [
                { emoji: '🍑', role: 'butt', size: 1.6, speed: 0.85 },
                { emoji: '🪳', role: 'prop', size: 1.05, speed: 0.7 },
                { emoji: '🍕', role: 'prop', size: 1.1, speed: 0.45 },
                { emoji: '💩', role: 'prop', size: 1.0, speed: 0.5 },
                { emoji: '🚽', role: 'prop', size: 1.15, speed: 0.35 },
                ...SNACKS.map((emoji) => ({ emoji, role: 'food', size: 0.95, speed: 0.4 })),
            ];

            const BASE = 56;
            let vw = window.innerWidth;
            let vh = window.innerHeight;
            let score = 0;
            const actors = [];

            function rand(min, max) {
                return min + Math.random() * (max - min);
            }

            function measure() {
                vw = window.innerWidth;
                vh = window.innerHeight;
            }

            // Distance from the nearest edge, skewed so the cast hugs the rim of the
            // stage (power > 1 pulls toward 0 = the edge) and drifts around the panel
            // rather than parking on the message, then mirrored to either side.
            function edgeBiased(span, margin, power) {
                const half = span / 2;
                const dist = margin + Math.pow(Math.random(), power) * (half - margin);
                return Math.random() < 0.5 ? dist : span - dist;
            }
            function randomTarget(size) {
                const margin = size * 0.7 + 18;
                return {
                    x: edgeBiased(vw, margin, 1.6),
                    y: edgeBiased(vh, margin + 12, 2.4),
                };
            }

            function makeActor(def, index) {
                const el = document.createElement('div');
                el.className = 'cast' + (def.role === 'butt' ? ' is-butt' : '');
                if (!reduceMotion) el.classList.add('idle');
                el.style.setProperty('--size', (BASE * def.size) + 'px');
                el.style.setProperty('--sway', rand(2.6, 4.2).toFixed(2) + 's');
                el.style.setProperty('--swayDeg', rand(3, 8).toFixed(1) + 'deg');

                const glyph = document.createElement('span');
                glyph.className = 'glyph';
                glyph.textContent = def.emoji;
                el.appendChild(glyph);
                stage.appendChild(el);

                const size = BASE * def.size;
                // Fan the cast out around the stage edges so they never start stacked.
                const angle = (index / CAST.length) * Math.PI * 2 - Math.PI / 2;
                const rx = vw / 2 + Math.cos(angle) * (vw * 0.42);
                const ry = vh / 2 + Math.sin(angle) * (vh * 0.4);
                const actor = {
                    el, glyph, def, size,
                    x: clamp(rx, size, vw - size),
                    y: clamp(ry, size, vh - size),
                    target: randomTarget(size),
                    dragging: false,
                    grabDx: 0, grabDy: 0,
                };
                place(actor);
                attachDrag(actor);
                actors.push(actor);
            }

            function place(a) {
                a.el.style.transform = 'translate(' + (a.x - a.size / 2) + 'px,' + (a.y - a.size / 2) + 'px)';
            }

            const butt = () => actors.find((a) => a.def.role === 'butt');

            function attachDrag(a) {
                a.el.addEventListener('pointerdown', (e) => {
                    e.preventDefault();
                    a.dragging = true;
                    a.el.classList.add('dragging');
                    a.el.classList.remove('idle');
                    a.grabDx = a.x - e.clientX;
                    a.grabDy = a.y - e.clientY;
                    try { a.el.setPointerCapture(e.pointerId); } catch (_) {}
                });

                a.el.addEventListener('pointermove', (e) => {
                    if (!a.dragging) return;
                    a.x = clamp(e.clientX + a.grabDx, 0, vw);
                    a.y = clamp(e.clientY + a.grabDy, 0, vh);
                    place(a);
                });

                const release = () => {
                    if (!a.dragging) return;
                    a.dragging = false;
                    a.el.classList.remove('dragging');
                    if (!reduceMotion) a.el.classList.add('idle');
                    if (a.def.role === 'food') tryToot(a);
                    a.target = randomTarget(a.size);
                };
                a.el.addEventListener('pointerup', release);
                a.el.addEventListener('pointercancel', release);
            }

            function clamp(v, lo, hi) {
                return v < lo ? lo : v > hi ? hi : v;
            }

            function tryToot(food) {
                const b = butt();
                if (!b) return;
                const hitRadius = b.size * 0.62;
                if (Math.hypot(food.x - b.x, food.y - b.y) > hitRadius) return;

                score += 1;
                scoreEl.textContent = score;
                if (navigator.vibrate) navigator.vibrate(30);

                b.el.classList.remove('squashing');
                void b.el.offsetWidth; // restart squash animation
                b.el.classList.add('squashing');

                spawnPuff(b.x, b.y);
                spawnPop(b.x, b.y - b.size * 0.6, '+1 toot');
                playToot(food.def.emoji);

                // The snack teleports off to a fresh spot, like a respawn.
                food.x = randomTarget(food.size).x;
                food.y = randomTarget(food.size).y;
                food.target = randomTarget(food.size);
                place(food);
            }

            function spawnPuff(x, y) {
                const p = document.createElement('div');
                p.className = 'puff';
                p.textContent = '💨';
                p.style.left = x + 'px';
                p.style.top = y + 'px';
                fx.appendChild(p);
                setTimeout(() => p.remove(), 760);
            }

            function spawnPop(x, y, text) {
                const p = document.createElement('div');
                p.className = 'pop';
                p.style.fontSize = 'clamp(1.1rem, 4vw, 1.6rem)';
                p.style.left = x + 'px';
                p.style.top = y + 'px';
                p.textContent = text;
                fx.appendChild(p);
                setTimeout(() => p.remove(), 820);
            }

            // A short, silly descending "toot" via WebAudio — no asset needed.
            let audioCtx = null;
            function playToot(emoji) {
                try {
                    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
                    if (audioCtx.state === 'suspended') audioCtx.resume();
                    const pitchMap = { '🫐': 1.4, '🍇': 1.22, '🍓': 1.1, '🍎': 0.92, '🥦': 0.78 };
                    const base = 150 * (pitchMap[emoji] || 1);
                    const t = audioCtx.currentTime;
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(base, t);
                    osc.frequency.exponentialRampToValueAtTime(base * 0.5, t + 0.22);
                    gain.gain.setValueAtTime(0.0001, t);
                    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.03);
                    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
                    osc.connect(gain).connect(audioCtx.destination);
                    osc.start(t);
                    osc.stop(t + 0.28);
                } catch (_) {}
            }

            // Wander loop — eases each idle actor toward its target, then repicks.
            let last = 0;
            function frame(now) {
                if (!last) last = now;
                const dt = Math.min(0.05, (now - last) / 1000);
                last = now;

                for (const a of actors) {
                    if (a.dragging) continue;
                    const dx = a.target.x - a.x;
                    const dy = a.target.y - a.y;
                    const dist = Math.hypot(dx, dy);
                    const step = (40 + a.def.speed * 70) * dt;
                    if (dist <= step || dist < 4) {
                        a.x = a.target.x;
                        a.y = a.target.y;
                        a.target = randomTarget(a.size);
                    } else {
                        a.x += (dx / dist) * step;
                        a.y += (dy / dist) * step;
                    }
                    place(a);
                }
                requestAnimationFrame(frame);
            }

            measure();
            CAST.forEach(makeActor);

            window.addEventListener('resize', () => {
                measure();
                for (const a of actors) {
                    a.x = clamp(a.x, a.size / 2, vw - a.size / 2);
                    a.y = clamp(a.y, a.size / 2, vh - a.size / 2);
                    place(a);
                }
            });

            if (!reduceMotion) {
                requestAnimationFrame(frame);
            }
        })();

        // Read-aloud — browser-native speech, no app bundle required, so it works
        // even while the app is mid-deploy and assets aren't built yet.
        (function () {
            const synth = window.speechSynthesis;
            const btn = document.getElementById('speakBtn');
            if (!btn || !synth || typeof SpeechSynthesisUtterance === 'undefined') return;

            const labelEl = btn.querySelector('.speak-label');
            const iconEl = btn.querySelector('.speak-icon');
            btn.hidden = false;

            let speaking = false;

            function spokenText() {
                const parts = [
                    document.querySelector('h1'),
                    document.querySelector('.lead'),
                ];
                return parts
                    .filter(Boolean)
                    .map((el) => el.textContent.replace(/\s+/g, ' ').trim())
                    .join('. ');
            }

            function pickVoice() {
                const voices = synth.getVoices();
                return voices.find((v) => /^en/i.test(v.lang)) || voices[0] || null;
            }

            function setSpeaking(on) {
                speaking = on;
                btn.classList.toggle('speaking', on);
                labelEl.textContent = on ? 'Stop' : 'Read this to me';
                iconEl.textContent = on ? '⏹' : '🔊';
                btn.setAttribute('aria-label', on ? 'Stop reading' : 'Read this page aloud');
            }

            function stop() {
                synth.cancel();
                setSpeaking(false);
            }

            function start() {
                synth.cancel();
                const u = new SpeechSynthesisUtterance(spokenText());
                u.rate = 0.95;
                u.pitch = 1.0;
                u.volume = 1.0;
                const voice = pickVoice();
                if (voice) {
                    u.voice = voice;
                    u.lang = voice.lang;
                }
                u.onend = () => setSpeaking(false);
                u.onerror = () => setSpeaking(false);
                setSpeaking(true);
                synth.speak(u);
            }

            btn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                speaking ? stop() : start();
            });

            // Voices can load asynchronously; this primes the list on some browsers.
            if (typeof synth.onvoiceschanged !== 'undefined') {
                synth.onvoiceschanged = () => synth.getVoices();
            }
            window.addEventListener('pagehide', stop);
        })();
    </script>
</body>
</html>
