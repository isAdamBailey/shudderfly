import game from "./game.js";

/**
 * Interactable `type` → handler. A handler is `{ activate(item, ctx) }` and may
 * only reach the world through `ctx`, so a new kind of interaction is one new
 * file plus a line here (issue #130).
 */
const interactions = { game };

/** Runs the handler for an interactable. An unknown type does nothing rather
 * than throwing, so a registry entry the client doesn't know yet is inert. */
export function activate(item, ctx) {
    // hasOwn, so a type like "constructor" can't reach Object.prototype.
    if (Object.hasOwn(interactions, item.type)) {
        interactions[item.type].activate(item, ctx);
    }
}
