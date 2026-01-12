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

/**
 * GardenMakeover playable re-skin & flow to mimic Garden Joy:
 * - Challenge card at top
 * - Required items (teal) + Bonus items (pink) on the left
 * - Bottom category tabs + item carousel
 * - Glowing placement spots (slots)
 * - Finish -> "Submitting" -> Star score + rewards -> CTA
 */

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
    frameInterval: 1000 / targetFps,
    isLowEnd
  };
}

let quality = getQualitySettings();
const canvas = document.getElementById("c");
const { scene, camera, renderer, resize, setPixelRatio } = createScene({
  canvas,
  pixelRatio: quality.pixelRatio,
  powerPreference: quality.powerPreference,
  antialias: quality.antialias
});
const lighting = createLighting(scene, { shadowMapSize: quality.shadowMapSize });
window.addEventListener("resize", () => {
  const next = getQualitySettings();
  setPixelRatio(next.pixelRatio);
  quality = next;
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
const vfx = createVfxSystem({ scene, smokeTexturePath: TEXTURES.smoke, tweenNumber });
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
  const bp = placement.getActiveBlueprint();
  if (bp?.mesh) disposeMaterials(bp.mesh);
  placement.clearBlueprint();
}

// ---------- Placement plane + slots ----------
const gardenPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(7, 7),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.0 })
);
gardenPlane.rotation.x = -Math.PI / 2;
gardenPlane.position.y = 0;
scene.add(gardenPlane);

// Garden Joy-style glowing placement spots.
// User selected "2": required spots show the *specific required item icon*.
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

    // subtle shadow
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

  // a tiny label tint for bonus spots (more "+" vibe)
  if (!isRequired) {
    plate.material.opacity = 0.88;
  }

  // improve click picking (raycast) by using the plate.
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
  if (iconTexCache.has(itemId)) return iconTexCache.get(itemId);

  // Bench has no PNG in the provided pack; use a crisp emoji icon.
  if (itemId === "bench") {
    const plus = makePlusTexture(fallbackColorHex);
    iconTexCache.set(itemId, plus);
    return plus;
  }

  const def = findItemDef(itemId);
  if (def?.icon) {
    const t = await texLoader.loadAsync(def.icon);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 2;
    iconTexCache.set(itemId, t);
    return t;
  }

  // Fallback: plus
  const plus = makePlusTexture(fallbackColorHex);
  iconTexCache.set(itemId, plus);
  return plus;
}

async function setupSlotMarkers() {
  plusTexRequired = plusTexRequired || makePlusTexture(COLOR_REQUIRED);
  plusTexBonus = plusTexBonus || makePlusTexture(COLOR_BONUS);

  for (const s of slots) { 
    const colorHex = s.required ? COLOR_REQUIRED : COLOR_BONUS;
    const iconTex = s.required
      ? await getIconTextureForItem(s.allowedItemIds?.[0], colorHex)
      : plusTexBonus;
    const radius = s.radius || 0;

    const marker = createSlotMarker3D({ colorHex, iconTexture: iconTex, radius, isRequired: !!s.required });
    marker.position.copy(s.position);
    marker.userData.slotId = s.id;
    marker.traverse((o) => { o.userData.slotId = s.id; });
    scene.add(marker);

    s.marker = marker;
    s.pickMesh = marker; // group works because raycaster uses recursive hits
  }
}

const placement = createPlacementSystem({
  scene,
  camera,
  domElement: canvas,
  gardenPlane,
  boundsSize: 3.1
});
// Slots are finalized after textures load (setupSlotMarkers in boot).

// ---------- Game state ----------
const state = {
  coins: 1550,
  diamonds: 15,
  energy: 5,
  energyMax: 5,
  locked: true // unlocked after boot completes
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
  for (const [cat, list] of Object.entries(ITEMS)) {
    for (const it of list) if (it.id === itemId) return { ...it, categoryId: it.categoryId ?? cat };
  }
  return null;
}

function canAfford(itemDef) {
  if (!itemDef) return false;
  const cost = itemDef.cost ?? 0;
  if (itemDef.currency === "diamond") return state.diamonds >= cost;
  return state.coins >= cost;
}

