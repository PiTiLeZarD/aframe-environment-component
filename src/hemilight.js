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
};
