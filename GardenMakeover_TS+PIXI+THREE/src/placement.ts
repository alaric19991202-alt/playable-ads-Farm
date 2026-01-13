import * as THREE from "three";
import type { ItemDef, SlotDef } from "./types";

type PlacementParams = {
  scene: THREE.Scene;
  camera: THREE.Camera;
  domElement: HTMLElement;
  gardenPlane: THREE.Object3D;
  boundsSize?: number;
};

type HistoryEntry = {
  type: "place" | "delete";
  object: THREE.Object3D;
  slotId: string;
};

type Blueprint = {
  mesh: THREE.Object3D;
  itemDef: ItemDef;
  cloneFn?: () => THREE.Object3D;
};

export class PlacementSystem {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private domElement: HTMLElement;
  private gardenPlane: THREE.Object3D;

  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();

  private history: HistoryEntry[] = [];
  private maxHistory = 30;

  private bounds;

  private slots: SlotDef[] = [];
  private slotPickMeshes: THREE.Object3D[] = [];

  private activeBlueprint: Blueprint | null = null;
  private placedObjects: THREE.Object3D[] = [];
  private selectedObject: THREE.Object3D | null = null;

  constructor({ scene, camera, domElement, gardenPlane, boundsSize = 3.0 }: PlacementParams) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;
    this.gardenPlane = gardenPlane;