function spend(itemDef) {
  const cost = itemDef.cost ?? 0;
  if (itemDef.currency === "diamond") state.diamonds -= cost;
  else state.coins -= cost;
}

function refund(itemDef) {
  const cost = itemDef.cost ?? 0;
  if (itemDef.currency === "diamond") state.diamonds += cost;
  else state.coins += cost;
}

function isRequiredComplete() {
  const slotState = new Map(placement.getSlots().map((s) => [s.id, !!s.occupiedBy]));
  return required.every((t) => slotState.get(`req_${t.itemId}`));
}

function placedCount() {
  return placement.getSlots().reduce((n, s) => n + (s.occupiedBy ? 1 : 0), 0);
}

function updateTasksUI(ui) {
  const slotsNow = placement.getSlots();

  const reqTasks = required.map((t) => {
    const slotId = `req_${t.itemId}`;
    const slot = slotsNow.find((s) => s.id === slotId);
    return { label: t.label, done: !!slot?.occupiedBy };
  });

  const bonusDone = placedCount() >= required.length + 1;
  const bonusTasks = [{ label: bonus[0].label, done: bonusDone }];

  ui.setTasks(reqTasks, bonusTasks);
  ui.setFinishEnabled(isRequiredComplete(), true);
}

function updateMarkersHighlight(selectedItemDef) {
  const t = performance.now() * 0.004;
  const slotsNow = placement.getSlots();
  for (const s of slotsNow) {
    const marker = s.marker;
    if (!marker) continue;

    // Hide if occupied
    marker.visible = !s.occupiedBy && !state.locked;

    if (!marker.visible) continue;

    // Base idle bob (playful, close to the ground)
    marker.position.y = s.position.y + 0.02 + Math.sin(t + s.position.x * 0.7) * 0.015;

    // Highlight if selected item is compatible
    const compatible = !!selectedItemDef && (
      (s.allowedItemIds?.includes(selectedItemDef.id)) ||
      (s.allowedCategories?.includes(selectedItemDef.categoryId))
    );

    const k = compatible ? (1.10 + Math.sin(t * 1.6) * 0.06) : (1.00 + Math.sin(t * 0.9) * 0.02);
    marker.scale.set(k, k, k);

    // Adjust glow/opacity on sub-meshes.
    const ud = marker.userData || {};
    if (ud.glow?.material) ud.glow.material.opacity = compatible ? 0.28 : 0.18;
    if (ud.ring?.material) ud.ring.material.opacity = compatible ? 0.98 : 0.82;
    if (ud.plate?.material) ud.plate.material.opacity = compatible ? 0.94 : 0.86;
    if (ud.icon?.material) ud.icon.material.opacity = compatible ? 1.0 : 0.92;
  }
}

