import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export function createGltfCache() {
  const loader = new GLTFLoader();
  const cache = new Map();

  async function load(path) {
    if (!cache.has(path)) cache.set(path, loader.loadAsync(path));
    return await cache.get(path);
  }

  return { load };
}
