---
name: Shudderfly
description: A private family memory app — a dark carnival marquee for storybook moments.
colors:
    marquee-yellow: "#fef08a"
    storybook-blue: "#2563eb"
    curtain-red: "#b91c1c"
    marquee-bulb: "#facc15"
    stage-night: "#111827"
    backstage-charcoal: "#1f2937"
    paper-white: "#ffffff"
    mist-gray: "#f3f4f6"
typography:
    display:
        fontFamily: "Spicy Rice, cursive"
        fontSize: "clamp(1.75rem, 4vw, 3rem)"
        fontWeight: 400
        lineHeight: 1.2
        letterSpacing: "0.02em"
    body:
        fontFamily: "Nunito, sans-serif"
        fontSize: "1rem"
        fontWeight: 400
        lineHeight: 1.5
        letterSpacing: "normal"
    label:
        fontFamily: "Nunito, sans-serif"
        fontSize: "0.75rem"
        fontWeight: 600
        lineHeight: 1.5
        letterSpacing: "0.1em"
    content:
        fontFamily: "Newsreader, serif"
        fontSize: "1.1rem"
        fontWeight: 400
        lineHeight: 1.8
        letterSpacing: "normal"
rounded:
    sm: "6px"
    md: "8px"
    lg: "12px"
    pill: "9999px"
    panel: "20px"
spacing:
    sm: "8px"
    md: "16px"
    lg: "24px"
    container: "80rem"
components:
    button-primary:
        backgroundColor: "{colors.storybook-blue}"
        textColor: "{colors.marquee-yellow}"
        typography: "{typography.label}"
        rounded: "{rounded.sm}"
        padding: "12px 24px"
    button-primary-hover:
        backgroundColor: "{colors.curtain-red}"
        textColor: "{colors.marquee-yellow}"
    button-primary-active:
        backgroundColor: "{colors.marquee-bulb}"
        textColor: "{colors.backstage-charcoal}"
    button-form:
        backgroundColor: "{colors.backstage-charcoal}"
        textColor: "{colors.paper-white}"
        typography: "{typography.label}"
        rounded: "{rounded.sm}"
        padding: "8px 16px"
    input-field:
        backgroundColor: "{colors.paper-white}"
        textColor: "{colors.stage-night}"
        rounded: "{rounded.sm}"
        padding: "8px 12px"
    card-book:
        backgroundColor: "{colors.stage-night}"
        textColor: "{colors.paper-white}"
        typography: "{typography.display}"
        rounded: "{rounded.md}"
    card-stat:
        backgroundColor: "{colors.paper-white}"
        textColor: "{colors.stage-night}"
        rounded: "{rounded.md}"
        padding: "12px"
    modal-dialog:
        backgroundColor: "{colors.paper-white}"
        textColor: "{colors.stage-night}"
        rounded: "{rounded.md}"
        padding: "24px"
---

# Design System: Shudderfly

## 1. Overview

**Creative North Star: "The Midnight Marquee"**

Shudderfly's stage is a charcoal-navy backdrop (Stage Night, #111827) lit by a single spotlight color — Marquee Yellow — and framed top and bottom by a hand-painted rainbow light bar. Page titles, book covers, and primary nav labels are set in Spicy Rice, the chunky hand-lettered typeface of a backyard movie-night marquee. Family memories sit on this stage like keepsakes on a shelf: 3D "mini-book" covers with spines, shelf shadows, and shelf-light highlights, and a frosted-glass reading panel where Newsreader serif text and a dropped first letter turn the page into a storybook.

Four times a year the marquee changes its bulbs for the season — Christmas, Halloween, Fireworks — repainting the rainbow bar, the spotlight color, and adding seasonal effects (falling snow, fireworks bursts) without rebuilding the stage itself. The marquee never goes quiet, and it never goes corporate: this system explicitly rejects public-feed mechanics (infinite scroll, like counters, social proof), generic gray SaaS dashboard chrome, and "generic AI UI" tropes — cream/sand backgrounds, gradient text, tracked-uppercase eyebrow labels, numbered section scaffolds — per PRODUCT.md's anti-references.

**Key Characteristics:**

