import * as THREE from "three";

export function createPlacementSystem({
  scene,
  camera,
  domElement,
  gardenPlane,
  boundsSize = 3.0
}) {
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();

  const history = [];
  const maxHistory = 30;

  const bounds = {
    minX: -boundsSize,
    maxX:  boundsSize,
    minZ: -boundsSize,
    maxZ:  boundsSize
  };

  let slots = [];
  let slotPickMeshes = [];

  let activeBlueprint = null;
  let placedObjects = [];
  let selectedObject = null;

  function pushHistory(entry) {
    history.push(entry);
    if (history.length > maxHistory) history.shift();
  }

  function screenToNDC(clientX, clientY) {
    const rect = domElement.getBoundingClientRect();
    pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
  }

  function clampToBounds(p) {
    p.x = Math.min(bounds.maxX, Math.max(bounds.minX, p.x));
    p.z = Math.min(bounds.maxZ, Math.max(bounds.minZ, p.z));
    return p;
  }

  function raycastPlane(clientX, clientY) {
    screenToNDC(clientX, clientY);
    raycaster.setFromCamera(pointerNdc, camera);
    const hits = raycaster.intersectObject(gardenPlane, false);
    if (!hits.length) return null;
    const p = hits[0].point.clone();
    p.y = 0;
    return clampToBounds(p);
  }

  function getSlotById(id) {
    return slots.find((s) => s.id === id) || null;
  }

  function slotAcceptsItem(slot, itemDef) {
    if (!slot || !itemDef) return false;
    if (slot.allowedItemIds?.length) return slot.allowedItemIds.includes(itemDef.id);
    if (slot.allowedCategories?.length) return slot.allowedCategories.includes(itemDef.categoryId);
    return true;
  }

  function pickSlotFromMeshes(clientX, clientY) {
    if (!slotPickMeshes.length) return null;
    screenToNDC(clientX, clientY);
    raycaster.setFromCamera(pointerNdc, camera);
    const hits = raycaster.intersectObjects(slotPickMeshes, true);
    if (!hits.length) return null;

    let o = hits[0].object;
    while (o && !o.userData?.slotId) o = o.parent;
    if (!o?.userData?.slotId) return null;
    return getSlotById(o.userData.slotId);
  }

  function nearestCompatibleSlot(point, itemDef) {
    if (!point) return null;
    let best = null;
    let bestD2 = Infinity;

    for (const s of slots) {
      if (s.occupiedBy) continue;
      if (!slotAcceptsItem(s, itemDef)) continue;
      const d2 = point.distanceToSquared(s.position);
      const r = s.radius ?? 0.9;
      if (d2 <= r * r && d2 < bestD2) {
        best = s;
        bestD2 = d2;
      }
    }
    return best;
  }

  function findBestSlot(clientX, clientY, itemDef) {
    const direct = pickSlotFromMeshes(clientX, clientY);
    if (direct && !direct.occupiedBy && slotAcceptsItem(direct, itemDef)) return direct;

    const p = raycastPlane(clientX, clientY);
    if (!p) return null;
    return nearestCompatibleSlot(p, itemDef);
  }

  function setSlots(newSlots) {
    slots = (newSlots || []).map((s) => ({
      ...s,
      position: s.position.clone ? s.position.clone() : new THREE.Vector3().copy(s.position),
      occupiedBy: null
    }));
    slotPickMeshes = slots.map((s) => s.pickMesh).filter(Boolean);
  }

  function occupy(slotId, obj) {
    const s = getSlotById(slotId);
    if (!s) return;
    s.occupiedBy = obj;
  }

  function free(slotId, obj) {
    const s = getSlotById(slotId);
    if (!s) return;
    if (!obj || s.occupiedBy === obj) s.occupiedBy = null;
  }

  function setBlueprint(mesh, itemDef, cloneFn) {
    clearBlueprint();
    activeBlueprint = { mesh, itemDef, cloneFn };
    mesh.userData.isBlueprint = true;
    scene.add(mesh);
  }

  function clearBlueprint() {
    if (activeBlueprint?.mesh) scene.remove(activeBlueprint.mesh);
    activeBlueprint = null;
  }

  function getActiveBlueprint() {
    return activeBlueprint;
  }

  function getActiveItemDef() {
    return activeBlueprint?.itemDef || null;
  }

  function updateBlueprintPosition(clientX, clientY) {
    if (!activeBlueprint) return;
    const slot = findBestSlot(clientX, clientY, activeBlueprint.itemDef);
    if (!slot) {
      activeBlueprint.mesh.visible = false;
      return;
    }
    activeBlueprint.mesh.visible = true;
    activeBlueprint.mesh.position.copy(slot.position);
    activeBlueprint.mesh.rotation.y = slot.rotationY ?? 0;
    activeBlueprint.mesh.position.y += (slot.previewLift ?? 0.02);
  }

  function placeAt(clientX, clientY, onSpawn) {
    if (!activeBlueprint) return null;

    const slot = findBestSlot(clientX, clientY, activeBlueprint.itemDef);
    if (!slot) return null;

    const placedMesh = activeBlueprint.cloneFn
      ? activeBlueprint.cloneFn()
      : activeBlueprint.mesh.clone(true);

    placedMesh.userData = {
      ...placedMesh.userData,
      isBlueprint: false,
      itemId: activeBlueprint.itemDef.id,
      slotId: slot.id
    };

    placedMesh.position.copy(slot.position);
    placedMesh.rotation.y = slot.rotationY ?? 0;

    scene.add(placedMesh);
    placedObjects.push(placedMesh);
    selectedObject = placedMesh;

    occupy(slot.id, placedMesh);
    pushHistory({ type: "place", object: placedMesh, slotId: slot.id });

    onSpawn?.(placedMesh, slot);
    return { object: placedMesh, slot };
  }

  function pickPlaced(clientX, clientY) {
    screenToNDC(clientX, clientY);
    raycaster.setFromCamera(pointerNdc, camera);

    const hits = raycaster.intersectObjects(placedObjects, true);
    if (!hits.length) return null;

    let o = hits[0].object;
    while (o && !placedObjects.includes(o)) o = o.parent;
    selectedObject = o || null;
    return selectedObject;
  }

  function clearSelection() {
    selectedObject = null;
  }

  function removeObject(obj, { keepHistory = true } = {}) {
    if (!obj) return false;
    const slotId = obj.userData?.slotId;
    placedObjects = placedObjects.filter((x) => x !== obj);
    scene.remove(obj);
    if (slotId) free(slotId, obj);
    if (selectedObject === obj) selectedObject = null;
    if (keepHistory) pushHistory({ type: "delete", object: obj, slotId });
    return true;
  }

  function undoLast() {
    const last = history.pop();
    if (!last) return null;

    if (last.type === "place") {
      const obj = last.object;
      if (!obj) return null;
      if (obj?.parent) scene.remove(obj);
      placedObjects = placedObjects.filter((x) => x !== obj);
      free(last.slotId, obj);
      if (selectedObject === obj) selectedObject = null;
      return { type: "place", object: obj, slotId: last.slotId };
    }

    if (last.type === "delete") {
      const obj = last.object;
      if (!obj) return null;
      if (!placedObjects.includes(obj)) {
        placedObjects.push(obj);
        scene.add(obj);
      }
      occupy(last.slotId, obj);
      selectedObject = obj;
      return { type: "delete", object: obj, slotId: last.slotId };
    }

    return null;
  }

  return {
    setSlots,
    setBlueprint,
    clearBlueprint,
    getActiveBlueprint,
    getActiveItemDef,
    updateBlueprintPosition,
    placeAt,
    pickPlaced,
    clearSelection,
    removeObject,
    undoLast,
    getSelected() { return selectedObject; },
    get canUndo() { return history.length > 0; },
    get hasBlueprint() { return !!activeBlueprint; },
    getSlots() { return slots; },
  };
}

