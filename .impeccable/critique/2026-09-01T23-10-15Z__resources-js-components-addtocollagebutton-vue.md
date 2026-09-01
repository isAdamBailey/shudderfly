---
target: resources/js/Components/AddToCollageButton.vue
total_score: 20
max_score: 36
na_heuristics: 10
p0_count: 1
p1_count: 2
timestamp: 2026-09-01T23-10-15Z
slug: resources-js-components-addtocollagebutton-vue
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Full/locked signaled three ways (emoji, suffix, border) — clear but redundant |
| 2 | Match System / Real World | 2 | ⚠️ reads as a lint/error warning, not "this shelf is full," in a warm family-memory app |
| 3 | User Control and Freedom | 3 | Replace-picker + cancelable confirm dialog remain intact |
| 4 | Consistency and Standards | 1 | Full gets 3 signals (emoji+suffix+border), locked gets 2 (no border) — no stated reason for the asymmetry, and the new yellow isn't one of the app's three owned accent colors |
| 5 | Error Prevention | 2 | Border only appears after a full collage is already selected; nothing warns before the click besides option text |
| 6 | Recognition Rather Than Recall | 2 | Emoji restates what "(Full)"/"(Locked)" text already says — added scanning cost, not reduced |
| 7 | Flexibility and Efficiency | 3 | Select is hidden entirely for single-collage users; fine |
| 8 | Aesthetic and Minimalist Design | 1 | Emoji + suffix in a cramped native option is visual noise for zero new information |
| 9 | Error Recovery | 3 | InputError bindings for collage/replace_page_id untouched and working |
| 10 | Help and Documentation | n/a | No help affordance warranted for a two-field form |
| **Total** | | **20/36** | **Acceptable (56%)** |

## Design Specificity Verdict

**LLM assessment:** Generic web-dev fix, not authored for Shudderfly. Emoji-in-option plus a conditional border is the shape of "make it more visible" without touching the design system. `yellow-400`/`yellow-500` are coincidentally near the palette, not drawn from it — DESIGN.md's actual attention tokens are Marquee Amber (#fbbf24) and Marquee Bulb (#f59e0b), already load-bearing elsewhere. A native `<select>` is also structurally the wrong canvas for this system's language — DESIGN.md reserves Paper White/Backstage Charcoal styling for dropdown panels.

**Deterministic scan:** detect.mjs returned exit 0, 0 findings — clean but a coverage gap, not an endorsement: it doesn't catch off-brand color, redundant signaling, or read-aloud omissions.

**Manual mechanical facts (Assessment B):**
- `text-yellow-400` / `border-yellow-500` are absent from DESIGN.md's palette.
- The `<select>` has no accessible label — no aria-label, aria-labelledby, or `<label>` anywhere (pre-existing).
- `focus:outline-none` removes the native focus ring; the conditional border-color swap is the only replacement.
- All `t()` keys used are present in en/es/fr — i18n discipline intact for text; the gap is the emoji itself carries meaning outside any `t()` string.
- No stray elements nested inside `<option>` — the dead-`<span>` cleanup done this session was correct.

## Overall Impression

The underlying state model (isCollageFull, mustUseReplaceFlow) and flow guards are solid. The "make it clearer" fix layered on top solves visibility with volume (three redundant signals) instead of precision, uses a color the design system doesn't own, and never reaches the read-aloud channel Shudderfly treats as core accessibility infrastructure.

## What's Working

- mustUseReplaceFlow cleanly unifies "full" and "locked-with-pages" into one guard; replace-picker/confirm-dialog fallback is well-protected against double submits.
- New suffix text is properly localized via t() in all three languages.
- Hiding the select entirely for single-collage users keeps the common case minimal.

## Priority Issues

**[P0] The full/locked warning never reaches read-aloud.** speak() fires for add/confirm/replace but nothing announces "this collage is full."
- Why it matters: read-aloud is a core differentiator for this app's mixed-age, mixed-literacy audience; a purely visual cue is invisible to exactly the users this feature exists for.
- Fix: call speak(t('page.collage_full_speak', { number })) when a full/locked collage is selected or Add routes into the replace flow.
- Suggested command: /impeccable harden

**[P1] Off-palette color.** text-yellow-400/border-yellow-500 aren't in DESIGN.md's three-color system.
- Why it matters: a fourth ad hoc warning color erodes the "three colors against a dark stage" identity.
- Fix: swap to amber-400/amber-500 (Marquee Amber / Marquee Bulb).
- Suggested command: /impeccable colorize

**[P1] Inconsistent severity signaling between full and locked.** Full gets emoji+suffix+border; locked gets emoji+suffix only.
- Why it matters: asymmetric signal count with no stated rationale trains users to guess at meaning.
- Fix: apply one consistent rule to both states.
- Suggested command: /impeccable polish

**[P2] Emoji-as-icon inside a native option degrades for screen readers and isn't localized.**
- Why it matters: redundant noise for screen readers; unlocalized signal in an otherwise fully-t()'d app.
- Fix: drop the emoji; keep suffix text; put emphasis on the select's border/text color.
- Suggested command: /impeccable clarify

**[P3] No cue on the Add button about what the click will do.**
- Why it matters: the add-vs-replace decision isn't visible at the point of action.
- Fix: swap button label/icon to "Replace…" when mustUseReplaceFlow is true for the selected collage.
- Suggested command: /impeccable clarify

## Persona Red Flags

**Jordan (First-Timer)**: Sees the warning icon and may hesitate to click Add, reading it as "something is broken" rather than "a swap is available."

**Sam (Accessibility-Dependent)**: No aria-label/label on the select (pre-existing); screen readers hear the emoji as a redundant literal word; speak() says nothing about the state.

**Riley (Stress-Tester)**: Rapid select switching recomputes selectedCollageIsFull with no debounce — functionally fine, visually busy under fast interaction.

## Minor Observations

- focus:outline-none removes the native focus ring; border-color swap is a narrower replacement.
- getCollageDisplayNumber falls back to raw collageId if not found — could surface a database ID.
- Four chained ternaries building option text are hard to scan; a small optionLabel(collage) helper would read more clearly.

## Questions to Consider

- If a full/locked collage always routes to the same replace-picker, does the dropdown need to warn before the click at all?
- Should collage selection eventually become a custom themed dropdown instead of pushing against native option limits?
