import * as THREE from "three";
import { easeOutQuad, lerp } from "../utils/math.js";

export function createLightingSystem(scene) {
  const hemi = new THREE.HemisphereLight(0xffffff, 0x203040, 0.9);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(4, 9, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -8;
  sun.shadow.camera.right = 8;
  sun.shadow.camera.top = 8;
  sun.shadow.camera.bottom = -8;
  scene.add(sun);

  const nightLamp = new THREE.PointLight(0x8ab4ff, 0.0, 22, 2);
  nightLamp.position.set(0, 4.5, 0);
  scene.add(nightLamp);

  function applyTimeOfDay(isNight, animate = true) {
    document.body.classList.toggle("night", isNight);
    document.body.classList.toggle("day", !isNight);
    const target = isNight
      ? { bg: 0x050812, hemi: 0.25, sun: 0.05, lamp: 1.15 }
      : { bg: 0xbfe9ff, hemi: 0.9,  sun: 1.2,  lamp: 0.0 };

    if (!animate) {
      scene.background = new THREE.Color(target.bg);
      hemi.intensity = target.hemi;
      sun.intensity = target.sun;
      nightLamp.intensity = target.lamp;
      return;
    }

    const start = performance.now();
    const dur = 260;
    const from = {
      hemi: hemi.intensity,
      sun: sun.intensity,
      lamp: nightLamp.intensity,
      bg: scene.background ? scene.background.getHex() : 0x07101e
    };

    function tick(now) {
      const t = Math.min(1, (now - start) / dur);
      const e = easeOutQuad(t);
      hemi.intensity = lerp(from.hemi, target.hemi, e);
      sun.intensity = lerp(from.sun, target.sun, e);
      nightLamp.intensity = lerp(from.lamp, target.lamp, e);

      const bg = new THREE.Color(from.bg).lerp(new THREE.Color(target.bg), e);
      scene.background = bg;

      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  return {
    lights: { hemi, sun, nightLamp },
    applyTimeOfDay
  };
}
