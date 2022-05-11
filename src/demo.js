AFRAME.registerComponent("overlay-visibility", {
    init: function () {
        if (!this.el.isMobile) {
            document.querySelector("#about").style.display = "block";
        }
    },
});

AFRAME.registerComponent("preset-switcher", {
    init: function () {
        var el = this.el;
        var presets = [
            "forest",
            "default",
            "contact",
            "egypt",
            "checkerboard",
            "goaland",
            "yavapai",
            "goldmine",
            "threetowers",
            "poison",
            "arches",
            "tron",
            "japan",
            "dream",
            "volcano",
            "starry",
            "osiris",
        ];
        var preset = 0;

        window.addEventListener("keydown", function (evt) {
            if (evt.keyCode == 32) {
                nextPreset(1);
            }
        });

        document.querySelector(".previousPreset").addEventListener("click", function () {
            nextPreset(-1);
        });

        document.querySelector(".nextPreset").addEventListener("click", function () {
            nextPreset(1);
        });

        function nextPreset(dir) {
            if (preset === 0 && dir === -1) {
                preset = presets.length - 1;
            } else {
                preset = (preset + dir) % presets.length;
            }
            document.querySelector("h1 b").innerHTML = presets[preset];
            el.setAttribute("environment", { preset: presets[preset] });
        }
    },
});
