import { CATEGORIES, ITEMS } from "./assets.js";

export function buildUI({
  onSelectCategory,
  onSelectItem,
  onUndo,
  onFinish,
  onTogglePanel,
  onToggleLeftPanel,
  onToggleDayNight,
  onCTA,
  onDismissTutorial
}) {
  const elCategoryTabs = document.getElementById("categoryTabs");
  const elItemCarousel = document.getElementById("itemCarousel");
  const elTaskList = document.getElementById("taskList");
  const elBonusList = document.getElementById("bonusList");

  const elCoins = document.getElementById("coinVal");
  const elDiamonds = document.getElementById("diamondVal");
  const elEnergy = document.getElementById("energyVal");

  const leftPanel = document.getElementById("leftPanel");
  const btnLeftToggle = document.getElementById("btnLeftToggle");
  const bottomBar = document.getElementById("bottomBar");
  const bottomBarBody = document.getElementById("bottomBarBody");
  const btnUndo = document.getElementById("btnUndo");
  const btnFinish = document.getElementById("btnFinish");
  const btnPanelToggle = document.getElementById("btnPanelToggle");
  const btnDayNight = document.getElementById("btnDayNight");
  const tutorial = document.getElementById("tutorial");
  const tutorialOk = document.getElementById("tutorialOk");

  const modal = document.getElementById("resultModal");
  const starText = document.getElementById("starText");
  const starValue = document.getElementById("starValue");
  const rewardCoins = document.getElementById("rewardCoins");
  const rewardDiamonds = document.getElementById("rewardDiamonds");
  const btnCTA = document.getElementById("btnCTA");

  let selectedCategory = CATEGORIES[0]?.id ?? "plants";
  let selectedItemId = null;
  let panelOpen = true;
  let leftPanelOpen = true;

  function renderCategoryTabs() {
    if (!elCategoryTabs) return;
    elCategoryTabs.innerHTML = "";
    CATEGORIES.forEach((category) => {
      const button = document.createElement("button");
      button.className = "categoryTab" + (category.id === selectedCategory ? " selected" : "");
      button.textContent = category.emoji || category.label[0];
      button.setAttribute("aria-label", category.label);
      button.onclick = () => {
        selectedCategory = category.id;
        selectedItemId = null;
        renderCategoryTabs();
        renderItems();
        onSelectCategory?.(selectedCategory);
      };
      elCategoryTabs.appendChild(button);
    });
  }

  function renderItems() {
    if (!elItemCarousel) return;
    elItemCarousel.innerHTML = "";
    const items = ITEMS[selectedCategory] || [];

    items.forEach((item) => {
      const button = document.createElement("button");
      button.className = "itemCard" + (item.id === selectedItemId ? " selected" : "");
      button.setAttribute("aria-label", item.label);

      const thumb = document.createElement("img");
      thumb.className = "itemThumb";
      thumb.src = item.icon || "assets/images/plus.png";
      thumb.alt = "";
      thumb.onerror = () => {
        thumb.onerror = null;
        thumb.src = "assets/images/plus.png";
      };

      const label = document.createElement("div");
      label.className = "itemName";
      label.textContent = item.label;

      const pricePill = document.createElement("div");
      pricePill.className = "pricePill";
      const priceIcon = document.createElement("span");
      priceIcon.className = "pillEmoji";
      priceIcon.textContent = item.currency === "diamond" ? "💎" : "🪙";
      const priceValue = document.createElement("span");
      priceValue.textContent = String(item.cost ?? 0);
      pricePill.appendChild(priceIcon);
      pricePill.appendChild(priceValue);

      button.appendChild(thumb);
      button.appendChild(label);
      button.appendChild(pricePill);
      button.onclick = () => {
        selectedItemId = item.id;
        renderItems();
        onSelectItem?.(selectedCategory, item);
      };

      elItemCarousel.appendChild(button);
    });
  }

  function setCurrencies({ coins, diamonds }) {
    if (elCoins) elCoins.textContent = String(Math.max(0, Math.floor(coins)));
    if (elDiamonds) elDiamonds.textContent = String(Math.max(0, Math.floor(diamonds)));
  }

  function setEnergy(cur, max) {
    if (elEnergy) elEnergy.textContent = `${Math.max(0, cur)}/${Math.max(1, max)}`;
  }

  function setUndoEnabled(enabled) {
    if (btnUndo) btnUndo.disabled = !enabled;
  }

  function setFinishEnabled(enabled, pulse = false) {
    if (!btnFinish) return;
    btnFinish.disabled = !enabled;
    btnFinish.classList.toggle("pulse", enabled && pulse);
  }

  function clearItemSelection() {
    selectedItemId = null;
    renderItems();
  }

  function setPanelOpen(open) {
    panelOpen = !!open;
    if (bottomBar) bottomBar.classList.toggle("collapsed", !panelOpen);
    if (btnPanelToggle) btnPanelToggle.setAttribute("aria-expanded", String(panelOpen));
    if (bottomBarBody) bottomBarBody.setAttribute("aria-hidden", panelOpen ? "false" : "true");
  }

  function togglePanel() {
    setPanelOpen(!panelOpen);
    onTogglePanel?.(panelOpen);
  }

  function setLeftPanelOpen(open) {
    leftPanelOpen = !!open;
    if (leftPanel) leftPanel.classList.toggle("collapsed", !leftPanelOpen);
    if (btnLeftToggle) {
      btnLeftToggle.classList.toggle("collapsed", !leftPanelOpen);
      btnLeftToggle.setAttribute("aria-expanded", String(leftPanelOpen));
    }
    if (leftPanel) leftPanel.setAttribute("aria-hidden", leftPanelOpen ? "false" : "true");
  }

  function toggleLeftPanel() {
    setLeftPanelOpen(!leftPanelOpen);
    onToggleLeftPanel?.(leftPanelOpen);
  }

  function renderTaskList(el, tasks, kind) {
    if (!el) return;
    el.innerHTML = "";
    tasks.forEach((task) => {
      const row = document.createElement("div");
      row.className = "taskRow" + (task.done ? " done" : "");

      const left = document.createElement("div");
      left.className = "taskLeft";

      const dot = document.createElement("div");
      dot.className = "taskDot" + (kind === "bonus" ? " bonus" : "");

      const label = document.createElement("div");
      label.className = "taskLabel";
      label.textContent = task.label;

      const check = document.createElement("div");
      check.className = "taskCheck";
      check.textContent = task.done ? "\u2713" : "";

      left.appendChild(dot);
      left.appendChild(label);
      row.appendChild(left);
      row.appendChild(check);
      el.appendChild(row);
    });
  }

  function setTasks(requiredTasks, bonusTasks) {
    renderTaskList(elTaskList, requiredTasks, "required");
    renderTaskList(elBonusList, bonusTasks, "bonus");
  }

  function setDayNightIcon(isNight) {
    if (btnDayNight) btnDayNight.textContent = isNight ? "☀️" : "🌙";
  }

  function showTutorial(show, text) {
    if (!tutorial) return;
    tutorial.classList.toggle("hidden", !show);
    tutorial.setAttribute("aria-hidden", show ? "false" : "true");
    const textEl = document.getElementById("tutorialText");
    if (textEl && text) textEl.textContent = text;
  }

  function showResult({ stars = 4.6, coins = 250, diamonds = 1 }) {
    if (!modal) return;
    const fullStars = Math.floor(stars);
    const hasHalf = stars - fullStars >= 0.5;
    const emptyStars = Math.max(0, 5 - fullStars - (hasHalf ? 1 : 0));
    const fullStar = "\u2605";
    const emptyStar = "\u2606";
    const starBar = fullStar.repeat(fullStars) + (hasHalf ? fullStar : "") + emptyStar.repeat(emptyStars);
    if (starText) starText.textContent = starBar;
    if (starValue) starValue.textContent = stars.toFixed(1);
    if (rewardCoins) rewardCoins.textContent = `+${coins}`;
    if (rewardDiamonds) rewardDiamonds.textContent = `+${diamonds}`;

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
  }

  function hideResult() {
    if (!modal) return;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  }

  if (btnUndo) btnUndo.onclick = () => onUndo?.();
  if (btnFinish) btnFinish.onclick = () => onFinish?.();
  if (btnPanelToggle) btnPanelToggle.onclick = () => togglePanel();
  if (btnLeftToggle) btnLeftToggle.onclick = () => toggleLeftPanel();
  if (btnDayNight) btnDayNight.onclick = () => onToggleDayNight?.();
  if (tutorialOk) tutorialOk.onclick = () => onDismissTutorial?.();
  if (btnCTA) btnCTA.onclick = () => onCTA?.();

  renderCategoryTabs();
  renderItems();
  setPanelOpen(true);
  setLeftPanelOpen(true);

  return {
    setCurrencies,
    setEnergy,
    setTasks,
    setUndoEnabled,
    setFinishEnabled,
    clearItemSelection,
    setDayNightIcon,
    showTutorial,
    showResult,
    hideResult
  };
}

export function setHint(text, ms = 1700) {
  const el = document.getElementById("hint");
  if (!el) return;
  el.textContent = text || "";
  el.classList.toggle("show", !!text);

  window.clearTimeout(setHint._t);
  if (text) {
    setHint._t = window.setTimeout(() => {
      el.classList.remove("show");
    }, ms);
  }
}

export function toast(msg, ms = 1100) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden");
  el.style.animation = "none";
  void el.offsetHeight;
  el.style.animation = `fadeInOut ${ms}ms ease`;
  el.style.animationFillMode = "both";
  window.clearTimeout(toast._t);
  toast._t = window.setTimeout(() => {
    el.classList.add("hidden");
  }, ms);
}

export function setLoading(progress01, text) {
  const overlay = document.getElementById("loading");
  const bar = document.getElementById("loadingBarFill");
  const label = document.getElementById("loadingText");

  if (bar) bar.style.width = `${Math.round(progress01 * 100)}%`;
  if (label && text) label.textContent = text;

  if (progress01 >= 1 && overlay) overlay.style.display = "none";
}