// ---------- UI + Tutorial ----------
const ui = buildUI({
  onSelectCategory: () => {
    playUiClick();

    clearBlueprintPreview();
    ui.clearItemSelection();
    setHint("Pick an item, then tap a glowing spot.");
  },
  onSelectItem: (_catId, itemDef) => {
    playUiClick();

    if (state.locked) return;

    const tpl = templateLibrary.getTemplate(itemDef.id);
    if (!tpl) {
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

    if (state.locked) return;

    const undone = placement.undoLast();
    if (undone) {
      if (undone.type === "place") {
        const def = findItemDef(undone.object?.userData?.itemId);
        if (def) {
          refund(def);
          ui.setCurrencies({ coins: state.coins, diamonds: state.diamonds });
        }
        animationSystem.stop(undone.object);
        requestShadowUpdate();
      }
      if (undone.type === "delete") {
        animationSystem.start(undone.object);
        requestShadowUpdate();
      }
      toast("Undone");
      updateTasksUI(ui);
    }
    ui.setUndoEnabled(placement.canUndo);
  },
  onFinish: async () => {
    playUiClick();

    if (state.locked) return;

    if (!isRequiredComplete()) {
      toast("Place all required items first");
      return;
    }

    state.locked = true;
    clearBlueprintPreview();
    ui.clearItemSelection();

    setHint("Submitting design...");

    // Quick "voting" feeling.
    await delay(650);
    setHint("Voting...");
    await delay(650);

    const stars = 4.6 + Math.random() * 0.3; // playful
    const rewardC = 250;
    const rewardD = 1;
    state.coins += rewardC;
    state.diamonds += rewardD;

    ui.setCurrencies({ coins: state.coins, diamonds: state.diamonds });
    ui.showResult({ stars: Math.min(4.9, stars), coins: rewardC, diamonds: rewardD });
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
const hints = createHintSystem();

ui.setCurrencies({ coins: state.coins, diamonds: state.diamonds });
ui.setEnergy(state.energy, state.energyMax);
ui.setUndoEnabled(false);
ui.setDayNightIcon(lighting.getNight());

function openStore() {
  const url = window.clickTag || "https://example.com";
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

// ---------- Input ----------
let pointerDown = false;
function getClientXY(e) {
  if (e.touches?.length) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

function onPointerDown(e) {
  if (state.locked) return;
  pointerDown = true;
  ensureAudio();

  const { x, y } = getClientXY(e);
  placement.updateBlueprintPosition(x, y);
}

function onPointerMove(e) {
  if (state.locked) return;
  // Keep preview responsive even without a long press.
  if (!placement.hasBlueprint) return;
  const { x, y } = getClientXY(e);
  placement.updateBlueprintPosition(x, y);
}

function onPointerUp(e) {
  if (state.locked) return;
  if (!pointerDown) return;
  pointerDown = false;

  const { x, y } = getClientXY(e);

  // If an item is selected, prioritize placing (Garden Joy flow).
  let result = null;
  if (placement.hasBlueprint) {
    result = placement.placeAt(x, y, (obj) => {
      vfx.spawnPop(obj);
      vfx.puffSmoke(obj.position);
      audioSystem.playPlace();

      // Spend currency when successfully placed.
      const def = findItemDef(obj.userData.itemId);
      if (def) spend(def);
      ui.setCurrencies({ coins: state.coins, diamonds: state.diamonds });
      animationSystem.start(obj);
      requestShadowUpdate();

      clearBlueprintPreview();
      ui.clearItemSelection();
    });
  } else {
    const picked = placement.pickPlaced(x, y);
    if (picked) {
      // Light interaction: tap placed object to rotate a bit (feels like an editor).
      picked.rotation.y += Math.PI / 4;
      requestShadowUpdate();
      toast("Rotated");
      return;
    }
  }

  if (result) {
    tutorial.next();
    hints.placeHint();
    ui.setUndoEnabled(placement.canUndo);
    updateTasksUI(ui);
    return;
  }

  // no slot tapped
  if (placement.hasBlueprint) {
    toast("Tap a glowing spot");
  }
}

canvas.addEventListener("pointerdown", onPointerDown, { passive: true });
window.addEventListener("pointermove", onPointerMove, { passive: true });
window.addEventListener("pointerup", onPointerUp, { passive: true });
window.addEventListener("pointercancel", () => { pointerDown = false; }, { passive: true });
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

// ---------- Boot ----------
(async function boot() {
  try {
    await loadEnvironment({ scene, gltfCache, modelPath: MODEL_PATHS.ground, setLoading });
    await templateLibrary.load();
    animationSystem.registerAll(templateLibrary.getAllAnimations());
    await vfx.load();
    setLoading(1.0, "Ready!");
    await setupSlotMarkers();
    placement.setSlots(slots);
    requestShadowUpdate();

    state.locked = false;
    updateTasksUI(ui);
    setHint("Pick an item below.");
  } catch (err) {
    console.error(err);
    setLoading(1.0, "Load failed (see console)");
  }
})();

// ---------- Render loop ----------
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
  const useFrameCap = quality.frameInterval > 17;
  if (useFrameCap && time - lastFrameTime < quality.frameInterval) {
    requestAnimationFrame(animate);
    return;
  }
  lastFrameTime = time;
  resize();
  if (animationSystem.hasActive()) {
    animationSystem.update();
  }
  syncShadowUpdates();

  // Highlight slots based on the currently selected blueprint item.
  updateMarkersHighlight(placement.getActiveItemDef());

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
