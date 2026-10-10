import { own } from "@/utils/object";

/**
 * Games that play inside the world (issue #144). The names are
 * GamesWorld::HOSTED, and a test keeps the two in step. A game not
 * listed still leaves for its page. Each loads the first time it's played.
 */
const HOSTED = {
    cockroach: () => import("@/Pages/Games/Cockroach/App.vue"),
    "cockroach-fight": () => import("@/Pages/Games/CockroachFight/App.vue"),
};

export const HOSTED_GAMES = Object.keys(HOSTED);

/** The loader for `slug`'s App.vue, or null when that game still plays on
 * its page. */
export function hostedGame(slug) {
    return own(HOSTED, slug) ?? null;
}
