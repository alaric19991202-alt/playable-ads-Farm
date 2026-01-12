import * as THREE from "three";
import { MODEL_PATHS, ITEMS, SOUNDS, TEXTURES } from "./assets.js";
import { buildUI, toast, setLoading } from "./ui.js";
import { createTutorial, createHintSystem } from "./tutorial.js";
import { createPlacementSystem } from "./placement.js";
import { createRenderScene } from "./render/scene.js";
import { createLightingSystem } from "./systems/lighting.js";
import { createTimeSystem } from "./state/timeSystem.js";
import { createAudioSystem } from "./systems/audioSystem.js";
import { createAnimationSystem } from "./systems/animationSystem.js";
import { createTemplateLibrary, setGhostMaterial } from "./systems/templateLibrary.js";
import { tweenNumber } from "./utils/tween.js";

const DAY_START_HOUR = 6;
const NIGHT_START_HOUR = 18;
const BASE_TIME_SCALE = 300;
const BOOST_STEPS = [0.1, 1, 1.5, 2, 4];

const canvasEl = document.getElementById("c");
if (!(canvasEl instanceof HTMLCanvasElement)) {
  throw new Error("Canvas element #c not found");
}

const renderSystem = createRenderScene(canvasEl);
const {
  scene,
  camera,
  renderer,
  cameraSpherical,
  config: cameraConfig,
  updateCameraFromSpherical,
  setCameraFov,
  getCurrentFov,
  resize
} = renderSystem;
window.addEventListener("resize", resize, { passive: true });

const lightingSystem = createLightingSystem(scene);
const animationSystem = createAnimationSystem({ scene, textures: TEXTURES });
const audioSystem = createAudioSystem(SOUNDS);
const templateLibrary = createTemplateLibrary({
  scene,
  items: ITEMS,
  modelPaths: MODEL_PATHS,
  setLoading
});

const gardenPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(7, 7),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.0 })
);
gardenPlane.rotation.x = -Math.PI / 2;
gardenPlane.position.y = 0;
scene.add(gardenPlane);

const border = new THREE.Mesh(
  new THREE.RingGeometry(3.6, 3.85, 64),
  new THREE.MeshStandardMaterial({ color: 0x1b4332, roughness: 1.0 })
);
border.rotation.x = -Math.PI / 2;
border.position.y = 0.02;
border.receiveShadow = true;
scene.add(border);

const selectionRing = new THREE.Mesh(
  new THREE.RingGeometry(0.45, 0.6, 48),
  new THREE.MeshBasicMaterial({ color: 0x2184ff, transparent: true, opacity: 0.1, depthWrite: false })
);
selectionRing.rotation.x = -Math.PI / 2;
selectionRing.visible = false;
scene.add(selectionRing);

const selectionBox = new THREE.Box3();
const selectionCenter = new THREE.Vector3();
const selectionSize = new THREE.Vector3();
const assistWorldPos = new THREE.Vector3();
const assistScreenPos = new THREE.Vector3();

const placement = createPlacementSystem({
  scene,
  camera,
  domElement: canvasEl,
  gardenPlane,
  boundsSize: 3.0
});

const tutorial = createTutorial();
const hintSystem = createHintSystem();

let timeSystem = null;

function playUiClick() {
  audioSystem.unlock();
  audioSystem.playClick();
}

const ui = buildUI({
  onSelectCategory: () => {
    playUiClick();
    placement.clearSelection();
    hideAssist();
  },
  onSelectItem: (_catId, itemDef) => {
    playUiClick();
    placement.clearSelection();
    hideAssist();

    const template = templateLibrary.getTemplate(itemDef.id);
    if (!template) {
      toast("Item not available");
      return;
    }

    const ghost = templateLibrary.cloneTemplate(template);
    setGhostMaterial(ghost, 0.5);
    placement.setBlueprint(ghost, itemDef, () => templateLibrary.cloneTemplate(template));

    toast("Tap in the garden to place");
    if (!tutorial.isCompleted()) tutorial.next();
  },
  onUndo: () => {
    playUiClick();
    const undoResult = placement.undoLast();
    if (undoResult) toast("Undone");
    if (undoResult && undoResult.userData?.animations?.length) {
      animationSystem.startAnimations(undoResult);
    }
    syncUndoUI();
    hintSystem.pickStep(7);
  },
  onBoost: () => {
    if (!timeSystem) return;
    playUiClick();
    timeSystem.cycleBoost();
    ui.setBoostLabel(timeSystem.getBoostLabel());
    hintSystem.pickStep(1);
  },
  onCameraToggle: () => {
    playUiClick();
    hintSystem.pickStep(6);
  },
  onTogglePicker: () => {
    playUiClick();
  },
  onFovChange: (value) => {
    const nextFov = Number(value);
    if (!Number.isFinite(nextFov)) return;
    setCameraFov(nextFov, false);
  },
  onAssistMove: () => {
    playUiClick();
    toggleMoveMode();
    hintSystem.pickStep(3);
  },
  onAssistRotate: () => {
    playUiClick();
    rotateSelectedAnimated();
    hintSystem.pickStep(4);
  },
  onAssistDelete: () => {
    playUiClick();
    deleteSelectedAnimated();
    hintSystem.pickStep(5);
  },
  onRotate: () => {
    playUiClick();
    rotateSelectedAnimated();
  },
  onDelete: () => {
    playUiClick();
    deleteSelectedAnimated();
  },
  onCTA: () => openStore()
});

