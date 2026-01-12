import * as THREE from "three";

export function createVfxSystem({ scene, smokeTexturePath, tweenNumber }) {
  let smokeTex = null;
  const smokePool = [];
  const smokeOffset = new THREE.Vector3(0, 0.55, 0);

  async function load() {
    const tl = new THREE.TextureLoader();
    smokeTex = await tl.loadAsync(smokeTexturePath);
  }

  function createSmokeSprite() {
    const mat = new THREE.SpriteMaterial({
      map: smokeTex,
      color: 0xffffff,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(mat);
    sprite.visible = false;
    return sprite;
  }

  function acquireSmokeSprite() {
    const sprite = smokePool.pop() || createSmokeSprite();
    sprite.visible = true;
    if (!sprite.parent) scene.add(sprite);
    return sprite;
  }

  function releaseSmokeSprite(sprite) {
    if (!sprite) return;
    sprite.visible = false;
    if (sprite.parent) sprite.parent.remove(sprite);
    smokePool.push(sprite);
  }

  function puffSmoke(pos) {
    if (!smokeTex) return;
    const s = acquireSmokeSprite();
    s.material.opacity = 0.55;
    s.position.copy(pos).add(smokeOffset);
    s.scale.set(1.1, 1.1, 1.1);

    const start = performance.now();
    const dur = 260;
    function tick(now) {
      const t = Math.min(1, (now - start) / dur);
      const e = t * (2 - t);
      s.material.opacity = (1 - e) * 0.65;
      const k = 1.1 + e * 0.95;
      s.scale.set(k, k, k);
      s.position.y += 0.002;
      if (t < 1) requestAnimationFrame(tick);
      else releaseSmokeSprite(s);
    }
    requestAnimationFrame(tick);
  }

  function spawnPop(obj) {
    const base = obj.scale.clone();
    obj.scale.multiplyScalar(0.001);
    tweenNumber({
      from: 0.001,
      to: 1,
      duration: 420,
      onUpdate: (v) => obj.scale.copy(base).multiplyScalar(v)
    });
  }

  return { load, puffSmoke, spawnPop };
}
