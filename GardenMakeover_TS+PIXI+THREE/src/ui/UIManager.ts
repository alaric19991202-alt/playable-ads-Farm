import * as PIXI from "pixi.js";
import type { RendererUI } from "../renderers/RendererUI";
import type { EventBus } from "../core/EventBus";
import type { TaskDef } from "../types";
import { TopBar } from "./components/TopBar";
import { TaskPanel } from "./components/TaskPanel";
import { ItemCarousel } from "./components/ItemCarousel";
import { HintToast } from "./components/HintToast";
import { TutorialOverlay } from "./components/TutorialOverlay";
import { ResultModal } from "./components/ResultModal";
import { LoadingScreen } from "./components/LoadingScreen";
import type { ItemDef } from "../types";
import { setTheme } from "./theme";

export class UIManager {
  private rendererUI: RendererUI;
  private eventBus: EventBus;
  private uiLayer = new PIXI.Container();
  private overlayLayer = new PIXI.Container();
  private tutorialBlur = new PIXI.BlurFilter(0);
  private tutorialBlurActive = false;
  private resultBlurActive = false;

  private topBar: TopBar | null = null;
  private taskPanel: TaskPanel | null = null;
  private itemCarousel: ItemCarousel | null = null;
  private hintToast: HintToast | null = null;
  private tutorialOverlay: TutorialOverlay | null = null;
  private resultModal: ResultModal | null = null;
  private loadingScreen: LoadingScreen | null = null;

  private panelOpen = true;
  private leftPanelOpen = true;

  private readonly MinimiumWidthForPanels = 600;

  constructor(rendererUI: RendererUI, eventBus: EventBus) {
    this.rendererUI = rendererUI;
    this.eventBus = eventBus;
    this.rendererUI.stage.sortableChildren = true;
    this.rendererUI.stage.eventMode = "static";
    this.uiLayer.sortableChildren = true;
    this.overlayLayer.sortableChildren = true;
    this.uiLayer.zIndex = 0;
    this.overlayLayer.zIndex = 1;
    this.rendererUI.stage.addChild(this.uiLayer, this.overlayLayer);
  }

  build({
    onSelectCategory,
    onSelectItem,
    onUndo,
    onFinish,
    onTogglePanel,
    onToggleLeftPanel,
    onToggleDayNight,
    onCTA,
    onDismissTutorial
  }: {
    onSelectCategory?: (categoryId: string) => void;
    onSelectItem?: (categoryId: string, itemDef: ItemDef) => void;
    onUndo?: () => void;
    onFinish?: () => void;
    onTogglePanel?: (open: boolean) => void;
    onToggleLeftPanel?: (open: boolean) => void;
    onToggleDayNight?: () => void;
    onCTA?: () => void;
    onDismissTutorial?: () => void;
  }) {
    this.topBar = new TopBar({ onToggleDayNight });
    this.taskPanel = new TaskPanel({
      onToggle: (open) => {
        this.setLeftPanelOpen(open);
        onToggleLeftPanel?.(open);
      }
    });
    this.itemCarousel = new ItemCarousel({
      onSelectCategory,
      onSelectItem,
      onUndo,
      onFinish,
      onTogglePanel: (open) => {
        this.setPanelOpen(open);
        onTogglePanel?.(open);
      }
    });
    this.itemCarousel.enableDragScroll();

    this.hintToast = new HintToast();
    this.tutorialOverlay = new TutorialOverlay({ onDismiss: onDismissTutorial });
    this.resultModal = new ResultModal({ onCTA });
    this.loadingScreen = new LoadingScreen();

    this.topBar.container.zIndex = 1;
    this.taskPanel.container.zIndex = 1;
    this.itemCarousel.container.zIndex = 1;
    this.hintToast.container.zIndex = 2;
    this.tutorialOverlay.container.zIndex = 3;
    this.resultModal.container.zIndex = 4;
    this.loadingScreen.container.zIndex = 5;

    this.uiLayer.addChild(
      this.topBar.container,
      this.taskPanel.container,
      this.itemCarousel.container,
      this.hintToast.container
    );
    this.overlayLayer.addChild(
      this.tutorialOverlay.container,
      this.resultModal.container,
      this.loadingScreen.container
    );

    return this;
  }

