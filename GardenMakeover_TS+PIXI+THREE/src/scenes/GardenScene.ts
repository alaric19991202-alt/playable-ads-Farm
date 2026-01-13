import * as THREE from "three";

import { MODEL_PATHS, ITEMS, SOUNDS, TEXTURES } from "../assets";
import { buildUI, toast, setHint, setLoading } from "../ui";
import { createTutorial, createHintSystem } from "../tutorial";
import { createPlacementSystem } from "../placement";
import { createAudioSystem } from "../systems/audioSystem";
import { createAnimationSystem } from "../systems/animationSystem";
import { createGltfCache } from "../systems/gltfCache";
import { loadEnvironment } from "../systems/environment";
import { createTemplateLibrary } from "../systems/templateLibrary";
import { createVfxSystem } from "../systems/vfxSystem";
import { setGhostMaterial, tweenNumber } from "../utils/threeHelpers";
import { getQualitySettings } from "../utils/qualitySettings";
import { BaseScene } from "../core/BaseScene";
import type { Renderer3D } from "../renderers/Renderer3D";
import type { UIManager } from "../ui/UIManager";
import type { StateManager } from "../core/StateManager";
import type { EventBus } from "../core/EventBus";
import type { ItemDef, SlotDef } from "../types";

THREE.Cache.enabled = true;

const COLOR_REQUIRED = 0x2bb5b0;
const COLOR_BONUS = 0xff6fae;

export class GardenScene extends BaseScene {

  private renderer3D: Renderer3D;
  private uiManager: UIManager;
  private stateManager: StateManager;
  private eventBus: EventBus;

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private lighting: ReturnType<typeof import("../systems/lighting").createLighting>;
  private canvas: HTMLCanvasElement;
  private inputCanvas: HTMLCanvasElement;

  private qualitySettings = getQualitySettings();

  private audioSystem = createAudioSystem(SOUNDS);
  private vfxSystem: ReturnType<typeof createVfxSystem>;
  private gltfCache = createGltfCache();
  private templateLibrary: ReturnType<typeof createTemplateLibrary>;
  private animationSystem = createAnimationSystem();
  private placement: ReturnType<typeof createPlacementSystem>;

  private ui: ReturnType<typeof buildUI> | null = null;
  private tutorial: ReturnType<typeof createTutorial> | null = null;
  private hintSystem: ReturnType<typeof createHintSystem> | null = null;

  private texLoader = new THREE.TextureLoader();
  private iconTexCache = new Map<string, THREE.Texture>();
  private plusTexRequired: THREE.Texture | null = null;
  private plusTexBonus: THREE.Texture | null = null;

