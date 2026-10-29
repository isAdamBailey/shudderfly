// What a modelled prop takes up against its wall, per unit of its size (a
// model is built one unit tall, three/models.js): `w` across, `d` out from
// the wall, and `top`, the height a thrown thing lands on. The model
// builds itself to these (three/fridge.js, three/oven.js,
// three/washingMachine.js, three/grandfatherClock.js, three/armchair.js),
// so its hit box (roomLayout.js itemBox) and what lands on it
// (useThrowables.js) can't drift from how it's drawn. Light, with no Three.js, for the layout maths.
export const FOOTPRINTS = {
    // A tall fridge: its doors' handles stand a little proud of `d`.
    fridge: { w: 0.48, d: 0.18, top: 1 },
    // A range: its cooktop is level with the counters' worktop
    // (GamesWorld::KITCHEN_COUNTER), its backguard up from there.
    oven: { w: 1.09, d: 0.4, top: 0.84 },
    // A front-loading washer, its door's rim a little proud of `d`.
    "washing-machine": { w: 0.7, d: 0.36, top: 1 },
    // A tall case clock, its hood the deepest of it.
    "grandfather-clock": { w: 0.3, d: 0.14, top: 1 },
    // A wingback, across its rolled arms, shallow enough that the Butt
    // never walks into it, its cushion a little proud of `d`. A thrown
    // thing lands on its back, as a footprint is one block.
    armchair: { w: 0.8, d: 0.3, top: 1 },
    // A close-coupled toilet, with its bowl and seat projecting from the wall.
    toilet: { w: 0.62, d: 0.48, top: 0.48 },
    // A long enamel tub with its faucet and raised ledge against the wall.
    bathtub: { w: 1.35, d: 1, top: 0.62 },
    // Wall-mounted toilet roll and its holder.
    "toilet-roll": { w: 0.45, d: 0.23, top: 1 },
};
