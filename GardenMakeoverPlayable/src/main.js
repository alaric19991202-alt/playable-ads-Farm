import * as THREE from "three";

import { MODEL_PATHS, ITEMS, SOUNDS, TEXTURES } from "./assets.js";
import { buildUI, toast, setHint, setLoading } from "./ui.js";
import { createTutorial, createHintSystem } from "./tutorial.js";
import { createPlacementSystem } from "./placement.js";
import { createAudioSystem } from "./systems/audioSystem.js";
import { createAnimationSystem } from "./systems/animationSystem.js";
import { createGltfCache } from "./systems/gltfCache.js";
import { loadEnvironment } from "./systems/environment.js";
import { createLighting } from "./systems/lighting.js";
import { createScene } from "./systems/scene.js";
import { createTemplateLibrary } from "./systems/templateLibrary.js";
import { createVfxSystem } from "./systems/vfxSystem.js";
import { setGhostMaterial, tweenNumber } from "./utils/threeHelpers.js";

THREE.Cache.enabled = true;

function getQualitySettings() {
  const dpr = window.devicePixelRatio || 1;
  const shortSide = Math.min(window.innerWidth, window.innerHeight);
  const isMobile = shortSide <= 820;
  const isLowEnd = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || shortSide <= 420;
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const maxPixelRatio = isLowEnd ? 1.25 : (isMobile ? 1.5 : 2);
  const targetFps = prefersReducedMotion || isLowEnd ? 30 : 60;
  return {
    pixelRatio: Math.min(dpr, maxPixelRatio),
    shadowMapSize: isLowEnd || isMobile ? 512 : 1024,
    powerPreference: isLowEnd ? "low-power" : "high-performance",
    antialias: !isLowEnd,
    frameInterval: 1000 / targetFps 
  };
}

let qualitySettings = getQualitySettings();
const canvas = document.getElementById("c");
const { scene, camera, renderer, resize, setPixelRatio } = createScene({
  canvas,
  pixelRatio: qualitySettings.pixelRatio,
  powerPreference: qualitySettings.powerPreference,
  antialias: qualitySettings.antialias
});

const lighting = createLighting(scene, { shadowMapSize: qualitySettings.shadowMapSize });
window.addEventListener("resize", () => {
  const next = getQualitySettings();
  setPixelRatio(next.pixelRatio);
  qualitySettings = next;
}, { passive: true });

renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;

function requestShadowUpdate() {
  renderer.shadowMap.needsUpdate = true;
}

function syncShadowUpdates() {
  const animated = animationSystem.hasActive();
  if (renderer.shadowMap.autoUpdate !== animated) {
    renderer.shadowMap.autoUpdate = animated;
    if (!animated) renderer.shadowMap.needsUpdate = true;
  }
}

const audioSystem = createAudioSystem(SOUNDS);
const vfxSystem = createVfxSystem({ scene, smokeTexturePath: TEXTURES.smoke, tweenNumber });
const gltfCache = createGltfCache();
const templateLibrary = createTemplateLibrary({ items: ITEMS, gltfCache, setLoading });
const animationSystem = createAnimationSystem();

function playUiClick({ startTheme = true } = {}) {
  audioSystem.unlockAudioOnce();
  if (startTheme) audioSystem.startThemeOnce();
  audioSystem.playClick();
}

function ensureAudio(startTheme = true) {
  audioSystem.unlockAudioOnce();
  if (startTheme) audioSystem.startThemeOnce();
}

function disposeMaterials(root) {
  if (!root) return;
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    if (Array.isArray(o.material)) {
      o.material.forEach((m) => m.dispose());
    } else {
      o.material.dispose();
    }
  });
}

function clearBlueprintPreview() {
  const blueprint = placement.getActiveBlueprint();
  if (blueprint?.mesh) disposeMaterials(blueprint.mesh);
  placement.clearBlueprint();
}

const gardenPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(7, 7),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.0 })
);
gardenPlane.rotation.x = -Math.PI / 2;
gardenPlane.position.y = 0;
scene.add(gardenPlane);

