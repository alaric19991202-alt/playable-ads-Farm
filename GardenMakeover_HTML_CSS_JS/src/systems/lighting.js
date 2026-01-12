import * as THREE from "three";

export function createLighting(scene, { shadowMapSize = 1024 } = {}) {
  let isNight = false;

  const hemi = new THREE.HemisphereLight(0xffffff, 0x203040, 0.95);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(4, 9, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  sun.shadow.camera.left = -10;
  sun.shadow.camera.right = 10;
  sun.shadow.camera.top = 10;
  sun.shadow.camera.bottom = -10;
  scene.add(sun);

  const nightLamp = new THREE.PointLight(0x8ab4ff, 0.0, 22, 2);
  nightLamp.position.set(0, 4.5, 0);
  scene.add(nightLamp);

  function applyTimeOfDay(animate = true) {
    document.body.classList.toggle("night", isNight);

    const target = isNight
      ? { bg: 0x061225, hemi: 0.28, sun: 0.08, lamp: 1.15, fog: 0x071425 }
      : { bg: 0xd7f6ff, hemi: 0.95, sun: 1.2, lamp: 0.0, fog: 0xe8fbff };

    if (!animate) {
      scene.background = new THREE.Color(target.bg);
      scene.fog.color = new THREE.Color(target.fog);
      hemi.intensity = target.hemi;
      sun.intensity = target.sun;
      nightLamp.intensity = target.lamp;
      return;
    }

    const from = {
      hemi: hemi.intensity,
      sun: sun.intensity,
      lamp: nightLamp.intensity,
      bg: scene.background?.getHex() ?? 0xd7f6ff,
      fog: scene.fog?.color?.getHex() ?? 0xe8fbff
    };
    const start = performance.now();
    const dur = 260;

    function easeOutQuad(t) { return t * (2 - t); }
    function lerp(a, b, t) { return a + (b - a) * t; }

    function tick(now) {
      const t = Math.min(1, (now - start) / dur);
      const e = easeOutQuad(t);

      hemi.intensity = lerp(from.hemi, target.hemi, e);
      sun.intensity = lerp(from.sun, target.sun, e);
      nightLamp.intensity = lerp(from.lamp, target.lamp, e);

      scene.background = new THREE.Color(from.bg).lerp(new THREE.Color(target.bg), e);
      scene.fog.color = new THREE.Color(from.fog).lerp(new THREE.Color(target.fog), e);

      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function setNight(next, animate = true) {
    isNight = !!next;
    applyTimeOfDay(animate);
    return isNight;
  }

  function toggleNight() {
    return setNight(!isNight, true);
  }

  function getNight() {
    return isNight;
  }

  applyTimeOfDay(false);

  return { applyTimeOfDay, setNight, toggleNight, getNight };
}
