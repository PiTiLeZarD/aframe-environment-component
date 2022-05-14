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
};
