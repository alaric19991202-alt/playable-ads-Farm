import * as THREE from "three";

export function setShadows(root, enabled = true) {
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = enabled;
      o.receiveShadow = true;
    }
  });
}

export function setGhostMaterial(root, opacity = 0.45) {
  root.traverse((o) => {
    if (o.isMesh && o.material) {
      o.material = o.material.clone();
      o.material.transparent = true;
      o.material.opacity = opacity;
      o.material.depthWrite = false;
    }
  });
}

export function normalizePivotToGround(model) {
  const container = new THREE.Group();
  container.add(model);

  const box = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  box.getCenter(center);

  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= box.min.y;

  return container;
}

export function scaleTemplateToTarget(root, targetSize, extraScale = 1) {
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim <= 0) return;
  const scale = (targetSize / maxDim) * extraScale;
  root.scale.multiplyScalar(scale);
}

export function tweenNumber({ from, to, duration = 240, onUpdate, onComplete }) {
  const start = performance.now();
  function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const e = easeOutBack(t);
    const value = from + (to - from) * e;
    onUpdate?.(value);
    if (t < 1) requestAnimationFrame(tick);
    else onComplete?.();
  }
  requestAnimationFrame(tick);
}

