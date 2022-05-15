export default {
    schema: {
        skyType: { default: "color", oneOf: ["none", "color", "gradient", "atmosphere"] },
        skyColor: { type: "color" },
    },

    initSky: function () {
        // create sky
        this.sky = document.createElement("a-sky");
        this.sky.setAttribute("radius", this.STAGE_SIZE);
        this.sky.setAttribute("theta-length", 110);
        this.sky.classList.add("environment");

        this.el.appendChild(this.sky);
    },

    shouldUpdateSky: function (oldData) {
        return (
            this.environmentData.skyType !== oldData.skyType ||
            this.environmentData.skyColor != oldData.skyColor ||
            this.environmentData.horizonColor != oldData.horizonColor
        );
    },

    updateSky: function () {
        const skyType = this.environmentData.skyType;
        const mat = {};
        mat.shader = { none: "flat", color: "flat", gradient: "gradientshader", atmosphere: "skyshader" }[skyType];
        if (skyType == "color") {
            mat.color = this.environmentData.skyColor;
            mat.fog = false;
        } else if (skyType == "gradient") {
            mat.topColor = this.environmentData.skyColor;
            mat.bottomColor = this.environmentData.horizonColor;
        }
        this.sky.setAttribute("material", mat);
        if (skyType == "atmosphere") {
            this.sky.setAttribute("material", "sunPosition", this.getSunPosition());
        }
        this.sky.setAttribute("visible", skyType !== "none");
    },
};
