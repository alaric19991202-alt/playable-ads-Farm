import * as THREE from "three";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import { normalizePivotToGround, scaleTemplateToTarget, setShadows } from "../utils/threeHelpers.js";

function getMaxConcurrency() {
  if (typeof navigator === "undefined") return 3;
  const cores = navigator.hardwareConcurrency || 4;
  if (cores <= 4) return 2;
  if (cores <= 6) return 3;
  return 4;
}

async function runWithConcurrency(tasks, maxConcurrent) {
  const count = Math.max(1, Math.min(maxConcurrent || 1, tasks.length));
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const current = index;
      index += 1;
      await tasks[current]();
    }
  }

  const workers = [];
  for (let i = 0; i < count; i += 1) workers.push(worker());
  await Promise.all(workers);
}

function buildProcedural(kind) {
  const g = new THREE.Group();
  if (kind === "lantern") {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 0.9, 16),
      new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.9 })
    );
    pole.position.y = 0.45;

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.26, 18),
      new THREE.MeshStandardMaterial({ color: 0xffcf5a, roughness: 0.6, metalness: 0.1 })
    );
    body.position.y = 0.92;

    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.2, 18),
      new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.9 })
    );
    cap.position.y = 1.08;

    g.add(pole, body, cap);
  } else if (kind === "table") {
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 0.08, 22),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 })
    );
    top.position.y = 0.62;

    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.18, 0.6, 18),
      new THREE.MeshStandardMaterial({ color: 0xd9d9d9, roughness: 0.85 })
    );
    leg.position.y = 0.3;

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.06, 20),
      new THREE.MeshStandardMaterial({ color: 0xcfcfcf, roughness: 0.9 })
    );
    base.position.y = 0.03;

    g.add(top, leg, base);
  }

  const normalized = normalizePivotToGround(g);
  setShadows(normalized, true);
  return normalized;
}

export function createTemplateLibrary({ items, gltfCache, setLoading }) {
  const templates = new Map();
  const animations = new Map();

  async function load() {
    const groups = Object.entries(items);
    const entries = [];
    for (const [categoryId, list] of groups) {
      for (const item of list) {
        item.categoryId = categoryId;
        entries.push(item);
      }
    }

    const total = entries.length || 1;
    let done = 0;
    const tasks = entries.map((item) => async () => {
      let template = null;
      try {
        if (item.procedural) {
          template = buildProcedural(item.procedural);
          scaleTemplateToTarget(template, 1.0, item.scale ?? 1);
        } else if (item.model) {
          const gltf = await gltfCache.load(item.model);
          if (gltf.animations?.length) animations.set(item.id, gltf.animations);
          const clone = cloneSkeleton(gltf.scene);
          template = normalizePivotToGround(clone);
          setShadows(template, true);
          scaleTemplateToTarget(template, 1.0, item.scale ?? 1);
        }
      } catch (err) {
        console.warn(`Item load failed: ${item.id}`, err);
      }

      if (template) templates.set(item.id, template);
      done += 1;
      setLoading?.(0.22 + 0.65 * (done / total), `Preparing ${item.label}...`);
    });

    await runWithConcurrency(tasks, getMaxConcurrency());
  }

  function getTemplate(id) {
    return templates.get(id) || null;
  }

  function cloneTemplate(id) {
    const tpl = templates.get(id);
    if (!tpl) return null;
    return cloneSkeleton(tpl);
  }

  function getAnimations(id) {
    return animations.get(id) || null;
  }

  function getAllAnimations() {
    return animations;
  }

  return {
    load,
    getTemplate,
    cloneTemplate,
    getAnimations,
    getAllAnimations
  };
}

