import * as THREE from "three";
import { setShadows } from "../utils/threeHelpers.js";

export async function loadEnvironment({ scene, gltfCache, modelPath, setLoading }) {
  setLoading?.(0.05, "Loading garden...");

  const gltf = await gltfCache.load(modelPath);
  const env = gltf.scene;

  const box = new THREE.Box3().setFromObject(env);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.z);
  const target = 30;
  const scale = target / maxDim;

  env.scale.setScalar(scale);

  const box2 = new THREE.Box3().setFromObject(env);
  const center = new THREE.Vector3();
  box2.getCenter(center);

  env.position.x -= center.x;
  env.position.z -= center.z;
  env.position.y -= box2.min.y + 0.4;

  env.traverse((obj) => {
    obj.updateMatrix();
    obj.matrixAutoUpdate = false;
  });
  env.updateMatrixWorld(true);

  setShadows(env, true);
  scene.add(env);

  setLoading?.(0.22, "Loading items...");
}

