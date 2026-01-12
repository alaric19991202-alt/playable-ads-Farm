import * as THREE from "three";

export function createScene({ canvas, pixelRatio, powerPreference, antialias = true }) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xe8fbff, 10, 28);
  scene.background = new THREE.Color(0xd7f6ff);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 80);
  camera.position.set(0, 7.3, 8.6);
  camera.lookAt(0, 0.35, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias,
    alpha: false,
    powerPreference
  });
  const fallbackRatio = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(pixelRatio ?? fallbackRatio);
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    const pr = renderer.getPixelRatio();
    const need = canvas.width !== Math.floor(w * pr) || canvas.height !== Math.floor(h * pr);
    if (need) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }
  window.addEventListener("resize", resize, { passive: true });

  function setPixelRatio(nextRatio) {
    if (!nextRatio || Number.isNaN(nextRatio)) return;
    renderer.setPixelRatio(nextRatio);
    resize();
  }

  return { scene, camera, renderer, resize, setPixelRatio };
}

