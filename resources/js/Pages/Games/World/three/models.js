import { radioModel } from "./antiqueRadio.js";
import { armchairModel } from "./armchair.js";
import { fridgeModel } from "./fridge.js";
import { grandfatherClockModel } from "./grandfatherClock.js";
import { ovenModel } from "./oven.js";
import { slotMachineModel } from "./slotMachine.js";
import { spotlightModel } from "./spotlight.js";
import { tableLampModel } from "./tableLamp.js";
import { washingMachineModel } from "./washingMachine.js";

// Props modelled in 3D, by the name an interactable's `model` gives
// (GamesWorld::MODELS; a test keeps the lists in step). Each builds a
// Group one unit tall standing on y = 0, for the cast kit's modelMesh().
// In its userData a model may offer `setOn(on)`, lighting it up (a radio's
// dial while it plays, a lamp's shade while its light is on), and a lamp
// `bulb`: where its light hangs, as a share of its height.
export const MODELS = {
    radio: radioModel,
    "table-lamp": tableLampModel,
    "slot-machine": slotMachineModel,
    fridge: fridgeModel,
    oven: ovenModel,
    "washing-machine": washingMachineModel,
    "grandfather-clock": grandfatherClockModel,
    armchair: armchairModel,
    spotlight: spotlightModel,
};
