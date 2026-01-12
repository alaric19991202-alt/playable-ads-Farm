import * as THREE from "three";
import { TextureLoader } from "three";

export function createAnimationSystem({ scene, textures }) {
  const animationMixers = new Map();
  let smokeTex = null;

  async function loadSmokeTexture() {
    if (!textures?.smoke) return;
    const tl = new TextureLoader();
    smokeTex = await tl.loadAsync(textures.smoke);
  }

  function puffSmoke(pos) {
    if (!smokeTex) return;
    const mat = new THREE.SpriteMaterial({
      map: smokeTex,
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      depthWrite: false
    });
    const s = new THREE.Sprite(mat);
    s.position.copy(pos).add(new THREE.Vector3(0, 0.55, 0));
    s.scale.set(1.2, 1.2, 1.2);
    scene.add(s);

    const start = performance.now();
    const dur = 260;
    function tick(now) {
      const t = Math.min(1, (now - start) / dur);
      const e = t * (2 - t);
      s.material.opacity = (1 - e) * 0.65;
      const k = 1.2 + e * 0.9;
      s.scale.set(k, k, k);
      s.position.y += 0.002;
      if (t < 1) requestAnimationFrame(tick);
      else {
        scene.remove(s);
        s.material.dispose();
      }
    }
    requestAnimationFrame(tick);
  }

  function spawnAnimation(obj) {
    const start = performance.now();
    const baseY = obj.position.y;

    obj.scale.setScalar(0.001);
    obj.position.y = baseY + 0.55;

    const dur = 430;
    function easeOutBack(t) {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
    function tick(now) {
      const t = Math.min(1, (now - start) / dur);
      const e = easeOutBack(t);
      obj.scale.setScalar(e - 0.8);
      obj.position.y = baseY + (1 - t) * 0.55 + 0.05;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function startAnimations(obj) {
    const clips = obj.userData?.animations;
    if (!clips || clips.length === 0 || obj.userData.animationsStarted) return;
    const mixer = new THREE.AnimationMixer(obj);
    clips.forEach((clip) => mixer.clipAction(clip).reset().play());
    animationMixers.set(obj, mixer);
    obj.userData.animationsStarted = true;
  }

  function updateAnimations(dt) {
    if (animationMixers.size === 0) return;
    for (const [obj, mixer] of animationMixers) {
      if (!obj.parent) {
        mixer.stopAllAction();
        animationMixers.delete(obj);
        if (obj.userData) obj.userData.animationsStarted = false;
        continue;
      }
      if (!obj.visible) continue;
      mixer.update(dt);
    }
  }

  function stopAnimations(obj) {
    if (!obj) return;
    const mixer = animationMixers.get(obj);
    if (!mixer) return;
    mixer.stopAllAction();
    animationMixers.delete(obj);
    if (obj.userData) obj.userData.animationsStarted = false;
  }

  return {
    loadSmokeTexture,
    puffSmoke,
    spawnAnimation,
    startAnimations,
    updateAnimations,
    stopAnimations
  };
}