  resize(width: number, height: number) {
    this.topBar?.layout(width);
    this.taskPanel?.layout(width, height);
    this.itemCarousel?.layout(width, height);
    this.hintToast?.layout(width, height);
    this.tutorialOverlay?.layout(width, height);
    this.resultModal?.layout(width, height);
    this.loadingScreen?.layout(width, height);
    const shouldOpen = width >= this.MinimiumWidthForPanels;
    if (shouldOpen !== this.leftPanelOpen) {
      this.setLeftPanelOpen(shouldOpen);
    }
    const shouldShowCarousel = height >= 520;
    this.setPanelOpen(shouldShowCarousel);
  }

  setCurrencies({ coins, diamonds }: { coins: number; diamonds: number }) {
    this.topBar?.setCurrencies({ coins, diamonds });
  }

  setEnergy(cur: number, max: number) {
    this.topBar?.setEnergy(cur, max);
  }

  setTasks(requiredTasks: TaskDef[], bonusTasks: TaskDef[]) {
    this.taskPanel?.setTasks(requiredTasks, bonusTasks);
  }

  setUndoEnabled(enabled: boolean) {
    this.itemCarousel?.setUndoEnabled(enabled);
  }

  setFinishEnabled(enabled: boolean, pulse = false) {
    this.itemCarousel?.setFinishEnabled(enabled, pulse);
  }

  clearItemSelection() {
    this.itemCarousel?.clearItemSelection();
  }

  setDayNightIcon(isNight: boolean) {
    this.topBar?.setDayNightIcon(isNight);
  }

  setNightMode(isNight: boolean) {
    setTheme(isNight);
    this.topBar?.applyTheme();
    this.taskPanel?.applyTheme();
    this.itemCarousel?.applyTheme();
    this.hintToast?.applyTheme();
    this.tutorialOverlay?.applyTheme();
    this.resultModal?.applyTheme();
    this.loadingScreen?.applyTheme();
  }

  showTutorial(show: boolean, text?: string) {
    this.tutorialOverlay?.show(show, text);
    this.setTutorialBlur(show);
  }

  showResult({ stars = 4.6, coins = 250, diamonds = 1 }: { stars: number; coins: number; diamonds: number }) {
    this.resultModal?.showResult({ stars, coins, diamonds });
    this.setResultBlur(true);
  }

  hideResult() {
    this.resultModal?.hideResult();
    this.setResultBlur(false);
  }

  setHint(text: string, ms = 1700) {
    this.hintToast?.setHint(text, ms);
  }

  toast(msg: string, ms = 1100) {
    this.hintToast?.toast(msg, ms);
  }

  setLoading(progress01: number, text?: string) {
    this.loadingScreen?.setLoading(progress01, text);
  }

  private setTutorialBlur(active: boolean) {
    this.tutorialBlurActive = active;
    this.updateSceneBlur();
  }

  private setResultBlur(active: boolean) {
    this.resultBlurActive = active;
    this.updateSceneBlur();
  }

  private updateSceneBlur() {
    const isBlurred = this.tutorialBlurActive || this.resultBlurActive;
    if (isBlurred) {
      this.tutorialBlur.blur = 8;
      this.tutorialBlur.quality = 4;
      this.uiLayer.filters = [this.tutorialBlur];
    } else {
      this.uiLayer.filters = null;
    }
    const canvas3d = document.getElementById("c3d");
    canvas3d?.classList.toggle("is-blurred", isBlurred);
  }

  setPanelOpen(open: boolean) {
    this.panelOpen = !!open;
    this.itemCarousel?.setPanelOpen(this.panelOpen);
  }

  setLeftPanelOpen(open: boolean) {
    this.leftPanelOpen = !!open;
    this.taskPanel?.setCollapsed(!this.leftPanelOpen);
  }

  isPointerOverUI(x: number, y: number) {
    const layers = [
      this.resultModal?.container,
      this.tutorialOverlay?.container,
      this.loadingScreen?.container,
      this.itemCarousel?.container,
      this.topBar?.container,
      this.taskPanel?.container
    ].filter(Boolean) as { visible: boolean; getBounds: () => PIXI.Rectangle }[];

    for (const layer of layers) {
      if (!layer.visible) continue;
      const bounds = layer.getBounds();
      if (bounds.contains(x, y)) return true;
    }
    return false;
  }

  getCanvas() {
    return this.rendererUI.app.view as HTMLCanvasElement;
  }
}
