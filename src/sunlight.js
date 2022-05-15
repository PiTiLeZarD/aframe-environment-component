export default {
    initSunlight: function () {
        this.sunlight = document.createElement("a-entity");
        this.sunlight.classList.add("environment");
        this.sunlight.setAttribute("position", this.data.lightPosition);
        this.sunlight.setAttribute("light", { intensity: 0.6 });

        // add everything to the scene
        this.el.appendChild(this.sunlight);
    },

    getSunPosition: function () {
        const sunPos = new THREE.Vector3(
            this.environmentData.lightPosition.x,
            this.environmentData.lightPosition.y,
            this.environmentData.lightPosition.z
        );
        sunPos.normalize();
        return sunPos;
    },

    updateSunlight: function () {
        const sunPos = this.getSunPosition();

        // update light colors and intensities
        if (this.sunlight) {
            this.sunlight.setAttribute("position", this.environmentData.lightPosition);
            if (this.environmentData.skyType != "atmosphere") {
                this.sunlight.setAttribute("light", { intensity: 0.6 });
            } else {
                this.sunlight.setAttribute("light", { intensity: 0.1 + sunPos.y * 0.5 });
            }

            this.sunlight.setAttribute("light", {
                type: this.environmentData.lighting == "point" ? "point" : "directional",
                castShadow: this.environmentData.shadow,
                shadowCameraLeft: -this.environmentData.shadowSize,
                shadowCameraBottom: -this.environmentData.shadowSize,
                shadowCameraRight: this.environmentData.shadowSize,
                shadowCameraTop: this.environmentData.shadowSize,
            });

            this.sunlight.setAttribute("visible", this.environmentData.lighting !== "none");
        }
    },
};
