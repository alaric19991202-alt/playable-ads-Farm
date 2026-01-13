import * as THREE from "three";

export function setShadows(root: THREE.Object3D, enabled = true) {
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      mesh.castShadow = enabled;
      mesh.receiveShadow = true;
    }
  });
}

export function setGhostMaterial(root: THREE.Object3D, opacity = 0.45) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && mesh.material) {
      const material = Array.isArray(mesh.material)
        ? mesh.material.map((mat) => mat.clone())
        : mesh.material.clone();
      if (Array.isArray(material)) {
        material.forEach((mat) => {
          mat.transparent = true;
          mat.opacity = opacity;
          mat.depthWrite = false;
        });
      } else {
        material.transparent = true;
        material.opacity = opacity;
        material.depthWrite = false;
      }
      mesh.material = material;
    }
  });
}

export function normalizePivotToGround(model: THREE.Object3D) {
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

export function scaleTemplateToTarget(root: THREE.Object3D, targetSize: number, extraScale = 1) {
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim <= 0) return;
  const scale = (targetSize / maxDim) * extraScale;
  root.scale.multiplyScalar(scale);
}

type TweenParams = {
  from: number;
  to: number;
  duration?: number;
  onUpdate?: (value: number) => void;
  onComplete?: () => void;
};

export function tweenNumber({ from, to, duration = 240, onUpdate, onComplete }: TweenParams) {
  const start = performance.now();
  function easeOutBack(t: number) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
  function tick(now: number) {
    const t = Math.min(1, (now - start) / duration);
    const e = easeOutBack(t);
    const value = from + (to - from) * e;
    onUpdate?.(value);
    if (t < 1) requestAnimationFrame(tick);
    else onComplete?.();
  }
  requestAnimationFrame(tick);
}

