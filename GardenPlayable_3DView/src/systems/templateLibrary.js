import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import { runWithConcurrency } from "../utils/async.js";

const CATEGORY_TARGET_MAX = {
  plants: 1,
  animals: 1,
  decor: 1
};

function setShadows(root, enabled = true) {
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = enabled;
      o.receiveShadow = true;
    }
  });
}

export function setGhostMaterial(root, opacity = 0.5) {
  root.traverse((o) => {
    if (o.isMesh && o.material) {
      o.material = o.material.clone();
      o.material.transparent = true;
      o.material.opacity = opacity;
      o.material.depthWrite = false;
    }
  });
}

function normalizePivotToGround(model) {
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

function scaleTemplateToTarget(root, itemDef, categoryId) {
  const targetSize = itemDef.targetSize ?? CATEGORY_TARGET_MAX[categoryId];
  if (!targetSize) return;

  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim <= 0) return;

  const extraScale = itemDef.scale ?? 1;
  const scale = (targetSize / maxDim) * extraScale;
  root.scale.multiplyScalar(scale);
}

function buildTemplateFromPrefix(root, prefix) {
  const prefixLower = prefix.toLowerCase();
  const raw = new THREE.Group();

  root.updateMatrixWorld(true);

  root.traverse((o) => {
    if (!o.isMesh) return;
    const name = (o.name || "").toLowerCase();
    if (!name.startsWith(prefixLower)) return;

    const clone = o.clone(false);
    clone.geometry = o.geometry;
    clone.material = o.material;
    clone.position.set(0, 0, 0);
    clone.quaternion.set(0, 0, 0, 1);
    clone.scale.set(0.5, 0.5, 0.5);
    clone.updateMatrix();
    clone.applyMatrix4(o.matrixWorld);

    raw.add(clone);
  });

  if (raw.children.length === 0) return null;

  const normalized = normalizePivotToGround(raw);
  setShadows(normalized, true);
  return normalized;
}

function buildTemplateFromScene(model) {
  model.updateMatrixWorld(true);
  const normalized = normalizePivotToGround(model);
  setShadows(normalized, true);
  return normalized;
}

function containsSkinnedMesh(root) {
  let found = false;
  root.traverse((o) => {
    if (o.isSkinnedMesh) found = true;
  });
  return found;
}

function containsBone(root) {
  let found = false;
  root.traverse((o) => {
    if (o.isBone) found = true;
  });
  return found;
}

function prepareSkinnedMeshes(root) {
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    o.frustumCulled = false;
    if (o.skeleton) {
      o.skeleton.calculateInverses();
      o.bind(o.skeleton, o.matrixWorld);
    }
  });
}

function findNodeByPrefix(root, prefix) {
  if (!prefix) return null;
  const prefixLower = prefix.toLowerCase();
  let best = null;
  let bestScore = -1;

  root.traverse((o) => {
    const name = (o.name || "").toLowerCase();
    if (!name.startsWith(prefixLower)) return;
    const hasSkin = containsSkinnedMesh(o);
    const hasBones = containsBone(o);
    const childCount = o.children ? o.children.length : 0;
    const score = (hasBones ? 6 : 0) + (hasSkin ? 3 : 0) + Math.min(childCount, 4);
    if (score > bestScore) {
      best = o;
      bestScore = score;
    }
  });

  if (!best) return null;

  let top = best;
  while (top.parent && top.parent.name) {
    const parentName = top.parent.name.toLowerCase();
    if (!parentName.startsWith(prefixLower)) break;
    top = top.parent;
  }
  return top;
}

function selectAnimationClips(animations, prefix) {
  if (!animations || animations.length === 0) return [];
  const key = (prefix || "").toLowerCase();
  if (!key) return [animations[0]];

  const idleName = `idle_${key}`;
  const idle = animations.filter((clip) => (clip.name || "").toLowerCase() === idleName);
  if (idle.length) return idle;

  const matched = animations.filter((clip) => (clip.name || "").toLowerCase().includes(key));
  return matched.length ? matched : [animations[0]];
}

export function createTemplateLibrary({ scene, items, modelPaths, setLoading }) {
  THREE.Cache.enabled = true;
  const gltfLoader = new GLTFLoader();
  const templates = new Map();
  const gltfCache = new Map();

  async function loadGltfCached(path) {
    if (!gltfCache.has(path)) {
      gltfCache.set(path, gltfLoader.loadAsync(path));
    }
    return await gltfCache.get(path);
  }

  async function loadEnvironment() {
    setLoading(0.05, "Loading garden...");

    const gltf = await gltfLoader.loadAsync(modelPaths.ground);
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

    setShadows(env, true);
    scene.add(env);

    setLoading(0.25, "Loading items...");
  }

  async function loadTemplates() {
    const allGroups = Object.entries(items);
    const entries = allGroups.flatMap(([categoryId, list]) =>
      list.map((it) => ({ categoryId, it }))
    );
    const totalCount = entries.length;
    let done = 0;

    const needsAtlas = allGroups.some(([, list]) => list.some((it) => !it.model || it.animated));
    const atlasGltf = needsAtlas ? await loadGltfCached(modelPaths.objects) : null;
    const atlasScene = atlasGltf ? atlasGltf.scene : null;
    const atlasAnimations = atlasGltf ? atlasGltf.animations : [];

    const tasks = entries.map(({ categoryId, it }) => async () => {
      let tpl = null;
      let animations = [];
      if (it.model) {
        const gltf = await loadGltfCached(it.model);
        let source = it.prefix ? findNodeByPrefix(gltf.scene, it.prefix) : gltf.scene;
        if (!source) source = gltf.scene;
        const useSkeleton = it.animated || containsSkinnedMesh(source) || (gltf.animations && gltf.animations.length);
        const clone = useSkeleton ? cloneSkeleton(source) : source.clone(true);
        tpl = buildTemplateFromScene(clone);
        animations = selectAnimationClips(gltf.animations, it.animationPrefix ?? it.prefix ?? it.id);
      } else if (atlasScene) {
        if (it.animated) {
          const source = findNodeByPrefix(atlasScene, it.prefix);
          if (source) {
            const clone = cloneSkeleton(source);
            tpl = buildTemplateFromScene(clone);
            animations = selectAnimationClips(atlasAnimations, it.animationPrefix ?? it.prefix ?? it.id);
          }
        } else {
          tpl = buildTemplateFromPrefix(atlasScene, it.prefix);
        }
      }
      if (tpl) {
        const needsSkeleton = it.animated || animations.length > 0 || containsSkinnedMesh(tpl);
        if (animations.length) tpl.userData.animations = animations;
        if (needsSkeleton) tpl.userData.isAnimated = true;
        scaleTemplateToTarget(tpl, it, categoryId);
        if (needsSkeleton) prepareSkinnedMeshes(tpl);
        templates.set(it.id, tpl);
      }
      done += 1;
      setLoading(0.25 + 0.55 * (done / totalCount), `Preparing ${it.label}...`);
    });

    await runWithConcurrency(tasks, 4);
  }

  function getTemplate(id) {
    return templates.get(id);
  }

  function cloneTemplate(tpl) {
    const animated = !!tpl.userData?.isAnimated;
    const clone = animated ? cloneSkeleton(tpl) : tpl.clone(true);
    if (tpl.userData?.animations?.length) {
      clone.userData.animations = tpl.userData.animations;
      clone.userData.isAnimated = true;
    }
    return clone;
  }

  return {
    loadEnvironment,
    loadTemplates,
    getTemplate,
    cloneTemplate
  };
}
