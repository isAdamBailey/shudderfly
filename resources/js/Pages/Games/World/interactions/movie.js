import { openMovies } from "./moviePodium.js";

/**
 * A favourite movie on the Library hall's movie rack (scenes/bookshelf.js,
 * a shelf that `holds: "movies"`): the Movies dialog, on that movie, over
 * the world (the podium's, interactions/moviePodium.js).
 */
export default {
    activate(item, ctx) {
        return openMovies(ctx, {
            movieId: item.movie.id,
            title: item.movie.title,
        });
    },
};
