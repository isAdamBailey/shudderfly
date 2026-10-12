import { readFileSync } from "node:fs";

// For tests only (it reads the server's source): the world's lists that the
// server keeps too, held in step with it.
const php = readFileSync(`${process.cwd()}/app/Support/GamesWorld.php`, "utf8");

/** The names in GamesWorld's `const NAME = [...]`. */
export function serverList(name) {
    return php
        .match(new RegExp(`const ${name} = \\[([^\\]]*)\\]`))[1]
        .match(/'([a-z-]+)'/g)
        .map((id) => id.slice(1, -1));
}
