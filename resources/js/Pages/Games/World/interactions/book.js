import BookCard from "../components/BookCard.vue";

/**
 * A book on a Library shelf (scenes/bookshelf.js). Like a game, it asks
 * first: reading it leaves the world, so its card (cover, title, excerpt,
 * read aloud) stands between the tap and the book.
 */
export default {
    activate(item, ctx) {
        ctx.openCard(BookCard, { book: item.book });
    },
};
