import defaultPreset from "./default";
import contactPreset from "./contact";
import egyptPreset from "./egypt";
import checkerboardPreset from "./checkerboard";
import forestPreset from "./forest";
import goalandPreset from "./goaland";
import yavapaiPreset from "./yavapai";
import goldminePreset from "./goldmine";
import threetowersPreset from "./threetowers";
import poisonPreset from "./poison";
import archesPreset from "./arches";
import tronPreset from "./tron";
import japanPreset from "./japan";
import dreamPreset from "./dream";
import volcanoPreset from "./volcano";
import starryPreset from "./starry";
import osirisPreset from "./osiris";
import moonPreset from "./moon";

export default {
    none: {},
    default: defaultPreset,
    contact: contactPreset,
    egypt: egyptPreset,
    checkerboard: checkerboardPreset,
    forest: forestPreset,
    goaland: goalandPreset,
    yavapai: yavapaiPreset,
    goldmine: goldminePreset,
    threetowers: threetowersPreset,
    poison: poisonPreset,
    arches: archesPreset,
    tron: tronPreset,
    japan: japanPreset,
    dream: dreamPreset,
    volcano: volcanoPreset,
    starry: starryPreset,
    osiris: osirisPreset,
    moon: moonPreset,
    schema: {
        default: "default",
        oneOf: [
            "none",
            "default",
            "contact",
            "egypt",
            "checkerboard",
            "forest",
            "goaland",
            "yavapai",
            "goldmine",
            "arches",
            "threetowers",
            "poison",
            "tron",
            "japan",
            "dream",
            "volcano",
            "starry",
            "osiris",
        ],
    },
};
