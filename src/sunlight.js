export default {
    initSunlight: function () {
        this.sunlight = document.createElement("a-entity");
        this.sunlight.classList.add("environment");
        this.sunlight.setAttribute("position", this.data.lightPosition);
        this.sunlight.setAttribute("light", { intensity: 0.6 });

        // add everything to the scene
        this.el.appendChild(this.sunlight);
    },
};
