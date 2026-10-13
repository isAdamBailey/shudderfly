// What a modelled prop takes up against its wall, per unit of its size (a
// model is built one unit tall, three/models.js): `w` across, `d` out from
// the wall, and `top`, the height a thrown thing lands on. The model
// builds itself to these (three/fridge.js, three/oven.js), so its hit box
// (roomLayout.js itemBox) and what lands on it (useThrowables.js) can't
// drift from how it's drawn. Light, with no Three.js, for the layout maths.
export const FOOTPRINTS = {
    // A tall fridge: its doors' handles stand a little proud of `d`.
    fridge: { w: 0.48, d: 0.18, top: 1 },
    // A range: its cooktop is level with the counters' worktop
    // (GamesWorld::KITCHEN_COUNTER), its backguard up from there.
    oven: { w: 1.09, d: 0.4, top: 0.84 },
};
