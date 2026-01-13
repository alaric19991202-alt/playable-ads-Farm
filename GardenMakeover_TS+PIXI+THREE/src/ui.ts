import type { UIManager } from "./ui/UIManager";
import type { ItemDef } from "./types";

let activeUI: UIManager | null = null;

export function setUIManager(uiManager: UIManager): void {
  activeUI = uiManager;
}

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
}): ReturnType<UIManager["build"]> {
  if (!activeUI) throw new Error("UIManager not set");
  return activeUI.build({
    onSelectCategory,
    onSelectItem,
    onUndo,
    onFinish,
    onTogglePanel,
    onToggleLeftPanel,
    onToggleDayNight,
    onCTA,
    onDismissTutorial
  });
}

export function setHint(text: string, ms = 1700): void {
  activeUI?.setHint(text, ms);
}

export function toast(msg: string, ms = 1100): void {
  activeUI?.toast(msg, ms);
}

export function setLoading(progress01: number, text?: string): void {
  activeUI?.setLoading(progress01, text);
}
