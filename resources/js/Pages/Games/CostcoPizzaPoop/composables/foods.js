import { PIZZA } from "@/constants/characters.js";
import PepperoniGlyph from "../components/PepperoniGlyph.vue";

// What the face can eat. To add one, add an entry here and its `label` to
// all three language files: the picker, the drag tray, the stomach intro and
// the Gusters following him all draw it from this list. A food is either an
// `emoji` or a `glyph`, a component drawing it inside a 100x100 box with no
// <svg> of its own (see PepperoniGlyph.vue).
export const FOODS = [
    {
        id: "pizza",
        label: "games.costco_pizza_poop.pizza_slice",
        emoji: PIZZA,
    },
    {
        id: "pepperoni",
        label: "games.costco_pizza_poop.pepperoni_stick",
        glyph: PepperoniGlyph,
    },
    {
        id: "hot_dog",
        label: "games.costco_pizza_poop.hot_dog",
        emoji: "🌭",
    },
];

// How many of the chosen food the face eats.
export const FEED_COUNT = 3;

export function findFood(id) {
    return FOODS.find((food) => food.id === id) ?? FOODS[0];
}