timeSystem = createTimeSystem({
  ui,
  applyTimeOfDay: lightingSystem.applyTimeOfDay,
  baseScale: BASE_TIME_SCALE,
  boostSteps: BOOST_STEPS,
  dayStartHour: DAY_START_HOUR,
  nightStartHour: NIGHT_START_HOUR
});
timeSystem.init();
ui.setBoostLabel(timeSystem.getBoostLabel());
setCameraFov(getCurrentFov(), false);
ui.setFovValue(getCurrentFov());

function syncUndoUI() {
  ui.setUndoEnabled(placement.canUndo);
}
syncUndoUI();

let isMoveMode = false;
let isMoving = false;
let assistVisible = false;
let lastSelected = null;

function hideAssist() {
  if (assistVisible) {
    ui.hideAssist();
    assistVisible = false;
  }
  isMoveMode = false;
  isMoving = false;
  ui.setAssistMode(null);
}

function toggleMoveMode() {
  if (!placement.getSelected()) return;
  isMoveMode = !isMoveMode;
  isMoving = false;
  ui.setAssistMode(isMoveMode ? "move" : null);
  if (isMoveMode) toast("Drag to move");
}

function pulseScale(obj, intensity = 0.06, duration = 180) {
  const base = obj.scale.clone();
  tweenNumber({
    from: 0,
    to: 1,
    duration,
    onUpdate: (t) => {
      const k = 1 + intensity * Math.sin(Math.PI * t);
      obj.scale.set(base.x * k, base.y * k, base.z * k);
    },
    onComplete: () => obj.scale.copy(base)
  });
}

function rotateSelectedAnimated() {
  const info = placement.rotateSelected(Math.PI / 4, { immediate: false });
  if (!info) return;
  tweenNumber({
    from: info.from,
    to: info.to,
    duration: 220,
    onUpdate: (value) => { info.object.rotation.y = value; }
  });
  animationSystem.puffSmoke(info.object.position);
  pulseScale(info.object, 0.04, 160);
  syncUndoUI();
}

function deleteSelectedAnimated() {
  const selected = placement.getSelected();
  if (!selected) return;
  if (!placement.deleteSelected((obj, remove) => {
    const base = obj.scale.clone();
    animationSystem.puffSmoke(obj.position);
    tweenNumber({
      from: 1,
      to: 0,
      duration: 200,
      onUpdate: (value) => {
        const k = Math.max(0.001, value);
        obj.scale.set(base.x * k, base.y * k, base.z * k);
      },
      onComplete: () => {
        obj.scale.copy(base);
        if (obj.userData.pendingDelete) {
          obj.userData.pendingDelete = false;
          remove();
        }
      }
    });
  })) return;
  toast("Deleted");
  hideAssist();
  syncUndoUI();
}

function updateSelectionUI() {
  const selected = placement.getSelected();
  if (selected !== lastSelected) {
    if (selected) {
      pulseScale(selected, 0.05, 160);
    } else {
      hideAssist();
    }
    lastSelected = selected;
  }

  if (!selected) {
    selectionRing.visible = false;
    return;
  }

  selectionBox.setFromObject(selected);
  selectionBox.getCenter(selectionCenter);
  selectionBox.getSize(selectionSize);

  const radius = Math.max(selectionSize.x, selectionSize.z) * 0.55;
  const baseScale = radius / 0.45;
  const pulse = 1 + Math.sin(performance.now() * 0.004) * 0.05;
  selectionRing.scale.setScalar(baseScale * pulse);
  selectionRing.position.set(selectionCenter.x, selectionBox.min.y + 0.1, selectionCenter.z);
  selectionRing.material.opacity = 0.55 + Math.sin(performance.now() * 0.004) * 0.15;
  selectionRing.visible = true;

  assistWorldPos.copy(selectionCenter);
  assistWorldPos.y = selectionBox.min.y - 0.05;
  assistScreenPos.copy(assistWorldPos).project(camera);
  if (
    assistScreenPos.z < -1 || assistScreenPos.z > 1 ||
    assistScreenPos.x < -1 || assistScreenPos.x > 1 ||
    assistScreenPos.y < -1 || assistScreenPos.y > 1
  ) {
    hideAssist();
    return;
  }

  const rect = canvasEl.getBoundingClientRect();
  const x = (assistScreenPos.x * 0.5 + 0.5) * rect.width + rect.left;
  const y = (-assistScreenPos.y * 0.5 + 0.5) * rect.height + rect.top;
  ui.showAssistAt(x, y);
  assistVisible = true;
}

