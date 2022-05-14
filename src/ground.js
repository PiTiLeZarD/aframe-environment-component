import * as perlin from "./PerlinNoise";

export default {
    schema: {
        ground: { default: "hills", oneOf: ["none", "flat", "hills", "canyon", "spikes", "noise"] },
        groundYScale: { type: "float", default: 3, min: 0, max: 50 },
        groundTexture: { default: "none", oneOf: ["none", "checkerboard", "squares", "walkernoise"] },
        groundColor: { type: "color", default: "#553e35" },
        groundColor2: { type: "color", default: "#694439" },
    },

    initGround: function () {
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

        this.el.appendChild(this.ground);
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
            var perlinSeed = perlin.seed(this.environmentData.seed);
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
                        h = Math.max(0, perlin.noise(perlinSeed, x, y, 0));
                        break;
                    }
                    case "canyon": {
                        h = 0.2 + perlin.noise(perlinSeed, x, y, 0) * 0.8;
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
                const perlinSeed = perlin.seed();
                for (i = 0, j = 0, numpixels = im.length; i < numpixels; i += 4, j++) {
                    var rnd = perlin.noise(perlinSeed, ((j % size) / size) * 3, (j / size / size) * 3, 0);
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
};