const COLOR_REQUIRED = 0x2bb5b0;


const COLOR_BONUS = 0xff6fae;

const slots = [
  { id: "req_fence", position: new THREE.Vector3(1.25, 0.1, 0.8), rotationY: Math.PI * 1.5, radius: 0.5, required: true, allowedItemIds: ["fence"] },
  { id: "req_tomato", position: new THREE.Vector3(-1.6, 0.1, -0.8), rotationY: 0, radius: 0.5, required: true, allowedItemIds: ["tomato"] },
  { id: "req_corn", position: new THREE.Vector3(-1.6, 0.1, 0.2), rotationY: 0, radius: 0.5, required: true, allowedItemIds: ["corn"] },
  { id: "req_sheep", position: new THREE.Vector3(1.6, 0.1, -0.7), rotationY: 0, radius: 0.5, required: true, allowedItemIds: ["sheep"] },
  { id: "opt_left", position: new THREE.Vector3(-1.6, 0.1, 1.2), rotationY: 0, radius: 0.5, required: false, allowedCategories: ["furniture", "plants", "animals"] },
  { id: "opt_middle", position: new THREE.Vector3(1.75, 0.1, 0.75), rotationY: 0, radius: 0.5, required: false, allowedCategories: ["furniture", "plants", "animals"] },
  { id: "opt_right", position: new THREE.Vector3(2.0, 0.1, 1.9), rotationY: 0, radius: 0.5, required: false, allowedCategories: ["furniture", "plants", "animals"] }
];

function canvasTexture(drawFn, size = 256) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  
  const ctx = c.getContext("2d");
  drawFn(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 2;
  tex.needsUpdate = true;
  return tex;
}

function makePlusTexture(colorHex) {
  const r = (colorHex >> 16) & 255;
  const g = (colorHex >> 8) & 255;
  const b = colorHex & 255;
  return canvasTexture((ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = "rgba(0,0,0,0)";

    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 14;

    ctx.strokeStyle = `rgba(${r},${g},${b},0.95)`;
    ctx.lineWidth = 24;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.29);
    ctx.lineTo(s * 0.5, s * 0.71);
    ctx.moveTo(s * 0.29, s * 0.5);
    ctx.lineTo(s * 0.71, s * 0.5);
    ctx.stroke();
  }, 256);
}

function createSlotMarker3D({ colorHex, iconTexture, radius, isRequired }) {
  const group = new THREE.Group();

  const plate = new THREE.Mesh(
    new THREE.CircleGeometry(0.48, 44),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 })
  );
  plate.rotation.x = -Math.PI / 2;
  plate.position.y = 0.06;
  plate.scale.setScalar(radius > 0 ? radius : 1.0);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.1, 0.1, 10),
    new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.95 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  ring.scale.setScalar(radius > 0 ? radius : 1.0);

  const glow = new THREE.Mesh(
    new THREE.RingGeometry(0.60, 0.92, 44),
    new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.20,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.05;
  glow.scale.setScalar(radius > 0 ? radius : 1.0);

  const icon = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.62),
    new THREE.MeshBasicMaterial({ map: iconTexture, transparent: true, opacity: 1.0, depthWrite: false })
  );
  icon.rotation.x = -Math.PI / 2;
  icon.position.y = 0.07;
  icon.scale.setScalar(radius > 0 ? radius : 1.0);

  if (!isRequired) {
    plate.material.opacity = 0.88;
  }

  plate.userData.slotPick = true;

  group.add(glow, plate, ring, icon);
  group.userData = { glow, plate, ring, icon };
  return group;
}

const texLoader = new THREE.TextureLoader();
const iconTexCache = new Map();
let plusTexRequired = null;
let plusTexBonus = null;

