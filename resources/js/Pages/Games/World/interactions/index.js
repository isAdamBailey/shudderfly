import { own } from "@/utils/object";
import book from "./book.js";
import door from "./door.js";
import game from "./game.js";
import toy from "./toy.js";
import tv from "./tv.js";

/**
 * Interactable `type` → handler. A handler is `{ activate(item, ctx) }` and may
 * only reach the world through `ctx`, so a new kind of interaction is one new
 * file plus a line here (issue #130).
 */
const interactions = { book, door, game, toy, tv };

// An own key, so a type like "constructor" can't reach Object.prototype.
const handlerFor = (item) => own(interactions, item.type);

/** Whether walking up to an interactable uses it (its handler's
 * `autoTrigger`), or only a tap or Enter does. */
export function autoTriggers(item) {
    return Boolean(handlerFor(item)?.autoTrigger);
}

/** Runs the handler for an interactable. An unknown type does nothing rather
 * than throwing, so a registry entry the client doesn't know yet is inert. */
export function activate(item, ctx) {
    handlerFor(item)?.activate(item, ctx);
}
