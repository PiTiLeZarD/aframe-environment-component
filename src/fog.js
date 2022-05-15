export default {
    schema: {
        fog: { type: "float", default: 0, min: 0, max: 1 },
    },

    initFog: function () {
        this.userFog = this.el.sceneEl.getAttribute("fog");
    },

    updateFog: function () {
        // set fog color
        const sunPos = this.getSunPosition();
        if (this.environmentData.fog > 0) {
            this.el.sceneEl.setAttribute("fog", {
                color: this.getFogColor(this.environmentData.skyType, sunPos.y),
                far: (1.01 - this.environmentData.fog) * this.STAGE_SIZE * 2,
            });
        } else {
            this.el.sceneEl.removeAttribute("fog");
        }
        if (!this.environmentData.active) {
            if (this.userFog) {
                this.el.sceneEl.setAttribute("fog", this.userFog);
            } else {
                this.el.sceneEl.removeAttribute("fog");
            }
        }
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
};
