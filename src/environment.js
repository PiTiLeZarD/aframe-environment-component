import PerlinNoise from "./PerlinNoise";
import presets from "./presets";
import assets from "./assets";

const environment = {
    schema: {
        active: { default: false },
        preset: {
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
        seed: { type: "int", default: 1, min: 0, max: 1000 },

        skyType: { default: "color", oneOf: ["none", "color", "gradient", "atmosphere"] },
        skyColor: { type: "color" },
        horizonColor: { type: "color" },
        lighting: { default: "distant", oneOf: ["none", "distant", "point"] },
        shadow: { default: false },
        shadowSize: { default: 10 },
        lightPosition: { type: "vec3", default: { x: 0, y: 1, z: -0.2 } },
        fog: { type: "float", default: 0, min: 0, max: 1 },

        flatShading: { default: false },
        playArea: { type: "float", default: 1, min: 0.5, max: 10 },

        ground: { default: "hills", oneOf: ["none", "flat", "hills", "canyon", "spikes", "noise"] },
        groundYScale: { type: "float", default: 3, min: 0, max: 50 },
        groundTexture: { default: "none", oneOf: ["none", "checkerboard", "squares", "walkernoise"] },
        groundColor: { type: "color", default: "#553e35" },
        groundColor2: { type: "color", default: "#694439" },

        dressing: {
            default: "none",
            oneOf: [
                "none",
                "cubes",
                "pyramids",
                "cylinders",
                "hexagons",
                "stones",
                "trees",
                "mushrooms",
                "towers",
                "apparatus",
                "arches",
                "torii",
            ],
        },
        dressingAmount: { type: "int", default: 10, min: 0, max: 1000 },
        dressingColor: { type: "color", default: "#795449" },
        dressingScale: { type: "float", default: 5, min: 0, max: 100 },
        dressingVariance: { type: "vec3", default: { x: 1, y: 1, z: 1 } },
        dressingUniformScale: { default: true },
        dressingOnPlayArea: { type: "float", default: 0, min: 0, max: 1 },

        grid: { default: "none", oneOf: ["none", "1x1", "2x2", "crosses", "dots", "xlines", "ylines"] },
        gridColor: { type: "color", default: "#ccc" },
    },

    multiple: false,
    presets,

    init: function () {
        this.environmentData = {};

        // stage ground diameter (and sky radius)
        this.STAGE_SIZE = 200;

        // data for dressing meshes
        this.assets = assets;

        // scale down dressing meshes (coordinates were saved in integers for better compression)
        for (var i in this.assets) {
            for (var j = 0; j < this.assets[i].length; j++) {
                var asset = this.assets[i][j];
                if (asset.type != "mesh") continue;
                for (var v = 0, len = asset.vertices.length; v < len; v++) {
                    asset.vertices[v] /= 1000.0;
                }
            }
        }

        // save current scene fog
        this.userFog = this.el.sceneEl.getAttribute("fog");

        // create sky
        this.sky = document.createElement("a-sky");
        this.sky.setAttribute("radius", this.STAGE_SIZE);
        this.sky.setAttribute("theta-length", 110);
        this.sky.classList.add("environment");

        // stars are created when needed
        this.stars = null;

        // create ground
        this.groundMaterial = null;
        this.ground = document.createElement("a-entity");
        this.ground.setAttribute("rotation", "-90 0 0");
        this.ground.classList.add("environmentGround");
        this.ground.classList.add("environment");
        this.groundCanvas = null;
        this.groundTexture = null;
        this.groundMaterial = null;
        this.groundGeometry = null;

        this.dressing = document.createElement("a-entity");
        this.dressing.classList.add("environmentDressing");
        this.dressing.classList.add("environment");

        this.gridCanvas = null;
        this.gridTexture = null;

        // create lights (one ambient hemisphere light, and one directional for the sun)
        this.hemilight = document.createElement("a-entity");
        this.hemilight.classList.add("environment");
        this.hemilight.setAttribute("position", "0 50 0");
        this.hemilight.setAttribute("light", {
            type: "hemisphere",
            color: "#CEE4F0",
            intensity: 0.4,
        });
        this.sunlight = document.createElement("a-entity");
        this.sunlight.classList.add("environment");
        this.sunlight.setAttribute("position", this.data.lightPosition);
        this.sunlight.setAttribute("light", { intensity: 0.6 });

        // add everything to the scene
        this.el.appendChild(this.hemilight);
        this.el.appendChild(this.sunlight);
        this.el.appendChild(this.ground);
        this.el.appendChild(this.dressing);
        this.el.appendChild(this.sky);
    },

    // returns a fog color from a specific sky type and sun height
    getFogColor: function (skyType, sunHeight) {
        var fogColor;
        if (skyType == "color" || skyType == "none") {
            fogColor = new THREE.Color(this.environmentData.skyColor);
        } else if (skyType == "gradient") {
            fogColor = new THREE.Color(this.environmentData.horizonColor);
        } else if (skyType == "atmosphere") {
            var fogRatios = [1, 0.5, 0.22, 0.1, 0.05, 0];
            var fogColors = ["#C0CDCF", "#81ADC5", "#525e62", "#2a2d2d", "#141616", "#000"];

            if (sunHeight <= 0) return "#000";

            sunHeight = Math.min(1, sunHeight);

            for (var i = 0; i < fogRatios.length; i++) {
                if (sunHeight > fogRatios[i]) {
                    var c1 = new THREE.Color(fogColors[i - 1]);
                    var c2 = new THREE.Color(fogColors[i]);
                    var a = (sunHeight - fogRatios[i]) / (fogRatios[i - 1] - fogRatios[i]);
                    c2.lerp(c1, a);
                    fogColor = c2;
                    break;
                }
            }
        }
        // dim down the color
        fogColor.multiplyScalar(0.9);
        // mix it a bit with ground color
        fogColor.lerp(new THREE.Color(this.data.groundColor), 0.3);

        return "#" + fogColor.getHexString();
    },

    update: function (oldDataNonPreset) {
        var oldData;

        if (!this.data.preset) {
            oldData = oldDataNonPreset;
            this.environmentData = this.data;
        } else {
            oldData = AFRAME.utils.clone(this.environmentData);
            this.environmentData = {};
            Object.assign(this.environmentData, this.data);
            Object.assign(this.environmentData, this.presets[this.data.preset]);
            Object.assign(this.environmentData, this.el.components.environment.attrValue);
        }

        var skyType = this.environmentData.skyType;
        var sunPos = new THREE.Vector3(
            this.environmentData.lightPosition.x,
            this.environmentData.lightPosition.y,
            this.environmentData.lightPosition.z
        );
        sunPos.normalize();

        // update light colors and intensities
        if (this.sunlight) {
            this.sunlight.setAttribute("position", this.environmentData.lightPosition);
            if (skyType != "atmosphere") {
                // dim down the sky color for the light
                var skycol = new THREE.Color(this.environmentData.skyColor);
                skycol.r = (skycol.r + 1.0) / 2.0;
                skycol.g = (skycol.g + 1.0) / 2.0;
                skycol.b = (skycol.b + 1.0) / 2.0;
                this.hemilight.setAttribute("light", { color: "#" + skycol.getHexString() });
                this.sunlight.setAttribute("light", { intensity: 0.6 });
                this.hemilight.setAttribute("light", { intensity: 0.6 });
            } else {
                this.sunlight.setAttribute("light", { intensity: 0.1 + sunPos.y * 0.5 });
                this.hemilight.setAttribute("light", { intensity: 0.1 + sunPos.y * 0.5 });
            }

            this.sunlight.setAttribute("light", {
                castShadow: this.environmentData.shadow,
                shadowCameraLeft: -this.environmentData.shadowSize,
                shadowCameraBottom: -this.environmentData.shadowSize,
                shadowCameraRight: this.environmentData.shadowSize,
                shadowCameraTop: this.environmentData.shadowSize,
            });
        }

        // update sky colors
        if (
            skyType !== oldData.skyType ||
            this.environmentData.skyColor != oldData.skyColor ||
            this.environmentData.horizonColor != oldData.horizonColor
        ) {
            var mat = {};
            mat.shader = { none: "flat", color: "flat", gradient: "gradientshader", atmosphere: "skyshader" }[skyType];
            if (this.stars) {
                this.stars.setAttribute("visible", skyType == "atmosphere");
            }
            if (skyType == "color") {
                mat.color = this.environmentData.skyColor;
                mat.fog = false;
            } else if (skyType == "gradient") {
                mat.topColor = this.environmentData.skyColor;
                mat.bottomColor = this.environmentData.horizonColor;
            }

            this.sky.setAttribute("material", mat);
        }

        // set atmosphere sun position and stars
        if (skyType == "atmosphere") {
            this.sky.setAttribute("material", { sunPosition: sunPos });
            this.setStars((1 - Math.max(0, (sunPos.y + 0.08) * 8)) * 2000);
        }

        // set fog color
        if (this.environmentData.fog > 0) {
            this.el.sceneEl.setAttribute("fog", {
                color: this.getFogColor(skyType, sunPos.y),
                far: (1.01 - this.environmentData.fog) * this.STAGE_SIZE * 2,
            });
        } else {
            this.el.sceneEl.removeAttribute("fog");
        }

        // scene lights
        this.sunlight.setAttribute("light", {
            type: this.environmentData.lighting == "point" ? "point" : "directional",
        });
        this.sunlight.setAttribute("visible", this.environmentData.lighting !== "none");
        this.hemilight.setAttribute("visible", this.environmentData.lighting !== "none");

        // check if ground geometry needs to be calculated
        var updateGroundGeometry =
            !this.groundGeometry ||
            this.environmentData.seed != oldData.seed ||
            this.environmentData.ground != oldData.ground ||
            this.environmentData.playArea != oldData.playArea ||
            this.environmentData.flatShading != oldData.flatShading;

        // check if any parameter of the ground was changed, and update it
        if (
            updateGroundGeometry ||
            this.environmentData.groundColor != oldData.groundColor ||
            this.environmentData.groundColor2 != oldData.groundColor2 ||
            this.environmentData.groundYScale != oldData.groundYScale ||
            this.environmentData.groundTexture != oldData.groundTexture ||
            this.environmentData.gridColor != oldData.gridColor ||
            this.environmentData.grid != oldData.grid
        ) {
            this.updateGround(updateGroundGeometry);
            // set bounce light color to ground color
            if (this.hemilight) this.hemilight.setAttribute("light", { groundColor: this.environmentData.groundColor });
        }

        // update dressing
        if (
            this.environmentData.seed != oldData.seed ||
            this.environmentData.dressingOnPlayArea != oldData.dressingOnPlayArea ||
            this.environmentData.dressing != oldData.dressing ||
            this.environmentData.flatShading != oldData.flatShading ||
            this.environmentData.dressingAmount != oldData.dressingAmount ||
            this.environmentData.dressingScale != oldData.dressingScale ||
            this.environmentData.dressingColor != oldData.dressingColor ||
            this.environmentData.dressingVariance.x != oldData.dressingVariance.x ||
            this.environmentData.dressingVariance.y != oldData.dressingVariance.y ||
            this.environmentData.dressingVariance.z != oldData.dressingVariance.z ||
            this.environmentData.dressingUniformScale != oldData.dressingUniformScale
        ) {
            this.updateDressing();
        }

        this.sky.setAttribute("visible", skyType !== "none");

        this.el.setAttribute("visible", this.environmentData.active);
        if (!this.environmentData.active) {
            if (this.userFog) {
                this.el.sceneEl.setAttribute("fog", this.userFog);
            } else {
                this.el.sceneEl.removeAttribute("fog");
            }
        }

        // dump current component settings to console
        this.dumpParametersDiff();
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
    },

    // Custom Math.random() with seed. Given this.environmentData.seed and x, it always returns the same "random" number
    random: function (x) {
        return parseFloat(
            "0." +
                Math.sin(this.environmentData.seed * 9999 * x)
                    .toString()
                    .substr(7)
        );
    },

    // updates ground attributes, and geometry if required
    updateGround: function (updateGeometry) {
        var resolution = 64; // number of divisions of the ground mesh

        if (updateGeometry) {
            var visibleground = this.environmentData.ground != "none";
            this.ground.setAttribute("visible", visibleground);
            if (!visibleground) {
                return;
            }

            if (!this.groundGeometry) {
                this.groundGeometry = new THREE.PlaneGeometry(
                    this.STAGE_SIZE + 2,
                    this.STAGE_SIZE + 2,
                    resolution - 1,
                    resolution - 1
                );
            }
            var perlin = new PerlinNoise(this.environmentData.seed);
            var verts = this.groundGeometry.attributes.position.array;
            var numVerts = verts.length;
            var frequency = 10;
            var inc = frequency / resolution;
            var x = 0;
            var y = 0;

            for (var i = 2; i < numVerts; i += 3) {
                if (this.environmentData.ground == "flat") {
                    verts[i] = 0;
                    continue;
                }

                var h;
                switch (this.environmentData.ground) {
                    case "hills": {
                        h = Math.max(0, perlin.noise(x, y, 0));
                        break;
                    }
                    case "canyon": {
                        h = 0.2 + perlin.noise(x, y, 0) * 0.8;
                        h = Math.min(1, Math.pow(h, 2) * 10);
                        break;
                    }
                    case "spikes": {
                        h = this.random(i) < 0.02 ? this.random(i + 1) : 0;
                        break;
                    }
                    case "noise": {
                        h = this.random(i) < 0.35 ? this.random(i + 1) : 0;
                        break;
                    }
                }

                h += this.random(i + 2) * 0.1; // add some randomness

                // flat ground in the center
                var xx = (x * 2) / frequency - 1;
                var yy = (y * 2) / frequency - 1;
                var pa = this.environmentData.playArea;
                xx = Math.max(0, Math.min(1, (Math.abs(xx) - (pa - 0.9)) * (1 / pa)));
                yy = Math.max(0, Math.min(1, (Math.abs(yy) - (pa - 0.9)) * (1 / pa)));
                h *= xx > yy ? xx : yy;
                if (h < 0.01) h = 0; // stick to the floor

                // set height
                verts[i] = h;

                // calculate next x,y ground coordinates
                x += inc;
                if (x >= 10) {
                    x = 0;
                    y += inc;
                }
            }

            this.groundGeometry.computeVertexNormals();

            this.groundGeometry.attributes.position.needsUpdate = true;
            this.groundGeometry.attributes.normal.needsUpdate = true;
        }

        // apply Y scale. There's no need to recalculate the geometry for this. Just change scale
        this.ground.setAttribute("scale", { z: this.environmentData.groundYScale });

        // update ground, playarea and grid textures.
        var groundResolution = 2048;
        var texMeters = 20; // ground texture of 20 x 20 meters
        var texRepeat = this.STAGE_SIZE / texMeters;

        if (!this.groundCanvas || this.groundCanvas.width != groundResolution) {
            this.gridCanvas = document.createElement("canvas");
            this.gridCanvas.width = groundResolution;
            this.gridCanvas.height = groundResolution;
            this.gridTexture = new THREE.Texture(this.gridCanvas);
            this.gridTexture.wrapS = THREE.RepeatWrapping;
            this.gridTexture.wrapT = THREE.RepeatWrapping;
            this.gridTexture.repeat.set(texRepeat, texRepeat);

            this.groundCanvas = document.createElement("canvas");
            this.groundCanvas.width = groundResolution;
            this.groundCanvas.height = groundResolution;
            this.groundTexture = new THREE.Texture(this.groundCanvas);
            this.groundTexture.wrapS = THREE.RepeatWrapping;
            this.groundTexture.wrapT = THREE.RepeatWrapping;
            this.groundTexture.repeat.set(texRepeat, texRepeat);

            // ground material diffuse map is the regular ground texture and the grid texture
            // is used in the emissive map. This way, the grid is always equally visible, even at night.
            this.groundMaterialProps = {
                map: this.groundTexture,
                emissive: new THREE.Color(0xffffff),
                emissiveMap: this.gridTexture,
                flatShading: true,
                shininess: 0,
            };

            this.groundMaterial = new THREE.MeshPhongMaterial(this.groundMaterialProps);
        }

        var groundctx = this.groundCanvas.getContext("2d");
        var gridctx = this.gridCanvas.getContext("2d");

        this.drawTexture(groundctx, groundResolution, texMeters);

        gridctx.fillStyle = "#000000";
        gridctx.fillRect(0, 0, groundResolution, groundResolution);
        this.drawGrid(gridctx, groundResolution, texMeters);

        this.groundTexture.needsUpdate = true;
        this.gridTexture.needsUpdate = true;

        if (updateGeometry) {
            var mesh = new THREE.Mesh(this.groundGeometry, this.groundMaterial);
            this.ground.setObject3D("mesh", mesh);
        } else {
            this.ground.getObject3D("mesh").material = this.groundMaterial;
        }

        this.ground.setAttribute("shadow", {
            cast: false,
            receive: this.environmentData.shadow,
        });
    },

    // draw grid to a canvas context
    drawGrid: function (ctx, size, texMeters) {
        if (this.environmentData.grid == "none") return;

        // one grid feature each 2 meters

        var num = Math.floor(texMeters / 2);
        var step = size / (texMeters / 2); // 2 meters == <step> pixels
        var i, j, ii;

        ctx.fillStyle = this.environmentData.gridColor;

        switch (this.environmentData.grid) {
            case "1x1":
            case "2x2": {
                if (this.environmentData.grid == "1x1") {
                    num = num * 2;
                    step = size / texMeters;
                }
                for (i = 0; i < num; i++) {
                    ii = Math.floor(i * step);
                    ctx.fillRect(0, ii, size, 1);
                    ctx.fillRect(ii, 0, 1, size);
                }
                break;
            }
            case "crosses": {
                var l = Math.floor(step / 20);
                for (i = 0; i < num + 1; i++) {
                    ii = Math.floor(i * step);
                    for (j = 0; j < num + 1; j++) {
                        var jj = Math.floor(-l + j * step);
                        ctx.fillRect(jj, ii, l * 2, 1);
                        ctx.fillRect(ii, jj, 1, l * 2);
                    }
                }
                break;
            }
            case "dots": {
                for (i = 0; i < num + 1; i++) {
                    for (j = 0; j < num + 1; j++) {
                        ctx.beginPath();
                        ctx.arc(Math.floor(j * step), Math.floor(i * step), 4, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                break;
            }
            case "xlines": {
                for (i = 0; i < num; i++) {
                    ctx.fillRect(Math.floor(i * step), 0, 1, size);
                }
                break;
            }
            case "ylines": {
                for (i = 0; i < num; i++) {
                    ctx.fillRect(0, Math.floor(i * step), size, 1);
                }
                break;
            }
        }
    },

    // draw ground texture to a canvas context
    drawTexture: function (ctx, size, texMeters) {
        // fill all with ground Color
        ctx.fillStyle = this.environmentData.groundColor;
        ctx.fillRect(0, 0, size, size);

        var i, col, col1, col2, im, imdata, numpixels;

        if (this.environmentData.groundTexture == "none") return;
        switch (this.environmentData.groundTexture) {
            case "checkerboard": {
                ctx.fillStyle = this.environmentData.groundColor2;
                var num = Math.floor(texMeters / 2);
                var step = size / (texMeters / 2); // 2 meters == <step> pixels
                for (i = 0; i < num + 1; i += 2) {
                    for (var j = 0; j < num + 1; j++) {
                        ctx.fillRect(
                            Math.floor((i + (j % 2)) * step),
                            Math.floor(j * step),
                            Math.floor(step),
                            Math.floor(step)
                        );
                    }
                }
                break;
            }
            case "squares": {
                var numSquares = 16;
                var squareSize = size / numSquares;
                col1 = new THREE.Color(this.environmentData.groundColor);
                col2 = new THREE.Color(this.environmentData.groundColor2);
                for (i = 0; i < numSquares * numSquares; i++) {
                    col = this.random(i + 3) > 0.5 ? col1.clone() : col2.clone();
                    col.addScalar(this.random(i + 3) * 0.1 - 0.05);
                    ctx.fillStyle = "#" + col.getHexString();
                    ctx.fillRect(
                        (i % numSquares) * squareSize,
                        Math.floor(i / numSquares) * squareSize,
                        squareSize,
                        squareSize
                    );
                }
                break;
            }
            case "noise": {
                // TODO: fix
                imdata = ctx.getImageData(0, 0, size, size);
                im = imdata.data;
                col1 = new THREE.Color(this.environmentData.groundColor);
                col2 = new THREE.Color(this.environmentData.groundColor2);
                var diff = new THREE.Color(col2.r - col1.r, col2.g - col1.g, col2.b - col1.b);
                var perlin = new PerlinNoise();
                for (i = 0, j = 0, numpixels = im.length; i < numpixels; i += 4, j++) {
                    var rnd = perlin.noise(((j % size) / size) * 3, (j / size / size) * 3, 0);
                    im[i + 0] = Math.floor((col1.r + diff.r * rnd) * 255);
                    im[i + 1] = Math.floor((col1.g + diff.g * rnd) * 255);
                    im[i + 2] = Math.floor((col1.b + diff.b * rnd) * 255);
                }
                ctx.putImageData(imdata, 0, 0);
                break;
            }
            case "walkernoise": {
                var s = Math.floor(size / 2);
                var tex = document.createElement("canvas");
                tex.width = s;
                tex.height = s;
                var texctx = tex.getContext("2d");
                texctx.fillStyle = this.environmentData.groundColor;
                texctx.fillRect(0, 0, s, s);
                imdata = texctx.getImageData(0, 0, s, s);
                im = imdata.data;
                col1 = new THREE.Color(this.environmentData.groundColor);
                col2 = new THREE.Color(this.environmentData.groundColor2);
                var walkers = [];
                var numwalkers = 1000;
                for (i = 0; i < numwalkers; i++) {
                    col = col1.clone().lerp(col2, Math.random());
                    walkers.push({
                        x: Math.random() * s,
                        y: Math.random() * s,
                        r: Math.floor(col.r * 255),
                        g: Math.floor(col.g * 255),
                        b: Math.floor(col.b * 255),
                    });
                }
                var iterations = 5000;
                for (var it = 0; it < iterations; it++) {
                    for (i = 0; i < numwalkers; i++) {
                        var walker = walkers[i];
                        var pos = Math.floor(walker.y * s + walker.x) * 4;
                        im[pos + 0] = walker.r;
                        im[pos + 1] = walker.g;
                        im[pos + 2] = walker.b;
                        walker.x += Math.floor(Math.random() * 3) - 1;
                        walker.y += Math.floor(Math.random() * 3) - 1;
                        if (walker.x >= s) walker.x = walker.x - s;
                        if (walker.y >= s) walker.y = walker.y - s;
                        if (walker.x < 0) walker.x = s + walker.x;
                        if (walker.y < 0) walker.y = s + walker.y;
                    }
                }
                texctx.putImageData(imdata, 0, 0);
                ctx.drawImage(tex, 0, 0, size, size);
                break;
            }
        }
    },

    // returns an array of THREE.Geometry for set dressing
    getAssetGeometry: function (data) {
        if (!data) return null;
        var geoset = [];
        var self = this;
        function applyNoise(geo, noise) {
            var n = new THREE.Vector3();
            var verts = geo.attributes.position.array;
            var numVerts = verts.length;
            for (var i = 0; i < numVerts; i += 3) {
                verts[i] = (self.random(i) - 0.5) * noise;
                verts[i + 1] = (self.random(i + numVerts) - 0.5) * noise;
                verts[i + 2] = (self.random(i + numVerts * 2) - 0.5) * noise;
            }
            geo.attributes.position.needsUpdate = true;
        }

        var i, geo, verts;

        for (var j = 0; j < data.length; j++) {
            if (data[j].type == "lathe") {
                var maxy = -99999;
                var points = [];
                verts = data[j].vertices;
                for (i = 0; i < verts.length; i += 2) {
                    points.push(new THREE.Vector2(verts[i], verts[i + 1]));
                    if (verts[i + 1] > maxy) {
                        maxy = verts[i + 1];
                    }
                }
                geo = new THREE.LatheGeometry(points, data[j]["segments"] || 8);
                geo.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-Math.PI, 0, 0)));
                geo.applyMatrix4(new THREE.Matrix4().makeTranslation(0, maxy, 0));
                //if (data[j]['noise']) applyNoise(geo, data[j].noise);
                geo = geo.toNonIndexed();
                geoset.push(geo);
            } else if (data[j].type == "extrude") {
                var shape = new THREE.Shape();
                verts = data[j].vertices;
                for (i = 0; i < verts.length; i += 2) {
                    if (i == 0) shape.moveTo(verts[i], verts[i + 1]);
                    else shape.lineTo(verts[i], verts[i + 1]);
                }
                geo = new THREE.ExtrudeGeometry(shape, { amount: 1, bevelEnabled: false });
                geo.applyMatrix(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)));
                if (data[j]["noise"]) applyNoise(geo, data[j].noise);
                geoset.push(geo);
            } else if (data[j].type == "mesh") {
                geo = new THREE.BufferGeometry();
                verts = data[j].vertices;
                var faces = data[j].faces;
                var positions = new Float32Array(verts);

                geo.setIndex(faces);
                geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

                if (data[j]["mirror"]) {
                    var mirroredGeo = geo.clone();
                    mirroredGeo.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0, Math.PI, 0)));
                    geo = THREE.BufferGeometryUtils.mergeBufferGeometries([geo, mirroredGeo]);
                }

                if (data[j]["noise"]) applyNoise(geo, data[j].noise);

                geo = geo.toNonIndexed();
                geo.computeVertexNormals();
                geoset.push(geo);
            }
        }
        return geoset;
    },

    // updates set dressing
    updateDressing: function () {
        var dressing = new THREE.Object3D();
        var geometries = [];
        this.dressing.setAttribute("visible", this.environmentData.dressing != "none");
        if (this.environmentData.dressing == "none") {
            return;
        }

        // get array of geometries
        var geoset;
        switch (this.environmentData.dressing) {
            case "cubes": {
                geoset = [new THREE.BoxGeometry(1, 1, 1)];
                geoset[0].applyMatrix(new THREE.Matrix4().makeTranslation(0, 0.5, 0));
                break;
            }
            case "pyramids": {
                geoset = [new THREE.ConeGeometry(1, 1, 4, 1, true)];
                geoset[0].applyMatrix(new THREE.Matrix4().makeTranslation(0, 0.5, 0));
                break;
            }
            case "cylinders": {
                geoset = [new THREE.CylinderGeometry(0.5, 0.5, 1, 8, 1, true)];
                geoset[0].applyMatrix(new THREE.Matrix4().makeTranslation(0, 0.5, 0));
                break;
            }
            default: {
                geoset = this.getAssetGeometry(this.assets[this.environmentData.dressing]);
                if (!geoset) return;
                break;
            }
        }

        for (var i = 0, r = 88343; i < this.environmentData.dressingAmount; i++, r++) {
            var clone = geoset[Math.floor(this.random(33 + i) * geoset.length)].clone;
            var geo = geoset[Math.floor(this.random(33 + i) * geoset.length)].clone();
            /*
      // change vertex colors
      var color = new THREE.Color(0xFFFFFF).multiplyScalar(1 - this.random(66 + i) * 0.3);

      for (var f = 0, fl = geo.faces.length; f < fl; f++) {
        var face = geo.faces[f];
        for (var v = 0; v < 3; v++) {
          p = geo.vertices[face[faceindex[v]]]; // get vertex position
          var floorao =  p.y / 4 + 0.75;
          face.vertexColors[v] = new THREE.Color(color.r * floorao, color.g * floorao, color.b * floorao);
        }
      }
*/
            // set random position, rotation and scale
            var ds = this.environmentData.dressingScale;
            var dv = new THREE.Vector3(
                this.environmentData.dressingVariance.x,
                this.environmentData.dressingVariance.y,
                this.environmentData.dressingVariance.z
            );
            var distance;
            var onPlayArea = this.random(r) < this.environmentData.dressingOnPlayArea;
            if (onPlayArea) {
                distance = this.random(r + 1) * 15;
            } else {
                distance =
                    10 + Math.max(dv.x, dv.z) + 10 * this.random(r + 1) + (this.random(r + 2) * this.STAGE_SIZE) / 3;
            }

            var direction = this.random(r + 3) * Math.PI * 2;
            var matrix = new THREE.Matrix4();
            var scale = this.random(r + 4);
            var uniformScale = this.environmentData.dressingUniformScale;

            matrix.compose(
                // position
                new THREE.Vector3(Math.cos(direction) * distance, 0, Math.sin(direction) * distance),
                // rotation
                new THREE.Quaternion().setFromAxisAngle(
                    new THREE.Vector3(0, 1, 0),
                    (this.random(r + 5) - 0.5) * dv.length() * Math.PI * 2
                ),
                // scale
                new THREE.Vector3(
                    ds + (uniformScale ? scale : this.random(r + 6)) * dv.x,
                    ds + (uniformScale ? scale : this.random(r + 7)) * dv.y,
                    ds + (uniformScale ? scale : this.random(r + 8)) * dv.z
                )
            );
            geo.applyMatrix4(matrix);
            geometries.push(geo);
        }

        // convert geometry to buffergeometry
        var bufgeo = THREE.BufferGeometryUtils.mergeBufferGeometries(geometries);
        bufgeo.attributes.position.needsUpdate = true;

        // setup Materialial
        var material = new THREE.MeshLambertMaterial({
            color: new THREE.Color(this.environmentData.dressingColor),
        });

        // create mesh
        var mesh = new THREE.Mesh(bufgeo, material);
        dressing.add(mesh);
        // add to scene
        this.dressing.setObject3D("mesh", dressing);
    },

    // initializes the BufferGeometry for the stars
    createStars: function () {
        var numStars = 2000;
        var geometry = new THREE.BufferGeometry();
        var positions = new Float32Array(numStars * 3);
        var radius = this.STAGE_SIZE - 1;
        var v = new THREE.Vector3();
        for (var i = 0; i < positions.length; i += 3) {
            v.set(this.random(i + 23) - 0.5, this.random(i + 24), this.random(i + 25) - 0.5);
            v.normalize();
            v.multiplyScalar(radius);
            positions[i] = v.x;
            positions[i + 1] = v.y;
            positions[i + 2] = v.z;
        }
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setDrawRange(0, 0); // don't draw any yet
        var material = new THREE.PointsMaterial({ size: 0.01, color: 0xcccccc, fog: false });
        this.stars.setObject3D("mesh", new THREE.Points(geometry, material));
    },

    // Sets the number of stars visible. Calls createStars() to initialize if needed.
    setStars: function (numStars) {
        if (!this.stars) {
            this.stars = document.createElement("a-entity");
            this.stars.id = "stars";
            this.createStars();
            this.el.appendChild(this.stars);
        }
        numStars = Math.floor(Math.min(2000, Math.max(0, numStars)));
        this.stars.getObject3D("mesh").geometry.setDrawRange(0, numStars);
    },
};

export default environment;
