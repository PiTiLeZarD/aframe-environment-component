import arches from "./arches";
import stones from "./stones";
import torii from "./torii";
import hexagons from "./hexagons";
import towers from "./towers";
import trees from "./trees";
import apparatus from "./apparatus";
import mushrooms from "./mushrooms";

// scale down dressing meshes (coordinates were saved in integers for better compression)
const scaleDown = (asset) =>
    asset.map((geometry) =>
        geometry.type == "mesh" ? { ...geometry, vertices: geometry.vertices.map((v) => v / 1000.0) } : geometry
    );

export default {
    arches: scaleDown(arches),
    stones: scaleDown(stones),
    torii: scaleDown(torii),
    hexagons: scaleDown(hexagons),
    towers: scaleDown(towers),
    trees: scaleDown(trees),
    apparatus: scaleDown(apparatus),
    mushrooms: scaleDown(mushrooms),
};
