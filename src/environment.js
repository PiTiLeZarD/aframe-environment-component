import * as perlin from "./PerlinNoise";
import presets from "./presets";
import assets from "./assets";
import ground from "./ground";
import sky from "./sky";
import stars from "./stars";
import dressing from "./dressing";
import grid from "./grid";
import hemilight from "./hemilight";
import sunlight from "./sunlight";
import fog from "./fog";

const environment = {
    ...ground,
    ...sky,
    ...stars,
    ...dressing,
    ...grid,
    ...hemilight,
    ...sunlight,
    ...fog,

    presets,
    assets,

    schema: {
        ...ground.schema,
        ...sky.schema,
        ...stars.schema,
        ...dressing.schema,
        ...grid.schema,
        ...fog.schema,

        active: { default: false },
        preset: presets.schema,
        seed: { type: "int", default: 1, min: 0, max: 1000 },

        horizonColor: { type: "color" },
        lighting: { default: "distant", oneOf: ["none", "distant", "point"] },
        shadow: { default: false },
        shadowSize: { default: 10 },
        lightPosition: { type: "vec3", default: { x: 0, y: 1, z: -0.2 } },

        flatShading: { default: false },
        playArea: { type: "float", default: 1, min: 0.5, max: 10 },
    },

    multiple: false,

    init: function () {
        this.environmentData = {};

        // stage ground diameter (and sky radius)
        this.STAGE_SIZE = 200;

        this.initSky();
        this.initStars();
        this.initGround();
        this.initDressing();
        this.initGrid();
        this.initHemilight();
        this.initSunlight();
        this.initFog();
    },

    update: function (oldDataNonPreset) {
        const oldData = !this.data.preset ? oldDataNonPreset : AFRAME.utils.extendDeep({}, this.environmentData);

        if (!this.data.preset) {
            this.environmentData = this.data;
        } else {
            this.environmentData = {};
            Object.assign(this.environmentData, this.data);
            Object.assign(this.environmentData, this.presets[this.data.preset]);
            Object.assign(this.environmentData, this.el.components.environment.attrValue);
        }

        this.updateSunlight();
        this.updateHemilight();
        this.updateFog();
        if (this.shouldUpdateSky(oldData)) {
            this.updateSky();
            this.updateStars();
        }
        if (this.shouldUpdateGround(oldData)) {
            this.updateGround(this.shouldUpdateGroundGeometry(oldData));
        }
        if (this.shouldUpdateDressing(oldData)) {
            this.updateDressing();
        }

        this.el.setAttribute("visible", this.environmentData.active);
    },

    // logs current parameters to console, for saving to a preset
    logPreset: function () {
        var str = "{";
        for (var i in this.schema) {
            if (i == "preset") continue;
            str += i + ": ";
            var type = this.schema[i].type;
            if (type == "vec3") {
                str +=
                    "{ x: " +
                    this.environmentData[i].x +
                    ", y: " +
                    this.environmentData[i].y +
                    ", z: " +
                    this.environmentData[i].z +
                    "}";
            } else if (type == "string" || type == "color") {
                str += '"' + this.environmentData[i] + '"';
            } else {
                str += this.environmentData[i];
            }
            str += ", ";
        }
        str += "}";
    },

    // dumps current component settings to console.
    dumpParametersDiff: function () {
        // trim number to 3 decimals
        function dec3(v) {
            return Math.floor(v * 1000) / 1000;
        }

        var params = [];
        var usingPreset = this.data.preset != "none" ? this.presets[this.data.preset] : false;

        if (usingPreset) {
            params.push("preset: " + this.data.preset);
        }

        for (var i in this.schema) {
            if (i == "preset" || (usingPreset && usingPreset[i] === undefined)) {
                continue;
            }
            var def = usingPreset ? usingPreset[i] : this.schema[i].default;
            var data = this.environmentData[i];
            var type = this.schema[i].type;
            if (type == "vec3") {
                var coords = def;
                if (typeof def == "string") {
                    def = def.split(" ");
                    coords = { x: def[0], y: def[1], z: def[2] };
                }
                if (
                    dec3(coords.x) != dec3(data.x) ||
                    dec3(coords.y) != dec3(data.y) ||
                    dec3(coords.z) != dec3(data.z)
                ) {
                    params.push(i + ": " + dec3(data.x) + " " + dec3(data.y) + " " + dec3(data.z));
                }
            } else {
                if (def != data) {
                    if (this.schema[i].type == "number") {
                        data = dec3(data);
                    }
                    params.push(i + ": " + data);
                }
            }
        }
        console.log(params);
    },

    // Custom Math.random() with seed. Given this.environmentData.seed and x, it always returns the same "random" number
    random: function (x) {
        return perlin.random(this.environmentData.seed, x);
    },
};

export default environment;
