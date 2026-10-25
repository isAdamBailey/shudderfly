import MovieCard from "../components/MovieCard.vue";

/**
 * A favourite movie on the Library hall's movie rack (scenes/bookshelf.js,
 * a shelf that `holds: "movies"`). Like a book, it asks first: opening it
 * leaves the world for the Movies page, so its card stands between the tap
 * and the movie.
 */
export default {
    activate(item, ctx) {
        ctx.openCard(MovieCard, { movie: item.movie });
    },
};