function openStore() {
  playUiClick();
  const storeUrl = "https://sett.example.com";

  try {
    if (window.mraid && typeof window.mraid.open === "function") {
      window.mraid.open(storeUrl);
    } else {
      window.open(storeUrl, "_blank");
    }
  } catch {
    location.href = storeUrl;
  }
}

let isPointerDown = false;
let isRotating = false;
const lastPointerPos = { x: 0, y: 0 };

function isPrimaryPointer(e) {
  return e.pointerType !== "mouse" || e.button === 0;
}

function getClientXY(e) {
  if (e.touches?.length) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

function onPointerDown(e) {
  if (e.pointerType === "mouse" && e.button === 2) {
    isRotating = true;
    const { x, y } = getClientXY(e);
    lastPointerPos.x = x;
    lastPointerPos.y = y;
    return;
  }
  if (!isPrimaryPointer(e)) return;

  if (isMoveMode) {
    if (!placement.getSelected()) {
      hideAssist();
      return;
    }
    isMoving = true;
    placement.beginMoveSelected();
    const { x, y } = getClientXY(e);
    placement.moveSelectedTo(x, y);
    return;
  }

  isPointerDown = true;
  audioSystem.unlock();
  const { x, y } = getClientXY(e);
  placement.updateBlueprintPosition(x, y);
}

function onPointerMove(e) {
  if (isRotating) {
    const { x, y } = getClientXY(e);
    const dx = x - lastPointerPos.x;
    const dy = y - lastPointerPos.y;
    lastPointerPos.x = x;
    lastPointerPos.y = y;

    cameraSpherical.theta -= dx * cameraConfig.rotateSpeed;
    cameraSpherical.phi -= dy * cameraConfig.rotateSpeed;
    updateCameraFromSpherical();
    return;
  }

  if (isMoving) {
    const { x, y } = getClientXY(e);
    placement.moveSelectedTo(x, y);
    return;
  }

  const { x, y } = getClientXY(e);
  placement.updateBlueprintPosition(x, y);
}

function onPointerUp(e) {
  if (isRotating && e.pointerType === "mouse" && e.button === 2) {
    isRotating = false;
    return;
  }
  if (isMoving) {
    isMoving = false;
    if (placement.endMoveSelected()) {
      const selected = placement.getSelected();
      if (selected) {
        animationSystem.puffSmoke(selected.position);
        pulseScale(selected, 0.05, 160);
      }
      syncUndoUI();
    }
    isMoveMode = false;
    ui.setAssistMode(null);
    return;
  }
  if (!isPointerDown) return;
  isPointerDown = false;
  const { x, y } = getClientXY(e);

  const picked = placement.pickPlaced(x, y);
  if (picked) {
    if (placement.hasBlueprint) {
      placement.clearBlueprint();
      ui.clearItemSelection();
    }
    audioSystem.playAnimalSelection(picked.userData?.itemId);
    toast("Selected");
    hintSystem.pickStep(8);
    return;
  }

  const placed = placement.placeAt(x, y, (obj) => {
    animationSystem.spawnAnimation(obj);
    animationSystem.puffSmoke(obj.position);
    audioSystem.playPlace();
    animationSystem.startAnimations(obj);
    placement.clearBlueprint();
    ui.clearItemSelection();
  });

  if (placed) {
    if (!tutorial.isCompleted()) {
      tutorial.next();
    }
    syncUndoUI();
    return;
  }

  placement.clearSelection();
  hideAssist();
}

canvasEl.addEventListener("pointerdown", onPointerDown, { passive: true });
window.addEventListener("pointermove", onPointerMove, { passive: true });
window.addEventListener("pointerup", onPointerUp, { passive: true });
window.addEventListener("pointercancel", () => {
  isPointerDown = false;
  isRotating = false;
  isMoving = false;
}, { passive: true });
canvasEl.addEventListener("contextmenu", (e) => e.preventDefault());
canvasEl.addEventListener("wheel", (e) => {
  if (e.deltaY === 0) return;
  const zoomFactor = 1 + e.deltaY * cameraConfig.zoomSpeed;
  cameraSpherical.radius = cameraSpherical.radius * zoomFactor;
  updateCameraFromSpherical();
  e.preventDefault();
  if (tutorial.isCompleted()) {
    hintSystem.pickStep(6);
  }
}, { passive: false });

(async function boot() {
  try {
    await templateLibrary.loadEnvironment();
    await templateLibrary.loadTemplates();
    await animationSystem.loadSmokeTexture();
    setLoading(1.0, "Ready!");
    tutorial.show();
  } catch (err) {
    console.error(err);
    setLoading(1.0, "Load failed (see console)");
  }
})();

const clock = new THREE.Clock();
let isPaused = document.hidden;

document.addEventListener("visibilitychange", () => {
  isPaused = document.hidden;
  if (!isPaused) clock.getDelta();
});

function animate() {
  resize();
  if (isPaused) {
    requestAnimationFrame(animate);
    return;
  }

  const delta = Math.min(0.1, clock.getDelta());
  if (timeSystem) timeSystem.advance(delta);
  animationSystem.updateAnimations(delta);
  updateSelectionUI();

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
