# Games World 3D: houses, rooms and a deeper road

Status: **draft, for discussion**. Nothing here is built yet.

## Why

Games World (`resources/js/Pages/Games/World/`) is a flat side-scroller. The peach walks a looping road,
emoji landmarks stand along it, and dropping the peach on one opens a `GameConfirmCard` that links to the
game. It works and it's charming, but it's a dead end for growth: one row of buttons along one line, and
every new thing has to be another landmark on the road.

This spec makes the world feel three-dimensional and gives it **places you can go into**: houses with
rooms, and objects in those rooms you can poke, open, play with, or use to start a game. The six games we
have today are the first things to put in those places. The real goal is a structure that new kinds of
interactions and games can be added to without redesigning the world each time.

## Goals

1. **Depth on the road.** It should feel like a street you walk down, not a strip: a ground plane that
   recedes, buildings with fronts, sides and roofs, layers moving at different speeds, things in the
   foreground passing in front of the peach, and a shadow under the peach.
2. **Enterable buildings.** Walk up to a door, go in, and you're in a room that looks like a dollhouse
   (back wall, side walls and floor in perspective). Rooms can lead to other rooms.
3. **Interactable objects.** Anything in a room (or on the road) can be an _interactable_: tap or walk to
   it and something happens. Starting a game is one kind of interaction. The structure must allow new kinds.
4. **Existing games keep working**, each reachable from a sensible place (the toilet launches Boom, and so on).
5. **Keep what works today:** drag-to-walk, arrow keys, the keyboard and screen-reader route,
   reduced-motion support, seasonal themes, the tilt "peek", read-aloud cards, and running smoothly on a
   family phone or tablet.

## Not in scope (for now)

- Free 3D camera rotation or first-person view.
- Multiplayer or seeing other family members in the world. A shared world can come later; the scene
  model below doesn't rule it out.
- Server-saved progress (collectibles, unlocks). That comes later; see Phase 7.
- Rewriting the existing games. They stay as their own Inertia pages.

---

## Key decision: how to render it

| Option                                                                                     | Pros                                                                                                                                                                                                                                                                                 | Cons                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. CSS 3D ("2.5D diorama")**: DOM elements with `perspective`, `translateZ`, `rotateX/Y` | No new dependency. Interactables stay real `<button>`s, so keyboard, focus, screen readers and `t()` labels work as they do now. Emoji render natively. Builds on the current `GamesWorld.vue`, `useParallax` and the theming custom properties. Easy to test with Vitest and jsdom. | Limited lighting and shading. No real camera orbit. Too many layered 3D elements can hurt performance on low-end devices, so we need a budget.                                                                                                |
| **B. Three.js / WebGL**                                                                    | Real 3D: lighting, shadows, any camera angle, room for much richer scenes later.                                                                                                                                                                                                     | Adds about 150 KB+ gzipped. Emoji must be drawn onto canvas textures. Accessibility has to be rebuilt as a parallel DOM layer. WebGL context loss and teardown need handling. Harder to test. Doesn't match how the rest of the app is built. |

**Recommendation: A (CSS 3D).** The world's whole look is emoji on bright, flat colors, and the audience
includes young kids using tablets. A dollhouse diorama gets most of the "3D" feeling at a fraction of the
cost, and keeps the keyboard and screen-reader route we already built. To keep B available later, the
rendering sits behind the scene model below. Scenes are data plus a headless composable, and only the
`*Scene.vue` renderers know about CSS, so a WebGL renderer could replace one scene type without touching
the data, the interactions or the tests.

### The rule that keeps pointer math simple

Today `pointerToWorld()` is just `clientX - stageLeft + camera.x`, and the comments in `GamesWorld.vue`
warn that anything inside `.world` must stay untransformed. Under CSS perspective, **an element at
`translateZ(0)` renders at exactly scale 1**. So:

- The peach and everything it can be dropped on live on the **z = 0 interaction plane**, and the
  existing x-only pointer math keeps working.
- Scenery (far buildings, hills, the far side of the road, foreground props) is pushed to negative or
  positive z. It's decorative and `pointer-events: none`.
- Where a scene really needs depth picking (room floors, see below), a single pure module,
  `composables/projection.js`, owns both `worldToScreen()` and `screenToFloor()`. The CSS uses the same
  constants, so what you see and what you can tap can't drift apart. This module gets thorough unit tests.

---

## Scene model

Everything becomes a **scene** made of **interactables**. The road is one scene, and each room is another.