async function getIconTextureForItem(itemId, fallbackColorHex) {
  if (!itemId) {
    return makePlusTexture(fallbackColorHex);
  }
  if (iconTexCache.has(itemId)) return iconTexCache.get(itemId);

  if (itemId === "fence") {
    const plus = makePlusTexture(fallbackColorHex);
    iconTexCache.set(itemId, plus);
    return plus;
  }

  const itemDef = findItemDef(itemId);
  if (itemDef?.icon) {
    try {
      const texture = await texLoader.loadAsync(itemDef.icon);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 2;
      iconTexCache.set(itemId, texture);
      return texture;
    } catch (err) {
      console.warn(`Icon load failed: ${itemDef.icon}`, err);
    }
  }

  const plus = makePlusTexture(fallbackColorHex);
  iconTexCache.set(itemId, plus);
  return plus;
}

async function setupSlotMarkers() {
  plusTexRequired = plusTexRequired || makePlusTexture(COLOR_REQUIRED);
  plusTexBonus = plusTexBonus || makePlusTexture(COLOR_BONUS);

  for (const slot of slots) {
    const slotColor = slot.required ? COLOR_REQUIRED : COLOR_BONUS;
    const iconTexture = slot.required
      ? await getIconTextureForItem(slot.allowedItemIds?.[0], slotColor)
      : plusTexBonus;
    const radius = slot.radius || 0;

    const marker = createSlotMarker3D({ colorHex: slotColor, iconTexture, radius, isRequired: !!slot.required });
    marker.position.copy(slot.position);
    marker.userData.slotId = slot.id;
    marker.traverse((o) => { o.userData.slotId = slot.id; });
    scene.add(marker);

    slot.marker = marker;
    slot.pickMesh = marker;
  }
}

const placement = createPlacementSystem({
  scene,
  camera,
  domElement: canvas,
  gardenPlane,
  boundsSize: 3.1
});

const gameState = {
  coins: 1550,
  diamonds: 15,
  energy: 5,
  energyMax: 5,
  locked: true
};

const required = [
  { itemId: "fence", label: "Fence" },
  { itemId: "tomato", label: "Tomato" },
  { itemId: "corn", label: "Corn" },
  { itemId: "sheep", label: "Sheep" }
];
const bonus = [
  { id: "bonus_any", label: "Add 1 extra item", done: false }
];

function findItemDef(itemId) {
  for (const [categoryId, items] of Object.entries(ITEMS)) {
    for (const item of items) {
      if (item.id === itemId) return { ...item, categoryId: item.categoryId ?? categoryId };
    }
  }
  return null;
}

function canAfford(itemDef) {
  if (!itemDef) return false;
  const cost = itemDef.cost ?? 0;
  if (itemDef.currency === "diamond") return gameState.diamonds >= cost;
  return gameState.coins >= cost;
}

function spend(itemDef) {
  const cost = itemDef.cost ?? 0;
  if (itemDef.currency === "diamond") gameState.diamonds -= cost;
  else gameState.coins -= cost;
}

function refund(itemDef) {
  const cost = itemDef.cost ?? 0;
  if (itemDef.currency === "diamond") gameState.diamonds += cost;
  else gameState.coins += cost;
}

function isRequiredComplete() {
  const slotState = new Map(placement.getSlots().map((s) => [s.id, !!s.occupiedBy]));
  return required.every((t) => slotState.get(`req_${t.itemId}`));
}

function placedCount() {
  return placement.getSlots().reduce((n, s) => n + (s.occupiedBy ? 1 : 0), 0);
}

function updateTasksUI(ui) {
  const currentSlots = placement.getSlots();

  const requiredTasks = required.map((task) => {
    const slotId = `req_${task.itemId}`;
    const slot = currentSlots.find((s) => s.id === slotId);
    return { label: task.label, done: !!slot?.occupiedBy };
  });

  const bonusDone = placedCount() >= required.length + 1;
  const bonusTasks = [{ label: bonus[0].label, done: bonusDone }];

  ui.setTasks(requiredTasks, bonusTasks);
  ui.setFinishEnabled(isRequiredComplete(), true);
}

