export default {
    initHemilight: function () {
        this.hemilight = document.createElement("a-entity");
        this.hemilight.classList.add("environment");
        this.hemilight.setAttribute("position", "0 50 0");
        this.hemilight.setAttribute("light", {
            type: "hemisphere",
            color: "#CEE4F0",
            intensity: 0.4,
        });

        this.el.appendChild(this.hemilight);
    },

    updateHemilight: function () {
        if (this.sunlight && this.hemilight) {
            if (this.environmentData.skyType != "atmosphere") {
                var skycol = new THREE.Color(this.environmentData.skyColor);
                skycol.r = (skycol.r + 1.0) / 2.0;
                skycol.g = (skycol.g + 1.0) / 2.0;
                skycol.b = (skycol.b + 1.0) / 2.0;
                this.hemilight.setAttribute("light", { color: "#" + skycol.getHexString(), intensity: 0.6 });
            } else {
                this.hemilight.setAttribute("light", { intensity: 0.1 + this.getSunPosition().y * 0.5 });
            }

            this.hemilight.setAttribute("visible", this.environmentData.lighting !== "none");
            this.hemilight.setAttribute("light", { groundColor: this.environmentData.groundColor });
        }
    },
};