```js
// Shape the frontend receives (from the server, see "Registry" below)
{
  scenes: {
    road: {
      kind: "road",                       // which renderer and composable
      loop: true,
      interactables: [
        { id: "house", type: "door", x: 600, label: "…", emoji: "🏠", to: "house.hall", building: { … } },
        { id: "boom-road", type: "game", x: 4200, game: "boom", emoji: "🚽" },
        …
      ],
    },
    "house.hall": {
      kind: "room",
      label: "…",
      size: { w: 900, d: 500 },           // floor size in world units
      walls: { back: "wallpaper-stripes", floor: "wood" },   // theme tokens, not colors
      spawn: { x: 450, z: 420 },          // where you appear when coming in
      interactables: [
        { id: "front-door", type: "door", x: 450, z: 500, to: "road", toSpot: "house" },
        { id: "kitchen-door", type: "door", x: 880, z: 200, to: "house.kitchen" },
        { id: "radio", type: "toy", x: 150, z: 60, emoji: "📻", action: "music" },
      ],
    },
    …
  }
}
```

- **Scene ids** are dotted strings (`house.kitchen`) so that later houses don't collide with each other.
- **Interactables** have a `type` that selects an _interaction handler_ (next section). Position is `x`
  on the road and `x, z` in rooms.
- All visible text (`label`, game names and descriptions) is translated on the server with `__()`, as
  `GameController::games()` does today, so en/es/fr stay in step.

### Interaction handlers (the extension point)

Every interactable type is a small module in `resources/js/Pages/Games/World/interactions/`:

```js
// interactions/door.js
export default {
    // Optional: should walking onto it trigger it automatically?
    autoTrigger: true,
    // Called when the peach arrives at, or the player activates, the interactable.
    activate(item, ctx) {
        ctx.goToScene(item.to, { spot: item.toSpot });
    },
};
```

`ctx` is the only thing a handler can use: `goToScene`, `openCard(component, props)`, `speak(text)` (via
`useSpeechSynthesis` / `useGameIntroSpeech`), `playSound(name)` (respects `sounds_enabled`),
`animate(itemId, name)`, `visitUrl(route)`, and read-only `settings`. Keeping handlers behind `ctx` means
a new interaction is one new file plus a test. The stage, composables and other handlers don't change.

Handlers in the first release:

| type   | does                                                                                                                                                          |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `game` | Opens today's `GameConfirmCard` (Listen, Play, Cancel). Unchanged behavior.                                                                                   |
| `door` | Changes scene. Auto-triggers on arrival, with no card: going in and out is cheap and easy to undo, while starting a game still asks first.                    |
| `toy`  | Plays a short animation, a sound, and an optional spoken line (fridge opens, toaster pops, lamp flicks on, rubber duck squeaks). Pure delight, no navigation. |

Planned for later (Phase 6+), each one a new handler with no changes to the engine:

| type        | idea                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `bookshelf` | Pulls a random family book (or a favorite) and offers to open it. This ties the play space back to the app's "memory-first" purpose. |
| `tv`        | Plays a family video page inline.                                                                                                    |
| `radio`     | Plays a song through `useMusicPlayer` (only when `music_enabled`).                                                                   |
| `minigame`  | A small game that runs **inside** the room (a Vue component mounted in a card), for quick games that don't deserve their own page.   |
| `collect`   | A hidden item to find (stickers or stars). Needs server persistence (Phase 7).                                                       |

---

## The road, in 3D

Same controls, more depth.

- **Camera:** stays a side-on, follow-the-peach camera with the current deadzone and snap behavior
  (`useGamesWorld` stays the source of truth). The stage gets a `perspective` and a slightly lowered
  `perspective-origin`, so the ground plane visibly recedes toward the horizon.
- **Ground:** the road and grass become planes rotated on `rotateX` that meet the z = 0 line exactly at
  the peach's feet. A painted center line and curbs scroll with the camera, which gives a strong sense of
  motion.
- **Buildings:** each landmark becomes a small box (front, one visible side, roof) instead of a lone
  emoji. The emoji becomes the sign or window. The arched gold title stays, mounted on the facade. Doors
  are drawn on buildings that can be entered, so you can see at a glance which ones you can go into.
- **Layers:** back ridge, mid-distance trees and houses, the road, then foreground props (fences,
  mailboxes, bushes) at positive z that slide past _in front of_ the peach. The existing `hills-far` tile
  and clouds stay where they are, and the tilt peek keeps working on the backdrop layers only.
