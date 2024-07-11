import { VRButton } from "three/examples/jsm/Addons.js";
import { preserveOnce } from "./hmr/preserve";
import { renderer } from "./renderer";

renderer.xr.enabled = true;

preserveOnce("vrButton", () =>
  document.body.appendChild(VRButton.createButton(renderer))
);

preserveOnce("requestAnimationFrame", () => {
  const oldRequestAnimationFrame = window.requestAnimationFrame;
  const oldCancelAnimationFrame = window.cancelAnimationFrame;
  renderer.xr.addEventListener("sessionstart", () => {
    const session = renderer.xr.getSession()!;
    window.requestAnimationFrame = (...args) =>
      session.requestAnimationFrame(...args);
    window.cancelAnimationFrame = (...args) =>
      session.cancelAnimationFrame(...args);
  });
  renderer.xr.addEventListener("sessionend", () => {
    window.requestAnimationFrame = oldRequestAnimationFrame;
    window.cancelAnimationFrame = oldCancelAnimationFrame;
  });
  return true;
});