    this.bounds = {
      minX: -boundsSize,
      maxX: boundsSize,
      minZ: -boundsSize,
      maxZ: boundsSize
    };
  }

  private pushHistory(entry: HistoryEntry) {
    this.history.push(entry);
    if (this.history.length > this.maxHistory) this.history.shift();
  }

  private screenToNDC(clientX: number, clientY: number) {
    const rect = this.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
  }

  private clampToBounds(p: THREE.Vector3) {
    p.x = Math.min(this.bounds.maxX, Math.max(this.bounds.minX, p.x));
    p.z = Math.min(this.bounds.maxZ, Math.max(this.bounds.minZ, p.z));
    return p;
  }

  private raycastPlane(clientX: number, clientY: number) {
    this.screenToNDC(clientX, clientY);
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObject(this.gardenPlane, false);
    if (!hits.length) return null;
    const p = hits[0].point.clone();
    p.y = 0;
    return this.clampToBounds(p);
  }

  private getSlotById(id: string) {
    return this.slots.find((s) => s.id === id) || null;
  }

  private slotAcceptsItem(slot: SlotDef | null, itemDef: ItemDef | null) {
    if (!slot || !itemDef) return false;
    if (slot.allowedItemIds?.length) return slot.allowedItemIds.includes(itemDef.id);
    if (slot.allowedCategories?.length) return slot.allowedCategories.includes(itemDef.categoryId || "");
    return true;
  }

  private pickSlotFromMeshes(clientX: number, clientY: number) {
    if (!this.slotPickMeshes.length) return null;
    this.screenToNDC(clientX, clientY);
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObjects(this.slotPickMeshes, true);
    if (!hits.length) return null;

    let o: THREE.Object3D | null = hits[0].object;
    while (o && !o.userData?.slotId) o = o.parent;
    if (!o?.userData?.slotId) return null;
    return this.getSlotById(o.userData.slotId as string);
  }

  private nearestCompatibleSlot(point: THREE.Vector3 | null, itemDef: ItemDef | null) {
    if (!point) return null;
    let best: SlotDef | null = null;
    let bestD2 = Infinity;

    for (const s of this.slots) {
      if (s.occupiedBy) continue;
      if (!this.slotAcceptsItem(s, itemDef)) continue;
      const d2 = point.distanceToSquared(s.position);
      const r = s.radius ?? 0.9;
      if (d2 <= r * r && d2 < bestD2) {
        best = s;
        bestD2 = d2;
      }
    }
    return best;
  }

  private findBestSlot(clientX: number, clientY: number, itemDef: ItemDef | null) {
    const direct = this.pickSlotFromMeshes(clientX, clientY);
    if (direct && !direct.occupiedBy && this.slotAcceptsItem(direct, itemDef)) return direct;

    const p = this.raycastPlane(clientX, clientY);
    if (!p) return null;
    return this.nearestCompatibleSlot(p, itemDef);
  }

  setSlots(newSlots: SlotDef[]) {
    this.slots = (newSlots || []).map((s) => ({
      ...s,
      position: s.position.clone ? s.position.clone() : new THREE.Vector3().copy(s.position),
      occupiedBy: null
    }));
    this.slotPickMeshes = this.slots.map((s) => s.pickMesh).filter(Boolean) as THREE.Object3D[];
  }

  private occupy(slotId: string, obj: THREE.Object3D) {
    const s = this.getSlotById(slotId);
    if (!s) return;
    s.occupiedBy = obj;
  }

  private free(slotId: string, obj: THREE.Object3D) {
    const s = this.getSlotById(slotId);
    if (!s) return;
    if (!obj || s.occupiedBy === obj) s.occupiedBy = null;
  }

  setBlueprint(mesh: THREE.Object3D, itemDef: ItemDef, cloneFn?: () => THREE.Object3D) {
    this.clearBlueprint();
    this.activeBlueprint = { mesh, itemDef, cloneFn };
    mesh.userData.isBlueprint = true;
    this.scene.add(mesh);
  }

  clearBlueprint() {
    if (this.activeBlueprint?.mesh) this.scene.remove(this.activeBlueprint.mesh);
    this.activeBlueprint = null;
  }

  getActiveBlueprint() {
    return this.activeBlueprint;
  }

  getActiveItemDef() {
    return this.activeBlueprint?.itemDef || null;
  }

  updateBlueprintPosition(clientX: number, clientY: number) {
    if (!this.activeBlueprint) return;
    const slot = this.findBestSlot(clientX, clientY, this.activeBlueprint.itemDef);
    if (!slot) {
      this.activeBlueprint.mesh.visible = false;
      return;
    }
    this.activeBlueprint.mesh.visible = true;
    this.activeBlueprint.mesh.position.copy(slot.position);
    this.activeBlueprint.mesh.rotation.y = slot.rotationY ?? 0;
    this.activeBlueprint.mesh.position.y += (slot.previewLift ?? 0.02);
  }

  placeAt(clientX: number, clientY: number, onSpawn?: (obj: THREE.Object3D, slot: SlotDef) => void) {
    if (!this.activeBlueprint) return null;

    const slot = this.findBestSlot(clientX, clientY, this.activeBlueprint.itemDef);
    if (!slot) return null;

    const placedMesh = this.activeBlueprint.cloneFn
      ? this.activeBlueprint.cloneFn()
      : this.activeBlueprint.mesh.clone(true);

    placedMesh.userData = {
      ...placedMesh.userData,
      isBlueprint: false,
      itemId: this.activeBlueprint.itemDef.id,
      slotId: slot.id
    };

    placedMesh.position.copy(slot.position);
    placedMesh.rotation.y = slot.rotationY ?? 0;

    this.scene.add(placedMesh);
    this.placedObjects.push(placedMesh);
    this.selectedObject = placedMesh;

    this.occupy(slot.id, placedMesh);
    this.pushHistory({ type: "place", object: placedMesh, slotId: slot.id });

    onSpawn?.(placedMesh, slot);
    return { object: placedMesh, slot };
  }

  pickPlaced(clientX: number, clientY: number) {
    this.screenToNDC(clientX, clientY);
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);

    const hits = this.raycaster.intersectObjects(this.placedObjects, true);
    if (!hits.length) return null;

    let o: THREE.Object3D | null = hits[0].object;
    while (o && !this.placedObjects.includes(o)) o = o.parent;
    this.selectedObject = o || null;
    return this.selectedObject;
  }

  clearSelection() {
    this.selectedObject = null;
  }

  removeObject(obj: THREE.Object3D, { keepHistory = true } = {}) {
    if (!obj) return false;
    const slotId = obj.userData?.slotId as string;
    this.placedObjects = this.placedObjects.filter((x) => x !== obj);
    this.scene.remove(obj);
    if (slotId) this.free(slotId, obj);
    if (this.selectedObject === obj) this.selectedObject = null;
    if (keepHistory) this.pushHistory({ type: "delete", object: obj, slotId });
    return true;
  }

  undoLast() {
    const last = this.history.pop();
    if (!last) return null;

    if (last.type === "place") {
      const obj = last.object;
      if (!obj) return null;
      if (obj?.parent) this.scene.remove(obj);
      this.placedObjects = this.placedObjects.filter((x) => x !== obj);
      this.free(last.slotId, obj);
      if (this.selectedObject === obj) this.selectedObject = null;
      return { type: "place", object: obj, slotId: last.slotId };
    }

    if (last.type === "delete") {
      const obj = last.object;
      if (!obj) return null;
      if (!this.placedObjects.includes(obj)) {
        this.placedObjects.push(obj);
        this.scene.add(obj);
      }
      this.occupy(last.slotId, obj);
      this.selectedObject = obj;
      return { type: "delete", object: obj, slotId: last.slotId };
    }

    return null;
  }

  getSelected() {
    return this.selectedObject;
  }

  get canUndo() {
    return this.history.length > 0;
  }

  get hasBlueprint() {
    return !!this.activeBlueprint;
  }

  getSlots() {
    return this.slots;
  }
}

export function createPlacementSystem(params: PlacementParams) {
  return new PlacementSystem(params);
}
