import { CATEGORIES, ITEMS } from "./assets.js";

const getRequiredElement = (id) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element: ${id}`);
  return element;
};

const getOptionalElement = (id) => document.getElementById(id);

export function buildUI({
  onSelectCategory,
  onSelectItem,
  onUndo,
  onBoost,
  onCameraToggle,
  onFovChange,
  onTogglePicker,
  onAssistMove,
  onAssistRotate,
  onAssistDelete,
  onRotate,
  onDelete,
  onCTA
}) {
  const categoriesEl = getRequiredElement("categories");
  const itemsEl = getRequiredElement("items");

  const clockTime = getRequiredElement("clockTime");
  const clockState = getRequiredElement("clockState");
  const btnCameraMode = getOptionalElement("btnCameraMode");
  const fovPanel = getOptionalElement("fovPanel");
  const fovSlider = getOptionalElement("fovSlider");
  const fovValue = getOptionalElement("fovValue");
  const btnBoost = getOptionalElement("btnBoost");
  const boostLabel = getOptionalElement("boostLabel");
  const btnUndo = getOptionalElement("btnUndo");
  const btnRotate = getOptionalElement("btnRotate");
  const btnDelete = getOptionalElement("btnDelete");
  const btnCTA = getOptionalElement("btnCTA");
  const picker = getRequiredElement("picker");
  const btnPanelToggle = getOptionalElement("btnPanelToggle");
  const assist = getOptionalElement("assist");
  const assistMove = getOptionalElement("assistMove");
  const assistRotate = getOptionalElement("assistRotate");
  const assistDelete = getOptionalElement("assistDelete");

  let selectedCategory = CATEGORIES[0]?.id ?? "";
  let selectedItemId = null;
  let isFovPanelOpen = false;
  let isPickerOpen = true;

  function setPickerOpen(open, fromUser = false) {
    isPickerOpen = open;
    document.body.classList.toggle("panel-closed", !open);
    if (btnPanelToggle) {
      btnPanelToggle.setAttribute("aria-pressed", open ? "true" : "false");
      btnPanelToggle.setAttribute("aria-label", open ? "Hide panel" : "Show panel");
    }
    if (fromUser) onTogglePicker?.(open);
    picker.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function setFovPanelOpen(open) {
    isFovPanelOpen = open;
    if (fovPanel) {
      fovPanel.classList.toggle("open", open);
      fovPanel.setAttribute("aria-hidden", open ? "false" : "true");
    }
    if (btnCameraMode) {
      btnCameraMode.setAttribute("aria-expanded", open ? "true" : "false");
    }
  }

  function renderCategories() {
    categoriesEl.innerHTML = "";
    CATEGORIES.forEach((category, index) => {
      const button = document.createElement("button");
      button.className = `btn categoryBtn${category.id === selectedCategory ? " selected" : ""}`;
      button.style.setProperty("--i", index);
      button.textContent = category.label;
      button.onclick = () => {
        selectedCategory = category.id;
        selectedItemId = null;
        renderCategories();
        renderItems();
        onSelectCategory?.(selectedCategory);
      };
      categoriesEl.appendChild(button);
    });
  }

  function renderItems() {
    itemsEl.innerHTML = "";
    const items = ITEMS[selectedCategory] ?? [];
    items.forEach((item, index) => {
      const button = document.createElement("button");
      button.className = `btn itemBtn${item.id === selectedItemId ? " selected" : ""}`;
      button.style.setProperty("--i", index);
      const img = document.createElement("img");
      img.className = "itemIcon";
      img.src = item.icon;
      img.alt = "";
      const label = document.createElement("span");
      label.textContent = item.label;

      button.appendChild(img);
      button.appendChild(label);

      button.onclick = () => {
        selectedItemId = item.id;
        renderItems();
        onSelectItem?.(selectedCategory, item);
      };
      itemsEl.appendChild(button);
    });
  }

  if (btnUndo) btnUndo.onclick = () => onUndo?.();
  if (btnBoost) btnBoost.onclick = () => onBoost?.();
  if (btnCameraMode) {
    btnCameraMode.onclick = () => {
      const nextOpen = !isFovPanelOpen;
      setFovPanelOpen(nextOpen);
      onCameraToggle?.(nextOpen);
    };
  }
  if (btnRotate) btnRotate.onclick = () => onRotate?.();
  if (btnDelete) btnDelete.onclick = () => onDelete?.();
  if (btnCTA) btnCTA.onclick = () => onCTA?.();
  if (btnPanelToggle) {
    btnPanelToggle.onclick = () => {
      setPickerOpen(!isPickerOpen, true);
    };
  }
  if (assistMove) {
    assistMove.onclick = (event) => {
      event.stopPropagation();
      onAssistMove?.();
    };
  }
  if (assistRotate) {
    assistRotate.onclick = (event) => {
      event.stopPropagation();
      onAssistRotate?.();
    };
  }
  if (assistDelete) {
    assistDelete.onclick = (event) => {
      event.stopPropagation();
      onAssistDelete?.();
    };
  }

  if (fovSlider) {
    fovSlider.addEventListener("input", () => {
      const value = Number(fovSlider.value);
      if (fovValue) fovValue.textContent = String(value);
      onFovChange?.(value);
    });
  }

  document.addEventListener("pointerdown", (event) => {
    if (!isFovPanelOpen || !fovPanel || !btnCameraMode) return;
    if (fovPanel.contains(event.target) || btnCameraMode.contains(event.target)) return;
    setFovPanelOpen(false);
  });

  renderCategories();
  renderItems();
  setPickerOpen(true, false);

  return {
    setClock(timeText, isNight) {
      clockTime.textContent = timeText;
      clockState.textContent = isNight ? "Night" : "Day";
      clockState.classList.toggle("night", isNight);
    },
    setBoostLabel(multiplierText) {
      if (boostLabel) boostLabel.textContent = multiplierText;
    },
    setFovValue(value) {
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) return;
      const clamped = Math.max(10, Math.min(80, Math.round(numericValue)));
      if (fovSlider) fovSlider.value = String(clamped);
      if (fovValue) fovValue.textContent = String(clamped);
    },
    clearItemSelection() {
      selectedItemId = null;
      renderItems();
    },
    showAssistAt(x, y) {
      if (!assist) return;
      assist.style.left = `${x}px`;
      assist.style.top = `${y}px`;
      assist.classList.add("visible");
      assist.setAttribute("aria-hidden", "false");
    },
    hideAssist() {
      if (!assist) return;
      assist.classList.remove("visible");
      assist.setAttribute("aria-hidden", "true");
    },
    setAssistMode(mode) {
      if (!assistMove || !assistRotate || !assistDelete) return;
      assistMove.classList.toggle("active", mode === "move");
      assistRotate.classList.toggle("active", mode === "rotate");
      assistDelete.classList.toggle("active", mode === "delete");
    },
    setUndoEnabled(enabled) {
      if (btnUndo) btnUndo.disabled = !enabled;
    }
  };
}

export function setHint(text) {
  const hintEl = getOptionalElement("hint");
  if (!hintEl) return;
  hintEl.textContent = text || "";
}

let toastTimeoutId = 0;

export function toast(message, duration = 1100) {
  const toastEl = getOptionalElement("toast");
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.remove("hidden");
  toastEl.style.animation = "none";
  void toastEl.offsetHeight;
  toastEl.style.animation = `fadeInOut ${duration}ms ease`;
  toastEl.style.animationFillMode = "both";
  window.clearTimeout(toastTimeoutId);
  toastTimeoutId = window.setTimeout(() => {
    toastEl.classList.add("hidden");
  }, duration);
}

export function setLoading(progress01, text) {
  const overlay = getOptionalElement("loading");
  const bar = getOptionalElement("loadingBarFill");
  const label = getOptionalElement("loadingText");
  if (!overlay || !bar || !label) return;

  const numericProgress = Number(progress01);
  const clamped = Number.isFinite(numericProgress) ? Math.max(0, Math.min(1, numericProgress)) : 0;
  bar.style.width = `${Math.round(clamped * 100)}%`;
  if (text) label.textContent = text;
  if (clamped >= 1) overlay.style.display = "none";
}
