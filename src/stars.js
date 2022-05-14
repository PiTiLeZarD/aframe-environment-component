export default {
    schema: {},

    initStars: function () {
        this.stars = null;
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