function updateMarkersHighlight(selectedItemDef) {
  const time = performance.now() * 0.004;
  const currentSlots = placement.getSlots();
  for (const slot of currentSlots) {
    const marker = slot.marker;
    if (!marker) continue;

    marker.visible = !slot.occupiedBy && !gameState.locked;

    if (!marker.visible) continue;

    marker.position.y = slot.position.y + 0.02 + Math.sin(time + slot.position.x * 0.7) * 0.015;

    const compatible = !!selectedItemDef && (
      (slot.allowedItemIds?.includes(selectedItemDef.id)) ||
      (slot.allowedCategories?.includes(selectedItemDef.categoryId))
    );

    const scale = compatible ? (1.10 + Math.sin(time * 1.6) * 0.06) : (1.00 + Math.sin(time * 0.9) * 0.02);
    marker.scale.set(scale, scale, scale);

    const parts = marker.userData || {};
    if (parts.glow?.material) parts.glow.material.opacity = compatible ? 0.28 : 0.18;
    if (parts.ring?.material) parts.ring.material.opacity = compatible ? 0.98 : 0.82;
    if (parts.plate?.material) parts.plate.material.opacity = compatible ? 0.94 : 0.86;
    if (parts.icon?.material) parts.icon.material.opacity = compatible ? 1.0 : 0.92;
  }
}

const ui = buildUI({
  onSelectCategory: () => {
    playUiClick();

    clearBlueprintPreview();
    ui.clearItemSelection();
    setHint("Pick an item, then tap a glowing spot.");
  },
  onSelectItem: (_catId, itemDef) => {
    playUiClick();

    if (gameState.locked) return;

    const template = templateLibrary.getTemplate(itemDef.id);
    if (!template) {
      toast("Item not available");
      return;
    }

    if (!canAfford(itemDef)) {
      toast(itemDef.currency === "diamond" ? "Not enough diamonds" : "Not enough coins");
      return;
    }

    const ghost = templateLibrary.cloneTemplate(itemDef.id);
    if (!ghost) {
      toast("Item not available");
      return;
    }

    setGhostMaterial(ghost, 0.45);
    placement.setBlueprint(ghost, itemDef, () => templateLibrary.cloneTemplate(itemDef.id));

    setHint("Tap a glowing spot to place.");
  },
  onUndo: () => {
    playUiClick();

    if (gameState.locked) return;

    const undoResult = placement.undoLast();
    if (undoResult) {
      if (undoResult.type === "place") {
        const itemDef = findItemDef(undoResult.object?.userData?.itemId);
        if (itemDef) {
          refund(itemDef);
          ui.setCurrencies({ coins: gameState.coins, diamonds: gameState.diamonds });
        }
        animationSystem.stop(undoResult.object);
        requestShadowUpdate();
      }
      if (undoResult.type === "delete") {
        animationSystem.start(undoResult.object);
        requestShadowUpdate();
      }
      toast("Undone");
      updateTasksUI(ui);
    }
    ui.setUndoEnabled(placement.canUndo);
  },
  onFinish: async () => {
    playUiClick();

    if (gameState.locked) return;

    if (!isRequiredComplete()) {
      toast("Place all required items first");
      return;
    }

    gameState.locked = true;
    clearBlueprintPreview();
    ui.clearItemSelection();

    setHint("Submitting design...");

    await delay(650);
    setHint("Voting...");
    await delay(650);

    const stars = 4.6 + Math.random() * 0.3;
    const rewardCoins = 250;
    const rewardDiamonds = 1;
    gameState.coins += rewardCoins;
    gameState.diamonds += rewardDiamonds;

    ui.setCurrencies({ coins: gameState.coins, diamonds: gameState.diamonds });
    ui.showResult({ stars: Math.min(4.9, stars), coins: rewardCoins, diamonds: rewardDiamonds });
    setHint("");
  },
  onTogglePanel: () => {
    playUiClick();
  },
  onToggleLeftPanel: () => {
    playUiClick();
  },
  onToggleDayNight: () => {
    playUiClick();

    const isNight = lighting.toggleNight();
    ui.setDayNightIcon(isNight);
    requestShadowUpdate();
  },
  onCTA: () => {
    playUiClick({ startTheme: false });
    openStore();
  },
  onDismissTutorial: () => {
    tutorial.dismissOverlay();
  }
});

