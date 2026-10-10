import { own } from "@/utils/object";

/**
 * Every game, played inside the world through GameHost (issue #144). The
 * names are GameController::games()'s, and a test keeps the two in step.
 * Each loads the first time it's played.
 */
const HOSTED = {
    cockroach: () => import("@/Pages/Games/Cockroach/App.vue"),
    "cockroach-fight": () => import("@/Pages/Games/CockroachFight/App.vue"),
    "toot-foods": () => import("@/Pages/Games/TootFoods/App.vue"),
    "costco-pizza-poop": () => import("@/Pages/Games/CostcoPizzaPoop/App.vue"),
    boom: () => import("@/Pages/Games/Boom/App.vue"),
    "sprout-pox": () => import("@/Pages/Games/SproutPox/App.vue"),
};

export const HOSTED_GAMES = Object.keys(HOSTED);

/** The loader for `slug`'s App.vue, or null for a name that isn't a game. */
export function hostedGame(slug) {
    return own(HOSTED, slug) ?? null;
}
