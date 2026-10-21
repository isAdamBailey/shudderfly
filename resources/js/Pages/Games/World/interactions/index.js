import { own } from "@/utils/object";
import book from "./book.js";
import door from "./door.js";
import drum from "./drum.js";
import game from "./game.js";
import harp from "./harp.js";
import minigame from "./minigame.js";
import organ from "./organ.js";
import radio from "./radio.js";
import toy from "./toy.js";
import tv from "./tv.js";

/**
 * Interactable `type` → handler. A handler is `{ activate(item, ctx) }` and may
 * only reach the world through `ctx`, so a new kind of interaction is one new
 * file plus a line here (issue #130).
 *
 * A handler other people in the room hear played (issue #174's
 * `client-note`) also has `note(item)`, what was played as a few whole
 * numbers, and `fromNote(item, which)`, the item as someone else played it
 * (or null when `which` isn't something it can play). Played back, its
 * `activate` gets only sounds and moves on `ctx` (GamesWorld.vue's
 * `instrumentCtx`): nothing it says or opens.
 */
const interactions = {
    book,
    door,
    drum,
    game,
    harp,
    minigame,
    organ,
    radio,
    toy,
    tv,
};

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

/** What playing `item` played, for the room (its handler's `note`), or
 * null when it's nothing anyone else hears. */
export function noteOf(item) {
    return handlerFor(item)?.note?.(item) ?? null;
}

/** `item` as someone else played it, `which` being their noteOf(), or null
 * when its handler can't play that. */
export function playedFrom(item, which) {
    const handler = handlerFor(item);
    if (!handler?.fromNote || !Array.isArray(which)) return null;
    return handler.fromNote(item, which);
}