-   Dark stage by default (Stage Night #111827), lit by a single Marquee Yellow accent
-   A rainbow gradient light bar bookends every page — nav at top, footer at bottom — and nowhere else
-   Spicy Rice display type for titles and labels only — never body copy
-   3D "mini-book" covers (spine, shelf shadow, radial highlight) as the primary content card
-   A frosted-glass reading panel with Newsreader serif text and a classic drop cap
-   Tactile `.btn-bulge` buttons — physical, pressable, ease-out only, no bounce
-   Four seasonal "costume changes" via `data-theme` (default, christmas, halloween, fireworks) that repaint the marquee without changing its structure

## 2. Colors

The marquee runs on three colors against a near-black stage: Marquee Yellow for the spotlight, Storybook Blue for memory, and Curtain Red for action — with the rainbow light bar as the system's one festive flourish.

### Primary

-   **Marquee Yellow** (#fef08a): page titles, book titles, active nav and profile states, focus accents on the dark stage. The spotlight color — used sparingly, for titles and "you are here" states only.

### Secondary

-   **Storybook Blue** (#2563eb): book titles in light surfaces, links inside reading content, the default button surface (`bg-theme-primary`). The "memory" color.

### Tertiary

-   **Curtain Red** (#b91c1c): the default button's hover/press surface (`bg-theme-button`), paired with Marquee Yellow text. The "action" color.

### Neutral

-   **Stage Night** (#111827 / gray-900): the base background. Every page is a dark stage by default.
-   **Backstage Charcoal** (#1f2937 / gray-800): elevated dark surfaces — modals, dropdown panels, dark-mode form fields.
-   **Paper White** (#ffffff): floating light surfaces — dropdown menus, modal cards, admin stat cards. Never the page background.
-   **Marquee Bulb** (#facc15 / yellow-400): the "currently active/pressed" feedback color — a brighter yellow than the spotlight, reserved for active states.
-   **Mist Gray** (#f3f4f6 / gray-100): text and labels sitting on the rainbow bar or the dark stage, where pure white is too harsh.

### Named Rules

**The Rainbow Light-Bar Rule.** The `bg-rainbow` gradient (red → orange → yellow → green → blue → purple, re-themed per season) is reserved for exactly two places: the top nav and the footer. It is the marquee's string lights — used as a section background, button, or card anywhere else, it flattens into decoration and breaks the "two light bars frame the stage" read.

**The Halloween Reservation Rule.** Purple/violet (`halloween-purple` #6B2D8F, `halloween-witch` #4B0082, and Tailwind's `purple-*` scale) is reserved for the Halloween `data-theme` only. Using purple as a default-theme accent — gradients, headings, hover states — both steals Halloween's seasonal signal and is the single most recognizable AI-palette tell.

## 3. Typography

**Display Font:** Spicy Rice (with sans-serif fallback)
**Body Font:** Nunito (with system sans-serif fallback)
**Content/Reading Font:** Newsreader (serif, with serif fallback)

**Character:** Spicy Rice's chunky, hand-painted-sign letterforms carry the marquee identity — every page title, book cover title, and the "ALL" nav label are set in it. Nunito is the quiet workhorse for everything else: buttons, forms, nav items, body copy. Newsreader switches the reading experience into storybook mode — slower, serif, generously spaced, with a dropped first letter on the opening paragraph.

### Hierarchy

-   **Display** (Spicy Rice, 400, `clamp(1.75rem, 4vw, 3rem)`, line-height 1.2): page headers (`font-heading text-3xl`) and book cover titles (uppercase, `tracking-[0.08em]`)
-   **Body** (Nunito, 400/600/700, 1rem, line-height 1.5): UI chrome, nav, forms, dialogs
-   **Label** (Nunito, 600, 0.75rem, uppercase, `tracking-widest`): button labels, pills, micro-copy
-   **Content** (Newsreader, 400, 1.1rem desktop / 1rem mobile, line-height 1.8, max-width 800px ≈ 70ch, justified): book page reading text, with a 2.5em drop cap on the first paragraph's first letter

### Named Rules

**The One Marquee Font Rule.** Spicy Rice appears only in headings, titles, and the primary nav label — never in body copy, buttons, or dense UI text. At length its hand-lettered density becomes illegible; one to three words at a time only.

## 4. Elevation

Layered, not flat — depth and shadow are part of the brand voice everywhere, from admin stat cards to the 3D book covers, just dialed down outside the "hero" moments. Two named effects carry the system: the multi-layer "mini-book" shadow stack (spine gradient, radial highlight, diagonal shading, translucent border) on every book cover, and the frosted-glass reading panel (`border-radius: 20px`, `backdrop-filter: blur(20px)`, layered shadow + 1px inner border).

### Shadow Vocabulary

-   **Ambient card** (`box-shadow: 0 1px 2px rgba(0,0,0,0.05)`, Tailwind `shadow-sm`): admin stat cards, list rows
-   **Floating panel** (`shadow-lg`): dropdown menus, "More" panels attached to the nav bar
-   **Hero shadow** (`shadow-xl`): modals, book covers, game modals
-   **Mini-book stack** (multi-layer — see `card-book` in the sidecar): spine gradient + radial highlight + diagonal shading + outer glow ring — the signature "book on a shelf" depth
-   **Reading-panel glass** (`0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)` + `backdrop-filter: blur(20px)`): the storybook reading panel

### Named Rules

**The Stage Light Rule.** Shadows fall as if lit from above by the marquee — tight, dark shadows under flat UI (cards, dropdowns, stat tiles); softer, wider glows around "performance" elements (book covers, active/pressed buttons, the reading panel).

## 5. Components

### Buttons

-   **Shape:** `rounded-md` (6px corners) on every button
-   **Primary** (theme `Button`, default theme): Storybook Blue background, Marquee Yellow uppercase `tracking-widest` text, 12px/24px padding
-   **Hover/Press:** `.btn-bulge` — on hover, scale to 105% and lift 2px; on press, scale to 95% and settle; on touch-tap, scale to 110% and brighten. Ease-out only, no bounce/elastic. `prefers-reduced-motion` strips all transform/scale to a flat color change.
-   **Active state:** background shifts to Marquee Bulb (#facc15) with Backstage Charcoal text — the "currently selected" treatment
-   **Form (admin/profile — `PrimaryButton` / `SecondaryButton`):** Backstage Charcoal / Paper White (inverted per dark mode), uppercase `tracking-widest text-xs`, 8px/16px padding. Quieter, Breeze-derived, scoped to profile and account-settings forms.

### Cards / Containers

-   **Mini-book (signature):** `rounded-lg` (8px), `aspect-[3/4]`, layered shadow stack (5px translucent border, spine gradient, radial highlight, diagonal shading), Spicy Rice title over a `bg-black/25` scrim, location-pin badge top-right when geotagged
-   **Stat card (admin):** Paper White / Backstage Charcoal, `rounded-lg`, `shadow-sm`, icon-or-cover-image + label + value row
-   **Reading panel:** `border-radius: 20px`, `backdrop-filter: blur(20px)`, `rgba(0,0,0,0.7)` background, max-width 800px — Newsreader content with a 2.5em drop cap on the lead paragraph

### Inputs / Fields

-   **Style:** Paper White / Backstage Charcoal background, gray-300 / gray-500 border, `rounded-md`
-   **Focus:** border + ring color shift — currently `indigo-500`, a Breeze legacy carryover. New components should prefer Marquee Yellow or Storybook Blue focus rings to stay on-brand.

### Navigation

-   **Style:** sticky `bg-rainbow` bar, 64px tall. Spicy Rice "ALL" link plus Nunito nav items; Marquee Yellow border/text marks the active item. Profile trigger is a `rounded-xl` avatar button opening a Paper White / Backstage Charcoal dropdown.
-   **Mobile:** condenses to a hamburger "More" dropdown sliding from the same rainbow bar; a bottom-anchored music flyout persists across route changes.

### Seasonal Reskins (signature)

Four `data-theme` values — default, christmas, halloween, fireworks — repaint the rainbow bar's gradient stops and the Marquee Yellow spotlight, and layer in seasonal effects (falling snow for Christmas, a fireworks burst animation). The marquee's structure — dark stage, light bars, Spicy Rice titles, mini-book shelves — never changes; only its bulbs do.

## 6. Do's and Don'ts

### Do:

-   **Do** keep the stage dark (Stage Night #111827) by default; Paper White is reserved for floating panels — dropdowns, modals, admin cards — never the page background.
-   **Do** use Spicy Rice only for short titles and labels (one to three words); everything else is Nunito (UI) or Newsreader (reading content).
-   **Do** apply `.btn-bulge` to every new pressable element — it's the app's tactile signature across the family's mixed ages.
-   **Do** keep the `bg-rainbow` gradient confined to the nav and footer bars (The Rainbow Light-Bar Rule).
-   **Do** give every animation — bulge, snow, fireworks, reveals — a `prefers-reduced-motion` alternative, per PRODUCT.md's accessibility principles.
-   **Do** keep tap targets large (min 44px / `min-h-11`) — the audience spans young kids to adults.

### Don't:

-   **Don't** use cream/sand/parchment near-white backgrounds. Per PRODUCT.md this reads as generic AI UI and breaks the dark-stage identity.
-   **Don't** use gradient text, tracked-uppercase "eyebrow" labels above sections, or numbered 01/02/03 section scaffolds — explicit PRODUCT.md anti-references.
-   **Don't** introduce purple/violet (`purple-400`, `purple-600`, `from-purple-*` gradients) outside the Halloween theme (The Halloween Reservation Rule) — it's both seasonally reserved and the most recognizable AI-palette tell.
-   **Don't** animate `width`, `height`, `padding`, or `margin` for transitions — use `transform`/`opacity`, or `grid-template-rows` for height changes.
-   **Don't** build infinite-scroll feeds, like/heart counters, or other social-proof/engagement mechanics — Shudderfly is memory-first, not engagement-first (PRODUCT.md).
-   **Don't** let admin/dashboard surfaces collapse into generic gray SaaS chrome — even the Admin dashboard keeps the marquee's playful voice (StatCards, theme accents, Spicy Rice headers).
-   **Don't** stack nested cards. The mini-book and reading panel earn their depth; a card inside a card inside a card does not.
