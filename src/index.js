/* global AFRAME, THREE */
import environment from "./environment";
import skyshader from "./skyshader";
import gradientshader from "./gradientshader";

if (typeof AFRAME === "undefined") {
    throw new Error("Component attempted to register before AFRAME was available.");
}

/**
 * enviroGetSettings() - console function for printing out the current environment settings
 */
const enviroGetSettings = () => {
    document.querySelector("[environment]").components["environment"].logPreset();
};

AFRAME.registerComponent("environment", environment);
AFRAME.registerShader("skyshader", skyshader);
AFRAME.registerShader("gradientshader", gradientshader);

const el = document.getElementById("environment");
el.setAttribute("environment", el.getAttribute("environment") ?? { preset: "forest" });
