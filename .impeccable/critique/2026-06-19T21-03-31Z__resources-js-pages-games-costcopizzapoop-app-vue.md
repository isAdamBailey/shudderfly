---
target: costco pizza poop
total_score: 30
p0_count: 0
p1_count: 3
timestamp: 2026-06-19T21-03-31Z
slug: resources-js-pages-games-costcopizzapoop-app-vue
---
# Critique: Costco Pizza Poop

Three-phase mini-game: start modal -> drag pizza slices into a CSS face -> steer the poop down an SVG intestine -> win screen. Reviewed App.vue, GameBoard.vue, useGameState.js, GameStartScreen/GameEndScreen.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Pizza phase shows only "Slices left"; no cue what to do mid-play |
| 2 | Match System / Real World | 4 | Eat -> digest -> poop is a perfect metaphor; emojis read instantly |
| 3 | User Control and Freedom | 2 | No pause, restart, or exit during either gameplay phase |
| 4 | Consistency and Standards | 3 | Two in-game HUDs styled differently |
| 5 | Error Prevention | 4 | Can't fail; slices snap back when dropped outside the mouth |
| 6 | Recognition Rather Than Recall | 2 | Instructions only on start screen; steering has no in-game hint |
| 7 | Flexibility and Efficiency | 2 | Intestine has keyboard; pizza doesn't; 2.6s cutscene unskippable |
| 8 | Aesthetic and Minimalist Design | 4 | Clean, focused, every element earns its place |
| 9 | Error Recovery | 3 | Graceful snap-back; no messaging if audio init fails |
| 10 | Help and Documentation | 3 | Start screen + read-aloud speech button is great for kids |
| **Total** | | **30/40** | **Good** |

## Anti-Patterns Verdict

Not AI slop - the opposite. Hand-drawn CSS face with chewing keyframe, bespoke SVG intestine with mucosa gradient, custom digestion cutscene, emoji as deliberate sprite art. No card grids, eyebrows, gradient text, or generic chrome. Passes first- and second-order category-reflex checks.

Deterministic scan: 1 finding - `transition: width` on `.progress-fill` (GameBoard.vue:502). Low impact (tiny bar). P3.

Visual overlays: not available - no browser automation in this environment. Source-based + CLI detector only.

## Overall Impression

Confident, charming, genuinely fun; nails "play without spectacle." Framing modals use brand tokens; gameplay environments deliberately go diegetic (defensible). Biggest opportunity: accessibility-and-discoverability parity - built for one input (touch-drag) and one memory model (read the start screen once).

## What's Working

1. The metaphor + peak moment (digest cutscene + fart/victory audio on win) = strong peak-end payoff.
2. No-fail design: only accumulate "hits," never lose; slices snap back. Right for mixed-age family.
3. Read-aloud start instructions (GameStartSpeechButton) - standout inclusion for pre-readers.

## Priority Issues

- [P1] Gameplay animations ignore prefers-reduced-motion. mouthChew loop, .slice scale, digestSliceA/B/C + digestPoopDrop have no reduced-motion fallback. Modals handle it; gameplay doesn't. Violates DESIGN.md + PRODUCT.md. Fix: add @media (prefers-reduced-motion: reduce) stopping the chew loop and converting the cutscene to crossfade/instant. Command: /impeccable animate
- [P1] Pizza-feeding phase is touch-only - no keyboard/AT path. Slices are bare emoji divs: not focusable, no role/label, pointer-only. Intestine supports arrows/WASD; phase 1 is the lone wall. Sam can't start. Fix: focusable buttons with Enter/Space to feed focused slice + aria-labels. Command: /impeccable harden
- [P1] Steering has no in-game cue. After the 2.6s cutscene, controls silently activate with no hint. Recognition-over-recall failure. Fix: brief auto-fading "Drag to steer" hint when control unlocks; same for pizza phase. Command: /impeccable onboard
- [P2] No exit/pause/restart during gameplay. Only escape is browser back. Interrupted kid is trapped. Fix: small persistent back/restart control in the in-game HUD. Command: /impeccable harden
- [P3] transition: width on progress bar (detector). Use transform: scaleX() on a full-width track. Command: /impeccable optimize

## Persona Red Flags

Casey (mobile, primary): HUD + only exit sit at top, out of thumb zone. No state persistence; interruption loses the run. Touch targets generous (good).
Jordan (first-timer): no in-game goal/control reminder after start screen; "Hits" not labeled good/bad.
Sam (a11y): blocked at phase 1 (no keyboard to eat); continuous chew animation, no reduced-motion escape; game state not announced via live regions.

## Minor Observations

- Poop only moves down; an upward drag does nothing - can read as broken controls without a hint.
- Label drift: "Hits" (in-game) vs "Wall hits" (win screen).
- No messaging if initAudio() fails (plays silently; acceptable but should be a conscious decision).

## Questions to Consider

- Steering hint as a poop "follow-me" wiggle instead of text?
- Reframe "Hits" as a positive ("Clean run!") so kids aren't optimizing a number they don't understand?
- Tap-to-skip on the digest cutscene for replay-heavy kids?
