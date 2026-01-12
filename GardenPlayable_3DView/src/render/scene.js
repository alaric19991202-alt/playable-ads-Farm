import * as THREE from "three";
import { tweenNumber } from "../utils/tween.js";

export function createRenderScene(canvas) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x07101e, 7, 22);

  const config = {
    fovMin: 10,
    fovMax: 80,
    fovDefault: 80,
    minRadius: 4.5,
    maxRadius: 16,
    minPhi: 0.35,
    maxPhi: 1.35,
    rotateSpeed: 0.0045,
    zoomSpeed: 0.0015
  };

  let currentFov = config.fovDefault;
  const camera = new THREE.PerspectiveCamera(currentFov, 1, 0.1, 60);
  camera.position.set(0, 6.4, 9.2);

  const cameraTarget = new THREE.Vector3(0, 0.6, 0);
  const cameraSpherical = new THREE.Spherical();
  const cameraOffset = new THREE.Vector3();
  cameraSpherical.setFromVector3(new THREE.Vector3().subVectors(camera.position, cameraTarget));

  function updateCameraFromSpherical() {
    cameraSpherical.radius = THREE.MathUtils.clamp(
      cameraSpherical.radius,
      config.minRadius,
      config.maxRadius
    );
    cameraSpherical.phi = THREE.MathUtils.clamp(
      cameraSpherical.phi,
      config.minPhi,
      config.maxPhi
    );
    cameraOffset.setFromSpherical(cameraSpherical);
    camera.position.copy(cameraTarget).add(cameraOffset);
    camera.lookAt(cameraTarget);
  }
  updateCameraFromSpherical();

  function setCameraFov(targetFov, animate = true) {
    const clamped = THREE.MathUtils.clamp(targetFov, config.fovMin, config.fovMax);
    currentFov = clamped;
    if (!animate) {
      camera.fov = clamped;
      camera.updateProjectionMatrix();
      return currentFov;
    }
    tweenNumber({
      from: camera.fov,
      to: clamped,
      duration: 260,
      onUpdate: (value) => {
        camera.fov = value;
        camera.updateProjectionMatrix();
      }
    });
    return currentFov;
  }

  function getCurrentFov() {
    return currentFov;
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
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

  return {
    scene,
    camera,
    renderer,
    cameraTarget,
    cameraSpherical,
    config,
    updateCameraFromSpherical,
    setCameraFov,
    getCurrentFov,
    resize
  };
}
