/** The Movies dialog, fetched when first wanted: its trailer player and
 * voice search stay out of the world's first download. The card opens once
 * it has come, so a chunk that won't load (after a deploy) leaves the world
 * as it was rather than waiting on a card that never shows. */
export const loadMoviesCard = () =>
    import("../components/MoviesCard.vue").then((module) => module.default);

/** Opens the Movies dialog with `props`, once it has loaded. */
export function openMovies(ctx, props) {
    return loadMoviesCard()
        .then((card) => ctx.openCard(card, props))
        .catch(() => {});
}

/** The Library hall's movie podium (GamesWorld::MOVIE_PODIUM) opens the
 * Movies dialog on its favourites, or on what a shared movie's link names
 * (`args`: { movieId, title }); it never sends a room note. */
export default {
    activate(_item, ctx, args = {}) {
        return openMovies(ctx, args);
    },
};
