/**
 * The auditorium's stage curtain. Its button (Room3D.vue) is over its
 * valance while it's open and over all of it drawn shut: a tap draws it
 * shut across the stage, or open again, with a whoosh. While it's shut the
 * instruments behind it can't be played.
 */

/** Whether `item` stands behind a curtain `shut` holds drawn: it names
 * that curtain, so a room with two only hides what's behind the shut one. */
export function hiddenByCurtain(item, shut) {
    return Boolean(item.curtain && shut.has(item.curtain));
}

export default {
    activate(item, ctx) {
        ctx.drawCurtain(item.id);
        ctx.playSound("whoosh");
    },
};
