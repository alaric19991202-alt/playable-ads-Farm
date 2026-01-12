import * as THREE from "three";
export function createPlacementSystem({
  scene,
  camera,
  domElement,
  gardenPlane,
  boundsSize = 3.0
}) {
  if (!scene) throw new Error("Placement system requires a scene");
  if (!camera) throw new Error("Placement system requires a camera");
  if (!domElement) throw new Error("Placement system requires a DOM element");
  if (!gardenPlane) throw new Error("Placement system requires a garden plane");

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const history = [];
  const maxHistory = 40;
  const size = Number.isFinite(boundsSize) ? Math.abs(boundsSize) : 3.0;

  const bounds = {
    minX: -size,
    maxX: size,
    minZ: -size,
    maxZ: size
  };

  let blueprint = null;
  let placedItems = [];
  let selectedItem = null;
  let moveStartPosition = null;

  function recordHistory(entry) {
    history.push(entry);
    if (history.length > maxHistory) history.shift();
  }

  function screenToNDC(clientX, clientY) {
    const rect = domElement.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
  }

  function clampToBounds(p) {
    p.x = Math.min(bounds.maxX, Math.max(bounds.minX, p.x));
    p.z = Math.min(bounds.maxZ, Math.max(bounds.minZ, p.z));
    return p;
  }

  function raycastPlane(clientX, clientY) {
    screenToNDC(clientX, clientY);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(gardenPlane, false);
    if (!hits.length) return null;
    const point = hits[0].point.clone();
    point.y = 0;
    return clampToBounds(point);
  }

  function setBlueprint(mesh, itemDef, cloneFn) {
    clearBlueprint();
    blueprint = { mesh, itemDef, cloneFn };
    mesh.userData.isBlueprint = true;
    scene.add(mesh);
  }

  function clearBlueprint() {
    if (blueprint?.mesh) {
      const ghost = blueprint.mesh;
      ghost.traverse((o) => {
        if (!o.isMesh || !o.material) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((mat) => mat.dispose());
      });
      scene.remove(ghost);
    }
    blueprint = null;
  }

  function updateBlueprintPosition(clientX, clientY) {
    if (!blueprint) return;
    const point = raycastPlane(clientX, clientY);
    if (!point) return;
    blueprint.mesh.position.copy(point);
  }

  function placeAt(clientX, clientY, onSpawn) {
    if (!blueprint) return null;
    const point = raycastPlane(clientX, clientY);
    if (!point) return null;

    const placedItem = blueprint.cloneFn ? blueprint.cloneFn() : blueprint.mesh.clone(true);
    placedItem.userData = { ...placedItem.userData, isBlueprint: false, itemId: blueprint.itemDef.id };
    placedItem.position.copy(point);

    scene.add(placedItem);
    placedItems.push(placedItem);
    selectedItem = placedItem;
    recordHistory({ type: "place", object: placedItem });

    onSpawn?.(placedItem);
    return placedItem;
  }

  function pickPlaced(clientX, clientY) {
    screenToNDC(clientX, clientY);
    raycaster.setFromCamera(ndc, camera);

    const hits = raycaster.intersectObjects(placedItems, true);
    if (!hits.length) return null;

    let node = hits[0].object;
    while (node && !placedItems.includes(node)) node = node.parent;
    selectedItem = node || null;
    return selectedItem;
  }

  function rotateSelected(delta = Math.PI / 4, options = {}) {
    if (!selectedItem) return null;
    const prevRotationY = selectedItem.rotation.y;
    const nextRotationY = prevRotationY + delta;
    if (options.immediate !== false) {
      selectedItem.rotation.y = nextRotationY;
    }
    recordHistory({ type: "rotate", object: selectedItem, prevRotationY });
    return { object: selectedItem, from: prevRotationY, to: nextRotationY };
  }

  function deleteSelected(onDelete) {
    if (!selectedItem) return false;
    const obj = selectedItem;
    placedItems = placedItems.filter((item) => item !== obj);
    selectedItem = null;
    moveStartPosition = null;
    obj.userData.pendingDelete = true;
    recordHistory({ type: "delete", object: obj });
    if (onDelete) onDelete(obj, () => scene.remove(obj));
    else scene.remove(obj);
    return true;
  }

  function beginMoveSelected() {
    if (!selectedItem) return false;
    moveStartPosition = selectedItem.position.clone();
    return true;
  }

  function moveSelectedTo(clientX, clientY) {
    if (!selectedItem) return false;
    const point = raycastPlane(clientX, clientY);
    if (!point) return false;
    selectedItem.position.copy(point);
    return true;
  }

  function endMoveSelected() {
    if (!selectedItem || !moveStartPosition) return false;
    const prevPosition = moveStartPosition;
    moveStartPosition = null;
    if (prevPosition.distanceToSquared(selectedItem.position) < 0.0001) return false;
    recordHistory({ type: "move", object: selectedItem, prevPosition });
    return true;
  }

  function clearSelection() {
    selectedItem = null;
    moveStartPosition = null;
  }

  function undoLast() {
    const last = history.pop();
    if (!last) return false;

    if (last.type === "place") {
      scene.remove(last.object);
      placedItems = placedItems.filter((item) => item !== last.object);
      if (selectedItem === last.object) selectedItem = null;
      return true;
    }

    if (last.type === "delete") {
      last.object.userData.pendingDelete = false;
      if (!placedItems.includes(last.object)) {
        placedItems.push(last.object);
        scene.add(last.object);
      }
      selectedItem = last.object;
      return last.object;
    }

    if (last.type === "move") {
      last.object.position.copy(last.prevPosition);
      selectedItem = last.object;
      return true;
    }

    if (last.type === "rotate") {
      last.object.rotation.y = last.prevRotationY;
      selectedItem = last.object;
      return true;
    }

    return false;
  }

  return {
    setBlueprint,
    clearBlueprint,
    updateBlueprintPosition,
    placeAt,
    pickPlaced,
    rotateSelected,
    deleteSelected,
    beginMoveSelected,
    moveSelectedTo,
    endMoveSelected,
    clearSelection,
    undoLast,
    getSelected() { return selectedItem; },
    get canUndo() { return history.length > 0; },
    get hasBlueprint() { return !!blueprint; },
    get placedCount() { return placedItems.length; }
  };
}