  private gardenPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 7),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.0 })
  );

  private slots: SlotDef[] = [
    { id: "req_fence", position: new THREE.Vector3(1.25, 0.1, 0.8), rotationY: Math.PI * 1.5, radius: 0.5, required: true, allowedItemIds: ["fence"] },
    { id: "req_tomato", position: new THREE.Vector3(-1.6, 0.1, -0.8), rotationY: 0, radius: 0.5, required: true, allowedItemIds: ["tomato"] },
    { id: "req_corn", position: new THREE.Vector3(-1.6, 0.1, 0.2), rotationY: 0, radius: 0.5, required: true, allowedItemIds: ["corn"] },
    { id: "req_sheep", position: new THREE.Vector3(1.6, 0.1, -0.7), rotationY: 0, radius: 0.5, required: true, allowedItemIds: ["sheep"] },
    { id: "opt_left", position: new THREE.Vector3(-1.6, 0.1, 1.2), rotationY: 0, radius: 0.5, required: false, allowedCategories: ["furniture", "plants", "animals"] },
    { id: "opt_middle", position: new THREE.Vector3(1.75, 0.1, 0.75), rotationY: 0, radius: 0.5, required: false, allowedCategories: ["furniture", "plants", "animals"] },
    { id: "opt_right", position: new THREE.Vector3(2.0, 0.1, 1.9), rotationY: 0, radius: 0.5, required: false, allowedCategories: ["furniture", "plants", "animals"] }
  ];

  private gameState: StateManager["gameState"];

  private required = [
    { itemId: "fence", label: "Fence" },
    { itemId: "tomato", label: "Tomato" },
    { itemId: "corn", label: "Corn" },
    { itemId: "sheep", label: "Sheep" }
  ];

  private bonus = [
    { id: "bonus_any", label: "Add 1 extra item", done: false }
  ];

  private pointerDown = false;
  private lastFrameTime = 0;
  private isHidden = document.hidden;

  constructor(renderer3D: Renderer3D, uiManager: UIManager, stateManager: StateManager, eventBus: EventBus) {

    super();
    this.renderer3D = renderer3D;
    this.uiManager = uiManager;
    this.stateManager = stateManager;
    this.eventBus = eventBus;
    this.scene = renderer3D.scene;
    this.camera = renderer3D.camera;
    this.renderer = renderer3D.renderer;
    this.lighting = renderer3D.lighting;
    this.canvas = this.renderer.domElement as HTMLCanvasElement;
    this.inputCanvas = this.uiManager.getCanvas();

    this.gardenPlane.rotation.x = -Math.PI / 2;
    this.gardenPlane.position.y = 0;
    this.scene.add(this.gardenPlane);

    this.vfxSystem = createVfxSystem({ scene: this.scene, smokeTexturePath: TEXTURES.smoke, tweenNumber });
    this.templateLibrary = createTemplateLibrary({ items: ITEMS, gltfCache: this.gltfCache, setLoading });
    this.placement = createPlacementSystem({
      scene: this.scene,
      camera: this.camera,
      domElement: this.canvas,
      gardenPlane: this.gardenPlane,
      boundsSize: 3.1
    });

    this.gameState = this.stateManager.gameState;
  }

  init() {

    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;

    this.eventBus.on("ui:selectCategory", this.onSelectCategory);
    this.eventBus.on("ui:selectItem", this.onSelectItem);
    this.eventBus.on("ui:undo", this.onUndo);
    this.eventBus.on("ui:finish", this.onFinish);
    this.eventBus.on("ui:togglePanel", this.onTogglePanel);
    this.eventBus.on("ui:toggleLeftPanel", this.onToggleLeftPanel);
    this.eventBus.on("ui:toggleDayNight", this.onToggleDayNight);
    this.eventBus.on("ui:cta", this.onCTA);
    this.eventBus.on("ui:dismissTutorial", this.onDismissTutorial);

    this.ui = buildUI({

      onSelectCategory: (categoryId) => this.eventBus.emit("ui:selectCategory", categoryId),
      onSelectItem: (catId, itemDef) => this.eventBus.emit("ui:selectItem", catId, itemDef),
      onUndo: () => this.eventBus.emit("ui:undo"),
      onFinish: () => this.eventBus.emit("ui:finish"),
      onTogglePanel: (open) => this.eventBus.emit("ui:togglePanel", open),
      onToggleLeftPanel: (open) => this.eventBus.emit("ui:toggleLeftPanel", open),
      onToggleDayNight: () => this.eventBus.emit("ui:toggleDayNight"),
      onCTA: () => this.eventBus.emit("ui:cta"),
      onDismissTutorial: () => this.eventBus.emit("ui:dismissTutorial")
    });
    
    this.tutorial = createTutorial(this.ui);
    this.hintSystem = createHintSystem();

    this.ui?.setCurrencies({ coins: this.gameState.coins, diamonds: this.gameState.diamonds });
    this.ui?.setEnergy(this.gameState.energy, this.gameState.energyMax);
    this.ui?.setUndoEnabled(false);
    const isNight = this.lighting.getNight();
    this.ui?.setDayNightIcon(isNight);
    this.ui?.setNightMode(isNight);

    window.addEventListener("resize", this.onResize, { passive: true });

    this.inputCanvas.addEventListener("pointerdown", this.onPointerDown, { passive: true });
    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    window.addEventListener("pointerup", this.onPointerUp, { passive: true });
    window.addEventListener("pointercancel", this.onPointerCancel, { passive: true });
    this.inputCanvas.addEventListener("contextmenu", this.onContextMenu);

    document.addEventListener("visibilitychange", this.onVisibilityChange);

    this.boot();
  }

  update(now: number) {
    if (this.isHidden) return;

    const time = now ?? performance.now();
    const useFrameCap = this.qualitySettings.frameInterval > 17;

    if (useFrameCap && time - this.lastFrameTime < this.qualitySettings.frameInterval) {
      return;
    }
    this.lastFrameTime = time;

    if (this.animationSystem.hasActive()) {
      this.animationSystem.update();
    }
    this.syncShadowUpdates();

    this.updateMarkersHighlight(this.placement.getActiveItemDef());
  }

  dispose() {
    window.removeEventListener("resize", this.onResize);
    this.inputCanvas.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerCancel);
    this.inputCanvas.removeEventListener("contextmenu", this.onContextMenu);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);

    this.eventBus.off("ui:selectCategory", this.onSelectCategory);
    this.eventBus.off("ui:selectItem", this.onSelectItem);
    this.eventBus.off("ui:undo", this.onUndo);
    this.eventBus.off("ui:finish", this.onFinish);
    this.eventBus.off("ui:togglePanel", this.onTogglePanel);
    this.eventBus.off("ui:toggleLeftPanel", this.onToggleLeftPanel);
    this.eventBus.off("ui:toggleDayNight", this.onToggleDayNight);
  

    this.eventBus.off("ui:cta", this.onCTA);
    this.eventBus.off("ui:dismissTutorial", this.onDismissTutorial);
  }

  private onResize = () => {

    const next = getQualitySettings();
    this.renderer3D.setPixelRatio(next.pixelRatio);
    this.qualitySettings = next;
  };

  private onVisibilityChange = () => {

    this.isHidden = document.hidden;
    if (!this.isHidden) {
      this.animationSystem.resetClock();
      this.lastFrameTime = performance.now();
    }
  };

  private requestShadowUpdate() {
    this.renderer.shadowMap.needsUpdate = true;
  }

  private syncShadowUpdates() {
    const animated = this.animationSystem.hasActive();
    if (this.renderer.shadowMap.autoUpdate !== animated) {
      this.renderer.shadowMap.autoUpdate = animated;
      if (!animated) this.renderer.shadowMap.needsUpdate = true;
    }
  }

  private playUiClick({ startTheme = true } = {}) {
    this.audioSystem.unlockAudioOnce();
    if (startTheme) this.audioSystem.startThemeOnce();
    this.audioSystem.playClick();
  }

  private ensureAudio(startTheme = true) {
    this.audioSystem.unlockAudioOnce();
    if (startTheme) this.audioSystem.startThemeOnce();
  }

  private disposeMaterials(root: THREE.Object3D | null | undefined) {
    if (!root) return;
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
    });
  }

  private clearBlueprintPreview() {
    const blueprint = this.placement.getActiveBlueprint();
    if (blueprint?.mesh) this.disposeMaterials(blueprint.mesh);
    this.placement.clearBlueprint();
  }

  private canvasTexture(drawFn: (ctx: CanvasRenderingContext2D, size: number) => void, size = 256) {
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;

    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("2D context not available!!");
    drawFn(ctx, size);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 2;
    tex.needsUpdate = true;
    return tex;
  }

  private makePlusTexture(colorHex: number) {
    const r = (colorHex >> 16) & 255;
    const g = (colorHex >> 8) & 255;
    const b = colorHex & 255;
    return this.canvasTexture((ctx, s) => {
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

  private createSlotMarker3D({
    colorHex,
    iconTexture,
    radius,
    isRequired
  }: {
    colorHex: number;
    iconTexture: THREE.Texture;
    radius: number;
    isRequired: boolean;
  }) {
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
      (plate.material as THREE.MeshBasicMaterial).opacity = 0.88;
    }

    plate.userData.slotPick = true;

    group.add(glow, plate, ring, icon);
    group.userData = { glow, plate, ring, icon };
    return group;
  }

  private async getIconTextureForItem(itemId: string | undefined, fallbackColorHex: number) {
    if (!itemId) {
      return this.makePlusTexture(fallbackColorHex);
    }
    if (this.iconTexCache.has(itemId)) return this.iconTexCache.get(itemId)!;

    if (itemId === "fence") {
      const plus = this.makePlusTexture(fallbackColorHex);
      this.iconTexCache.set(itemId, plus);
      return plus;
    }

    const itemDef = this.findItemDef(itemId);
    if (itemDef?.icon) {
      try {
        const texture = await this.texLoader.loadAsync(itemDef.icon);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 2;
        this.iconTexCache.set(itemId, texture);
        return texture;
      } catch (err) {
        console.warn(`Icon load failed: ${itemDef.icon}`, err);
      }
    }

    const plus = this.makePlusTexture(fallbackColorHex);
    this.iconTexCache.set(itemId, plus);
    return plus;
  }

  private async setupSlotMarkers() {
    this.plusTexRequired = this.plusTexRequired || this.makePlusTexture(COLOR_REQUIRED);
    this.plusTexBonus = this.plusTexBonus || this.makePlusTexture(COLOR_BONUS);

    for (const slot of this.slots) {
      const slotColor = slot.required ? COLOR_REQUIRED : COLOR_BONUS;
      const iconTexture = slot.required
        ? await this.getIconTextureForItem(slot.allowedItemIds?.[0], slotColor)
        : this.plusTexBonus;
      const radius = slot.radius || 0;

      const marker = this.createSlotMarker3D({ colorHex: slotColor, iconTexture, radius, isRequired: !!slot.required });
      marker.position.copy(slot.position);
      marker.userData.slotId = slot.id;
      marker.traverse((o) => { o.userData.slotId = slot.id; });
      this.scene.add(marker);

      slot.marker = marker;
      slot.pickMesh = marker;
    }
  }

  private findItemDef(itemId: string): ItemDef | null {
    for (const [categoryId, items] of Object.entries(ITEMS)) {
      for (const item of items) {
        if (item.id === itemId) return { ...item, categoryId: item.categoryId ?? categoryId };
      }
    }
    return null;
  }

  private canAfford(itemDef: ItemDef | null) {
    if (!itemDef) return false;
    const cost = itemDef.cost ?? 0;
    if (itemDef.currency === "diamond") return this.gameState.diamonds >= cost;
    return this.gameState.coins >= cost;
  }

  private spend(itemDef: ItemDef) {
    const cost = itemDef.cost ?? 0;
    if (itemDef.currency === "diamond") this.gameState.diamonds -= cost;
    else this.gameState.coins -= cost;
  }

  private refund(itemDef: ItemDef) {
    const cost = itemDef.cost ?? 0;
    if (itemDef.currency === "diamond") this.gameState.diamonds += cost;
    else this.gameState.coins += cost;
  }

  private isRequiredComplete() {
    const slotState = new Map(this.placement.getSlots().map((s) => [s.id, !!s.occupiedBy]));
    return this.required.every((t) => slotState.get(`req_${t.itemId}`));
  }

  private placedCount() {
    return this.placement.getSlots().reduce((n, s) => n + (s.occupiedBy ? 1 : 0), 0);
  }

  private updateTasksUI(ui: ReturnType<typeof buildUI>) {
    const currentSlots = this.placement.getSlots();

    const requiredTasks = this.required.map((task) => {
      const slotId = `req_${task.itemId}`;
      const slot = currentSlots.find((s) => s.id === slotId);
      return { label: task.label, done: !!slot?.occupiedBy };
    });

    const bonusDone = this.placedCount() >= this.required.length + 1;
    const bonusTasks = [{ label: this.bonus[0].label, done: bonusDone }];

    ui.setTasks(requiredTasks, bonusTasks);
    ui.setFinishEnabled(this.isRequiredComplete(), true);
  }

  private updateMarkersHighlight(selectedItemDef: ItemDef | null) {
    const time = performance.now() * 0.004;
    const currentSlots = this.placement.getSlots();
    for (const slot of currentSlots) {
      const marker = slot.marker as THREE.Object3D | undefined;
      if (!marker) continue;

      marker.visible = !slot.occupiedBy && !this.gameState.locked;

      if (!marker.visible) continue;

      marker.position.y = slot.position.y + 0.02 + Math.sin(time + slot.position.x * 0.7) * 0.015;

      const compatible = !!selectedItemDef && (
        (slot.allowedItemIds?.includes(selectedItemDef.id)) ||
        (slot.allowedCategories?.includes(selectedItemDef.categoryId || ""))
      );

      const scale = compatible ? (1.10 + Math.sin(time * 1.6) * 0.06) : (1.00 + Math.sin(time * 0.9) * 0.02);
      marker.scale.set(scale, scale, scale);

      const parts = marker.userData as { glow?: THREE.Mesh; ring?: THREE.Mesh; plate?: THREE.Mesh; icon?: THREE.Mesh } || {};
      if (parts.glow?.material) parts.glow.material.opacity = compatible ? 0.28 : 0.18;
      if (parts.ring?.material) parts.ring.material.opacity = compatible ? 0.98 : 0.82;
      if (parts.plate?.material) parts.plate.material.opacity = compatible ? 0.94 : 0.86;
      if (parts.icon?.material) parts.icon.material.opacity = compatible ? 1.0 : 0.92;
    }
  }

  private openStore() {
    const url = window.clickTag || "https://sett.example.com";
    try {
      if (window.mraid && typeof window.mraid.open === "function") window.mraid.open(url);
      else window.open(url, "_blank");
    } catch {
      location.href = url;
    }
  }

  private delay(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  private getClientXY(e: PointerEvent | TouchEvent) {
    if ((e as TouchEvent).touches?.length) {
      const t = (e as TouchEvent).touches[0];
      return { x: t.clientX, y: t.clientY };
    }
    const p = e as PointerEvent;
    return { x: p.clientX, y: p.clientY };
  }

  private onPointerDown = (e: PointerEvent) => {
    if (this.gameState.locked) return;
    const { x, y } = this.getClientXY(e);
    if (this.uiManager.isPointerOverUI?.(x, y)) return;

    this.pointerDown = true;
    this.ensureAudio();

    this.placement.updateBlueprintPosition(x, y);
  };

  private onPointerMove = (e: PointerEvent) => {
    if (this.gameState.locked) return;
    if (!this.placement.hasBlueprint) return;
    const { x, y } = this.getClientXY(e);
    if (this.uiManager.isPointerOverUI?.(x, y)) return;
    this.placement.updateBlueprintPosition(x, y);
  };

  private onPointerUp = (e: PointerEvent) => {
    if (this.gameState.locked) return;
    if (!this.pointerDown) return;
    this.pointerDown = false;

    const { x, y } = this.getClientXY(e);
    if (this.uiManager.isPointerOverUI?.(x, y)) return;

    let placementResult = null;
    if (this.placement.hasBlueprint) {
      placementResult = this.placement.placeAt(x, y, (obj: THREE.Object3D) => {
        this.vfxSystem.spawnPop(obj);
        this.vfxSystem.puffSmoke(obj.position);
        this.audioSystem.playPlace();

        const itemDef = this.findItemDef(obj.userData.itemId as string);
        if (itemDef) this.spend(itemDef);
        this.ui?.setCurrencies({ coins: this.gameState.coins, diamonds: this.gameState.diamonds });
        this.animationSystem.start(obj);
        this.requestShadowUpdate();

        this.clearBlueprintPreview();
        this.ui?.clearItemSelection();
      });
    } else {
      const pickedObject = this.placement.pickPlaced(x, y);
      if (pickedObject) {
        pickedObject.rotation.y += Math.PI / 4;
        this.requestShadowUpdate();
        toast("Rotated");
        return;
      }
    }

    if (placementResult) {
      this.tutorial.next();
      this.hintSystem.placeHint();
      this.ui?.setUndoEnabled(this.placement.canUndo);
      if (this.ui) this.updateTasksUI(this.ui);
      return;
    }

    if (this.placement.hasBlueprint) {
      toast("Tap a glowing spot");
    }
  };

  private onPointerCancel = () => {
    this.pointerDown = false;
  };

  private onContextMenu = (e: Event) => {
    e.preventDefault();
  };

  private onSelectCategory = () => {
    this.playUiClick();

    this.clearBlueprintPreview();
    this.ui?.clearItemSelection();
    setHint("Pick an item, then tap a glowing spot.");
  };

  private onSelectItem = (_catId: string, itemDef: ItemDef) => {
    this.playUiClick();

    if (this.gameState.locked) return;

    const template = this.templateLibrary.getTemplate(itemDef.id);
    if (!template) {
      toast("Item not available");
      return;
    }

    if (!this.canAfford(itemDef)) {
      toast(itemDef.currency === "diamond" ? "Not enough diamonds" : "Not enough coins");
      return;
    }

    const ghost = this.templateLibrary.cloneTemplate(itemDef.id);
    if (!ghost) {
      toast("Item not available");
      return;
    }

    setGhostMaterial(ghost, 0.45);
    this.placement.setBlueprint(ghost, itemDef, () => this.templateLibrary.cloneTemplate(itemDef.id));

    setHint("Tap a glowing spot to place.");
  };

  private onUndo = () => {
    this.playUiClick();

    if (this.gameState.locked) return;

    const undoResult = this.placement.undoLast();
    if (undoResult) {
      if (undoResult.type === "place") {
        const itemDef = this.findItemDef(undoResult.object?.userData?.itemId as string);
        if (itemDef) {
          this.refund(itemDef);
          this.ui?.setCurrencies({ coins: this.gameState.coins, diamonds: this.gameState.diamonds });
        }
        this.animationSystem.stop(undoResult.object);
        this.requestShadowUpdate();
      }
      if (undoResult.type === "delete") {
        this.animationSystem.start(undoResult.object);
        this.requestShadowUpdate();
      }
      toast("Undone");
      if (this.ui) this.updateTasksUI(this.ui);
    }
    this.ui?.setUndoEnabled(this.placement.canUndo);
  };

  private onFinish = async () => {
    this.playUiClick();

    if (this.gameState.locked) return;

    if (!this.isRequiredComplete()) {
      toast("Place all required items first");
      return;
    }

    this.gameState.locked = true;
    this.clearBlueprintPreview();
    this.ui?.clearItemSelection();

    setHint("Submitting design...");

    await this.delay(650);
    setHint("Voting...");
    await this.delay(650);

    const stars = 4.6 + Math.random() * 0.3;
    const rewardCoins = 250;
    const rewardDiamonds = 1;
    this.gameState.coins += rewardCoins;
    this.gameState.diamonds += rewardDiamonds;

    this.ui?.setCurrencies({ coins: this.gameState.coins, diamonds: this.gameState.diamonds });
    this.ui?.showResult({ stars: Math.min(4.9, stars), coins: rewardCoins, diamonds: rewardDiamonds });
    setHint("");
  };

  private onTogglePanel = () => {
    this.playUiClick();
  };

  private onToggleLeftPanel = () => {
    this.playUiClick();
  };

  private onToggleDayNight = () => {
    this.playUiClick();

    const isNight = this.lighting.toggleNight();
    this.ui?.setDayNightIcon(isNight);
    this.ui?.setNightMode(isNight);
    this.requestShadowUpdate();
  };

  private onCTA = () => {
    this.playUiClick({ startTheme: false });
    this.openStore();
  };

  private onDismissTutorial = () => {
    this.tutorial.dismissOverlay();
  };

  private async boot() {
    try {
      await loadEnvironment({ scene: this.scene, gltfCache: this.gltfCache, modelPath: MODEL_PATHS.ground, setLoading });
      await this.templateLibrary.load();
      this.animationSystem.registerAll(this.templateLibrary.getAllAnimations());
      await this.vfxSystem.load();
      setLoading(1.0, "Ready!");
      await this.setupSlotMarkers();
      this.placement.setSlots(this.slots);
      this.requestShadowUpdate();
      
      this.gameState.locked = false;
      if (this.ui) this.updateTasksUI(this.ui);
      setHint("Pick an item below.");
    } catch (err) {
      console.error(err);
      setLoading(1.0, "Load failed (see console)");
    }
  }
}
