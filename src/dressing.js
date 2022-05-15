export default {
    schema: {
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
    },
    initDressing: function () {
        this.dressing = document.createElement("a-entity");
        this.dressing.classList.add("environmentDressing");
        this.dressing.classList.add("environment");

        this.el.appendChild(this.dressing);
    },

    shouldUpdateDressing: function (oldData) {
        return (
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
        );
    },

    // updates set dressing
    updateDressing: function () {
        var dressing = new THREE.Object3D();
        this.dressing.setAttribute("visible", this.environmentData.dressing != "none");
        if (this.environmentData.dressing == "none") {
            return;
        }

        // get array of geometries
        let geoset;
        switch (this.environmentData.dressing) {
            case "cubes": {
                geoset = [new THREE.BoxGeometry(1, 1, 1)];
                geoset[0].applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0.5, 0));
                break;
            }
            case "pyramids": {
                geoset = [new THREE.ConeGeometry(1, 1, 4, 1, true)];
                geoset[0].applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0.5, 0));
                break;
            }
            case "cylinders": {
                geoset = [new THREE.CylinderGeometry(0.5, 0.5, 1, 8, 1, true)];
                geoset[0].applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0.5, 0));
                break;
            }
            default: {
                geoset = this.getAssetGeometry(this.assets[this.environmentData.dressing]);
                if (!geoset) return;
                break;
            }
        }

        const geometries = [];
        for (var i = 0, r = 88343; i < this.environmentData.dressingAmount; i++, r++) {
            const geo = geoset[Math.floor(this.random(33 + i) * geoset.length)].clone();

            // // change vertex colors
            // var color = new THREE.Color(0xffffff).multiplyScalar(1 - this.random(66 + i) * 0.3);

            // for (var f = 0, fl = geo.faces.length; f < fl; f++) {
            //     var face = geo.faces[f];
            //     for (var v = 0; v < 3; v++) {
            //         p = geo.vertices[face[faceindex[v]]]; // get vertex position
            //         var floorao = p.y / 4 + 0.75;
            //         face.vertexColors[v] = new THREE.Color(color.r * floorao, color.g * floorao, color.b * floorao);
            //     }
            // }

            // set random position, rotation and scale
            const ds = this.environmentData.dressingScale;
            const dv = new THREE.Vector3(
                this.environmentData.dressingVariance.x,
                this.environmentData.dressingVariance.y,
                this.environmentData.dressingVariance.z
            );
            const onPlayArea = this.random(r) < this.environmentData.dressingOnPlayArea;
            const distance = onPlayArea
                ? this.random(r + 1) * 15
                : 10 + Math.max(dv.x, dv.z) + 10 * this.random(r + 1) + (this.random(r + 2) * this.STAGE_SIZE) / 3;

            const direction = this.random(r + 3) * Math.PI * 2;
            const matrix = new THREE.Matrix4();
            const scale = this.random(r + 4);
            const uniformScale = this.environmentData.dressingUniformScale;

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
        const bufgeo = THREE.BufferGeometryUtils.mergeBufferGeometries(geometries);
        bufgeo.attributes.position.needsUpdate = true;

        // setup Materialial
        const material = new THREE.MeshLambertMaterial({
            color: new THREE.Color(this.environmentData.dressingColor),
        });

        // create mesh
        const mesh = new THREE.Mesh(bufgeo, material);
        dressing.add(mesh);
        // add to scene
        this.dressing.setObject3D("mesh", dressing);
    },

    // returns an array of THREE.Geometry for set dressing
    getAssetGeometry: function (data) {
        if (!data) return null;

        var geoset = [];
        var self = this;

        const applyNoise = (geo, noise) => {
            var verts = geo.attributes.position.array;
            var numVerts = verts.length;
            for (var i = 0; i < numVerts; i += 3) {
                verts[i] = (self.random(i) - 0.5) * noise;
                verts[i + 1] = (self.random(i + numVerts) - 0.5) * noise;
                verts[i + 2] = (self.random(i + numVerts * 2) - 0.5) * noise;
            }
            geo.attributes.position.needsUpdate = true;
        };

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
                geo = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
                geo.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)));
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
};