- **Peach:** gets a soft ground shadow that shrinks while it bobs or is thrown.
- **Optional (decide in Phase 2): two lanes.** Up and down arrows (or dragging vertically) move the peach
  between the near and far side of the road. Lanes would let doors sit on the far side, with "up" meaning
  "walk to the door". This is nice but not required. Without lanes, you reach a door by dropping the
  peach on it, just like a landmark today.

## Rooms (the dollhouse)

- **Look:** a box with the front wall removed. The back wall faces you, the two side walls angle away,
  and the floor recedes, all built from CSS 3D planes. Wallpaper, floor and trim colors come from
  custom-property tokens so seasonal themes can restyle a room (garlands at Christmas, cobwebs at
  Halloween), as the `.stage.theme-*` rules do today.
- **Moving:** tap or click anywhere on the floor and the peach walks there along a straight line at
  `DRAG_SPEED`. It gets smaller as it goes back (scale is taken from `projection.js`). Dragging the peach
  also works. Arrow keys move it in four directions. There's no pathfinding in v1: rooms are rectangles
  and furniture is just touched, never blocking.
- **Using things:** tap an interactable and the peach walks to it, then `activate` runs when it arrives,
  as landmarks work today. Keyboard users can Tab through a room's interactables, and focusing one walks
  the peach there (the same pattern as `onLandmarkFocus`). Enter activates it.
- **Leaving:** Escape, the front door, or a back button always visible in the corner (big enough to tap,
  with a translated label) takes you out to the scene you came from.
- **Size:** a room fits the stage without scrolling. Larger spaces are split into several rooms joined
  by doors, which also keeps each scene's element count small.

## Scene transitions

- **Going in:** the camera zooms toward the door (`translateZ` and `scale`, about 400 ms), crossfades,
  and the room "unfolds" from the back wall. Going out reverses it. **Reduced motion:** a simple 150 ms
  crossfade, nothing else.
- An `aria-live="polite"` region announces the new scene's name ("Kitchen"). If the player has
  read-aloud on, the name is also spoken.
- **Remembering where you were:** the current scene id and peach position are saved to `sessionStorage`
  (wrapped in try/catch, so the world still opens if storage fails). When you come back from a game you
  return to the room you launched it from instead of the start of the road. This also fixes today's
  behavior of always starting at `x = 260`.
- The URL can carry the scene (`/games?scene=house.kitchen`) so a shared "come play in the kitchen"
  link works. This is a nice-to-have and can wait until Phase 3.

## First content: "The House"

This is a starting proposal, meant for family brainstorming. It puts every existing game somewhere that
makes sense:

| Room     | Interactables                                                                                                   |
| -------- | --------------------------------------------------------------------------------------------------------------- |
| Hall     | Front door (out), doors to the other rooms, coat rack `toy`, doorbell `toy`                                     |
| Kitchen  | **Toot Foods** (the fridge), **Costco Pizza Poop** (pizza box on the table), toaster `toy`, cat food bowl `toy` |
| Bathroom | **Boom** (the toilet), bathtub with rubber duck `toy`, sink `toy`                                               |
| Bedroom  | **Sprout Pox** (a sick teddy bear in bed), lamp `toy`, later a `bookshelf`                                      |
| Basement | **Cockroach** and **Cockroach Fight** (two dark corners), a flickering light bulb `toy`                         |

The road keeps the hospital, burger stand, arena and the rest as **direct game launchers** for now, so
nothing a kid already knows how to reach disappears. Once the house is popular we can decide whether those
buildings also become enterable.

---

## Registry (server)

Following the current pattern, where `GameController::games()` is the single source for names and road
positions:

- Add `App\Support\GamesWorld::scenes()`, which returns the structure above with translated labels.
  Interactables of type `game` reference a slug in `GameController::games()` instead of copying its name
  and description. The controller fills those in.
- `GameController::index()` passes `scenes` (and keeps `games` for anything that still reads it). There
  are no new routes: the world stays on `games.index`.
- **A PHPUnit test** checks the registry: every `game` slug exists, every `door.to` points to a scene
  that exists, every room has a way out, every road door has a `toSpot` back, and every label key exists
  in en, es and fr.
- Landmarks currently come from `games[].distance`. In Phase 1 the road scene is _generated_ from that
  same data, so nothing changes visually and nothing is defined twice.

## Frontend structure

