export default {
    schema: {
        grid: { default: "none", oneOf: ["none", "1x1", "2x2", "crosses", "dots", "xlines", "ylines"] },
        gridColor: { type: "color", default: "#ccc" },
    },

    initGrid: function () {
        this.gridCanvas = null;
        this.gridTexture = null;
    },

    // draw grid to a canvas context
    drawGrid: function (ctx, size, texMeters) {
        if (this.environmentData.grid == "none") return;

        // one grid feature each 2 meters

        var num = Math.floor(texMeters / 2);
        var step = size / (texMeters / 2); // 2 meters == <step> pixels
        var i, j, ii;

        ctx.fillStyle = this.environmentData.gridColor;

        switch (this.environmentData.grid) {
            case "1x1":
            case "2x2": {
                if (this.environmentData.grid == "1x1") {
                    num = num * 2;
                    step = size / texMeters;
                }
                for (i = 0; i < num; i++) {
                    ii = Math.floor(i * step);
                    ctx.fillRect(0, ii, size, 1);
                    ctx.fillRect(ii, 0, 1, size);
                }
                break;
            }
            case "crosses": {
                var l = Math.floor(step / 20);
                for (i = 0; i < num + 1; i++) {
                    ii = Math.floor(i * step);
                    for (j = 0; j < num + 1; j++) {
                        var jj = Math.floor(-l + j * step);
                        ctx.fillRect(jj, ii, l * 2, 1);
                        ctx.fillRect(ii, jj, 1, l * 2);
                    }
                }
                break;
            }
            case "dots": {
                for (i = 0; i < num + 1; i++) {
                    for (j = 0; j < num + 1; j++) {
                        ctx.beginPath();
                        ctx.arc(Math.floor(j * step), Math.floor(i * step), 4, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                break;
            }
            case "xlines": {
                for (i = 0; i < num; i++) {
                    ctx.fillRect(Math.floor(i * step), 0, 1, size);
                }
                break;
            }
            case "ylines": {
                for (i = 0; i < num; i++) {
                    ctx.fillRect(0, Math.floor(i * step), size, 1);
                }
                break;
            }
        }
    },
};
