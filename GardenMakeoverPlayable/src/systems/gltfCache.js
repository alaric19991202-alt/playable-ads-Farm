import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export function createGltfCache() {
  const loader = new GLTFLoader();
  const cache = new Map();

  async function load(path) {
    if (!path) {
      throw new Error("Model path is required");
    }
    if (!cache.has(path)) {
      const promise = loader.loadAsync(path).catch((err) => {
        cache.delete(path);
        const message = err?.message ? err.message : String(err);
        throw new Error(`Failed to load model: ${path}. ${message}`);
      });
      cache.set(path, promise);
    }
    return await cache.get(path);
  }

  return { load };
}