const tutorial = createTutorial(ui);
const hintSystem = createHintSystem();

ui.setCurrencies({ coins: gameState.coins, diamonds: gameState.diamonds });
ui.setEnergy(gameState.energy, gameState.energyMax);
ui.setUndoEnabled(false);
ui.setDayNightIcon(lighting.getNight());

function openStore() {
  const url = window.clickTag || "https://sett.example.com";
  try {
    if (window.mraid && typeof window.mraid.open === "function") window.mraid.open(url);
    else window.open(url, "_blank");
  } catch {
    location.href = url;
  }
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let pointerDown = false;
function getClientXY(e) {
  if (e.touches?.length) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

function onPointerDown(e) {
  if (gameState.locked) return;
  pointerDown = true;
  ensureAudio();

  const { x, y } = getClientXY(e);
  placement.updateBlueprintPosition(x, y);
}

function onPointerMove(e) {
  if (gameState.locked) return;
  if (!placement.hasBlueprint) return;
  const { x, y } = getClientXY(e);
  placement.updateBlueprintPosition(x, y);
}

function onPointerUp(e) {
  if (gameState.locked) return;
  if (!pointerDown) return;
  pointerDown = false;

  const { x, y } = getClientXY(e);

  let placementResult = null;
  if (placement.hasBlueprint) {
    placementResult = placement.placeAt(x, y, (obj) => {
      vfxSystem.spawnPop(obj);
      vfxSystem.puffSmoke(obj.position);
      audioSystem.playPlace();

      const itemDef = findItemDef(obj.userData.itemId);
      if (itemDef) spend(itemDef);
      ui.setCurrencies({ coins: gameState.coins, diamonds: gameState.diamonds });
      animationSystem.start(obj);
      requestShadowUpdate();

      clearBlueprintPreview();
      ui.clearItemSelection();
    });
  } else {
    const pickedObject = placement.pickPlaced(x, y);
    if (pickedObject) {
      pickedObject.rotation.y += Math.PI / 4;
      requestShadowUpdate();
      toast("Rotated");
      return;
    }
  }

  if (placementResult) {
    tutorial.next();
    hintSystem.placeHint();
    ui.setUndoEnabled(placement.canUndo);
    updateTasksUI(ui);
    return;
  }

  if (placement.hasBlueprint) {
    toast("Tap a glowing spot");
  }
}

canvas.addEventListener("pointerdown", onPointerDown, { passive: true });
window.addEventListener("pointermove", onPointerMove, { passive: true });
window.addEventListener("pointerup", onPointerUp, { passive: true });
window.addEventListener("pointercancel", () => { pointerDown = false; }, { passive: true });
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

(async function boot() {
  try {
    await loadEnvironment({ scene, gltfCache, modelPath: MODEL_PATHS.ground, setLoading });
    await templateLibrary.load();
    animationSystem.registerAll(templateLibrary.getAllAnimations());
    await vfxSystem.load();
    setLoading(1.0, "Ready!");
    await setupSlotMarkers();
    placement.setSlots(slots);
    requestShadowUpdate();

    gameState.locked = false;
    updateTasksUI(ui);
    setHint("Pick an item below.");
  } catch (err) {
    console.error(err);
    setLoading(1.0, "Load failed (see console)");
  }
})();

let lastFrameTime = 0;
let isHidden = document.hidden;
document.addEventListener("visibilitychange", () => {
  isHidden = document.hidden;
  if (!isHidden) {
    animationSystem.resetClock();
    lastFrameTime = performance.now();
  }
});

function animate(now) {
  if (isHidden) {
    requestAnimationFrame(animate);
    return;
  }
  const time = now ?? performance.now();
  const useFrameCap = qualitySettings.frameInterval > 17;

  if (useFrameCap && time - lastFrameTime < qualitySettings.frameInterval) {
    requestAnimationFrame(animate);
    return;
  }
  lastFrameTime = time;
  resize();
  if (animationSystem.hasActive()) {
    animationSystem.update();
  }
  syncShadowUpdates();

  updateMarkersHighlight(placement.getActiveItemDef());

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