```
Pages/Games/World/
  GamesWorld.vue            // stage: owns the pointer, keyboard, transitions, aria-live; mounts the current scene
  scenes/RoadScene.vue      // renders kind:"road" (what GamesWorld.vue mostly is today)
  scenes/RoomScene.vue      // renders kind:"room"
  components/GameConfirmCard.vue   // unchanged
  components/Interactable.vue      // one button per interactable: emoji, label, focus->walk
  composables/useGamesWorld.js     // road state (existing, mostly unchanged)
  composables/useRoom.js           // room state: peach {x,z}, walk target, nearest interactable; DOM-free like useGamesWorld
  composables/useSceneRouter.js    // current scene, history stack, transition state, sessionStorage restore
  composables/projection.js        // worldToScreen / screenToFloor, shared by renderers and pointer picking
  interactions/{game,door,toy}.js  // handlers; index.js maps type -> handler
```

`useIdlerPhysics` and the roadside cast stay on the road scene. Rooms can reuse `useIdlerPhysics` later
for throwable objects (throwing a pillow seems inevitable).

## Accessibility, motion and localization (non-negotiable)

- Every interactable is a real `<button>` with a translated `aria-label`. The keyboard can reach
  everything a pointer can.
- `prefers-reduced-motion`: no camera swoops, bobbing or idle animations. Scene changes crossfade. Toys
  still respond (a state change, not a long animation).
- Read-aloud: room names and `toy` lines go through the existing speech composables, so non-readers can
  explore.
- Tap targets are at least 48 px at the smallest room scale. If perspective would shrink a far object
  below that, the object moves forward or the room gets shallower.
- All new strings go into `lang/en`, `lang/es` and `lang/fr` in the same order, checked by the script in
  `CLAUDE.md`.

## Performance budget

- Aim for 60 fps on a mid-range phone and acceptable on an older iPad. Measure in Phase 2 before
  building rooms.
- At most about 60 transformed elements on screen per scene. Rooms are separate scenes, so the road never
  pays for interiors.
- Room renderers are lazy-loaded (`defineAsyncComponent`), so the first paint of `/games` costs about
  what it does today.
- No per-frame layout reads (keep the current "measure once per gesture" rule). Animate only `transform`
  and `opacity`.
- The rAF loop runs only for the active scene and pauses on `visibilitychange` and `blur`, as today.

## Testing

- Vitest for every new composable, following `useGamesWorld.test.js`: drive `step(dt)` directly, with no
  fake rAF. `projection.js` gets round-trip tests (`screenToFloor(worldToScreen(p)) ≈ p`).
- One test per interaction handler, using a fake `ctx`.
- A stage-level test that a door changes scene, Escape exits, and focus lands on the door you came
  through when you come back out.
- The PHPUnit registry test described above.

---

## Phases

Each phase is one PR that can ship on its own, like phases 1–8 of the original Games World.

1. **Scene model, no visual change.** Add `GamesWorld::scenes()` (road generated from `games()`), the
   `scenes` prop, `useSceneRouter`, the interaction registry with a `game` handler, and move the road into
   `RoadScene.vue`. All current tests still pass.
2. **3D road.** Perspective stage, ground planes, building boxes, foreground layer, peach shadow.
   Performance check on real devices. Decide on lanes here.
3. **Doors and transitions.** `door` handler, enter and exit animations, aria-live, `sessionStorage`
   restore (including after returning from a game). The first door opens onto a placeholder room.
4. **Room engine.** `RoomScene.vue`, `useRoom`, `projection.js`, tap-to-walk, keyboard navigation in rooms,
   and the `toy` handler.
5. **The House.** Real rooms, art (CSS and emoji), all six games placed, seasonal room tokens, en/es/fr
   copy.
6. **More interactions.** `bookshelf`, `radio`, `tv`, `minigame`, each behind its feature flag where one
   applies.
7. **Progress (optional).** A small `world_progress` table (user, key, value) for collectibles and unlocks,
   behind a `SiteSetting` flag.

## Open questions

1. **Rendering:** OK to go with CSS 3D (recommended), or is a richer Three.js look worth the cost?
2. **Road camera:** keep the side-on view with depth (recommended, controls stay the same), or switch to a
   behind-the-peach view where the road runs _into_ the screen? The second looks more 3D but replaces
   drag-to-walk and the existing road logic.
3. **Lanes on the road** (near and far side), yes or no?
4. **Which buildings can be entered?** One "House" first (recommended), or every landmark gets an interior?
5. **Room contents:** is the table above the right cast? Kids' ideas are welcome here, since this is the
   fun part.
6. **Bookshelf and TV linking to family books and videos:** wanted? It's the strongest tie back to what
   Shudderfly is for, but it mixes play and memories in one space.
