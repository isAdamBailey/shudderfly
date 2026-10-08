/**
 * `map[key]` if `key` is `map`'s own, else undefined: a lookup by a name from
 * data (a scene's look, a sound) can't reach Object.prototype through
 * "constructor" or "toString". hasOwnProperty rather than Object.hasOwn,
 * which iOS Safari < 15.4 lacks.
 */
export function own(map, key) {
    return Object.prototype.hasOwnProperty.call(map, key)
        ? map[key]
        : undefined;
}
