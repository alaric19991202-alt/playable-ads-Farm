import * as PIXI from "pixi.js";
import { drawRoundedRect, tweenNumber } from "../../utils/pixiHelpers";
import { COLORS, FONT } from "../theme";
import type { TaskDef } from "../../types";

export class TaskPanel {
  public container = new PIXI.Container();
  private panelGroup = new PIXI.Container();
  private scrollContent = new PIXI.Container();
  private scrollMask = new PIXI.Graphics();
  private requiredList = new PIXI.Container();
  private bonusList = new PIXI.Container();
  private bg: PIXI.Graphics;
  private toggleButton = new PIXI.Container();
  private toggleShadow = new PIXI.Graphics();
  private toggleBg = new PIXI.Graphics();
  private toggleIcon = new PIXI.Graphics();
  private rowParts = new WeakMap<PIXI.Container, { bg: PIXI.Graphics; text: PIXI.Text; dot: PIXI.Graphics; check: PIXI.Graphics | null; label: string }>();
  private requiredHeader: PIXI.Text;
  private bonusHeader: PIXI.Text;
  private onToggle?: (open: boolean) => void;
  private collapsed = false;
  private lastLayout = { width: 0, height: 0 };
  private tasks = { required: [] as TaskDef[], bonus: [] as TaskDef[] };
  private panelWidth = 100;
  private rowHeight = 28;
  private rowGap = 8;
  private panelPad = 12;
  private scrollMinY = 0;
  private scrollY = 0;
  private scrollDragStartY = 0;
  private scrollContentStartY = 0;
  private isDragging = false;

  constructor({ onToggle }: { onToggle?: (open: boolean) => void } = {}) {
    this.onToggle = onToggle;
    this.bg = drawRoundedRect(this.panelWidth, 220, 10, COLORS.panel, 0.98, 0x000000, 0);

    this.requiredHeader = new PIXI.Text("Required", {
      fontFamily: FONT,
      fontSize: 18,
      fill: COLORS.text,
      fontWeight: "600"
    });

    this.bonusHeader = new PIXI.Text("Bonus", {
      fontFamily: FONT,
      fontSize: 18,
      fill: COLORS.pink,
      fontWeight: "600"
    });

    this.toggleButton.addChild(this.toggleShadow, this.toggleBg, this.toggleIcon);
    this.toggleButton.eventMode = "static";
    this.toggleButton.cursor = "pointer";
    this.toggleButton.on("pointertap", () => {
      if (this.onToggle) this.onToggle(this.collapsed);
      else this.setCollapsed(!this.collapsed);
    });

    this.scrollContent.addChild(this.requiredHeader, this.bonusHeader, this.requiredList, this.bonusList);
    this.scrollContent.mask = this.scrollMask;
    this.panelGroup.addChild(this.bg, this.scrollMask, this.scrollContent);
    this.container.addChild(this.panelGroup, this.toggleButton);

    this.panelGroup.eventMode = "static";
    this.panelGroup.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
      if (this.scrollMinY === 0) return;
      this.isDragging = true;
      this.scrollDragStartY = e.global.y;
      this.scrollContentStartY = this.scrollContent.y;
    });
    this.panelGroup.on("pointermove", (e: PIXI.FederatedPointerEvent) => {
      if (!this.isDragging) return;
      const dy = e.global.y - this.scrollDragStartY;
      this.setScrollY(this.scrollContentStartY + dy);
    });
    this.panelGroup.on("pointerup", () => {
      this.isDragging = false;
    });
    this.panelGroup.on("pointerupoutside", () => {
      this.isDragging = false;
    });
  }

  setTasks(requiredTasks: TaskDef[], bonusTasks: TaskDef[]) {
    this.tasks.required = requiredTasks;
    this.tasks.bonus = bonusTasks;
    this.requiredList.removeChildren();
    this.bonusList.removeChildren();

    let y = 0;
    for (const task of requiredTasks) {
      const row = this.createTaskRow(task.label, task.done, COLORS.teal);
      row.position.set(0, y);
      this.requiredList.addChild(row);
      y += this.rowHeight + this.rowGap;
    }

    y = 0;
    for (const task of bonusTasks) {
      const row = this.createTaskRow(task.label, task.done, COLORS.pink);
      row.position.set(0, y);
      this.bonusList.addChild(row);
      y += this.rowHeight + this.rowGap;
    }
    if (this.lastLayout.width) this.layout(this.lastLayout.width, this.lastLayout.height);
  }

  setCollapsed(collapsed: boolean) {
    this.collapsed = collapsed;
    if (this.lastLayout.width) this.layout(this.lastLayout.width, this.lastLayout.height);
    if (!collapsed) {
      this.panelGroup.visible = true;
      this.panelGroup.alpha = 0;
      this.panelGroup.scale.set(0.96, 1);
      tweenNumber({
        from: 0,
        to: 1,
        duration: 220,
        onUpdate: (v) => {
          this.panelGroup.alpha = v;
          this.panelGroup.scale.x = 0.96 + 0.04 * v;
        }
      });
      return;
    }

    const startAlpha = this.panelGroup.alpha;
    tweenNumber({
      from: startAlpha,
      to: 0,
      duration: 200,
      onUpdate: (v) => {
        this.panelGroup.alpha = v;
        this.panelGroup.scale.x = 0.96 + 0.04 * v;
      },
      onComplete: () => {
        this.panelGroup.visible = false;
      }
    });
  }

  layout(width: number, height: number) {
    this.lastLayout = { width, height };
    const top = 110;
    const panelWidth = Math.min(220, Math.max(150, Math.floor(width * 0.5)));
    this.panelWidth = panelWidth;
    this.container.position.set(this.panelPad, top);

    const rowWidth = panelWidth - this.panelPad * 2;
    this.requiredHeader.position.set(this.panelPad, this.panelPad);
    this.requiredList.position.set(this.panelPad, this.requiredHeader.y + this.requiredHeader.height + 6);

    let rowY = 0;
    for (const row of this.requiredList.children as PIXI.Container[]) {
      this.layoutTaskRow(row, rowWidth);
      row.position.set(0, rowY);
      rowY += this.rowHeight + this.rowGap;
    }

    const showBonus = this.tasks.bonus.length > 0;
    this.bonusHeader.visible = showBonus;
    this.bonusList.visible = showBonus;
    let bonusStart = this.requiredList.y + rowY + 10;
    if (showBonus) {
      this.bonusHeader.position.set(this.panelPad, bonusStart);
      this.bonusList.position.set(this.panelPad, this.bonusHeader.y + this.bonusHeader.height + 6);

      let bonusY = 0;
      for (const row of this.bonusList.children as PIXI.Container[]) {
        this.layoutTaskRow(row, rowWidth);
        row.position.set(0, bonusY);
        bonusY += this.rowHeight + this.rowGap;
      }
      bonusStart = this.bonusList.y + bonusY + this.panelPad;
    } else {
      bonusStart = this.requiredList.y + rowY + this.panelPad;
    }

    const panelHeight = Math.min(Math.max(140, bonusStart), height - top - 30);
    this.bg.clear();
    this.bg.beginFill(COLORS.panel, 0.98);
    this.bg.drawRoundedRect(0, 0, panelWidth, panelHeight, 10);
    this.bg.endFill();

    this.scrollMask.clear();
    this.scrollMask.beginFill(0xffffff, 1);
    this.scrollMask.drawRoundedRect(0, 0, panelWidth, panelHeight, 10);
    this.scrollMask.endFill();

    const contentHeight = Math.max(panelHeight, bonusStart);
    this.scrollMinY = Math.min(0, panelHeight - contentHeight);
    this.setScrollY(this.scrollY);

    const toggleWidth = 32;
    const toggleHeight = 52;
    const toggleRadius = 12;
    this.toggleShadow.clear();
    this.toggleShadow.beginFill(0x000000, 0.12);
    this.toggleShadow.drawRoundedRect(0, 2, toggleWidth, toggleHeight, toggleRadius);
    this.toggleShadow.endFill();

    this.toggleBg.clear();
    this.toggleBg.lineStyle(1, COLORS.stroke, 1);
    this.toggleBg.beginFill(COLORS.panel, 1);
    this.toggleBg.drawRoundedRect(0, 0, toggleWidth, toggleHeight, toggleRadius);
    this.toggleBg.endFill();

    const toggleX = (this.collapsed ? 0 : panelWidth) + 6;
    const toggleY = (panelHeight - toggleHeight) / 2;
    this.toggleButton.position.set(toggleX, toggleY);

    this.updateToggleIcon();
  }

  private createTaskRow(label: string, done: boolean, color: number) {
    const row = new PIXI.Container();
    const bg = drawRoundedRect(156, this.rowHeight, 12, COLORS.panelSoft, 0.95, 0x000000, 0);

    const dot = new PIXI.Graphics();
    dot.beginFill(color, 1);
    dot.drawCircle(0, 0, 6);
    dot.endFill();
    dot.position.set(12, this.rowHeight / 2);

    const text = new PIXI.Text(label, {
      fontFamily: FONT,
      fontSize: 12,
      fill: COLORS.text,
      fontWeight: "700"
    });
    text.position.set(28, 6);

    row.addChild(bg, dot, text);
    const check = done ? this.createCheckMark() : null;
    if (check) row.addChild(check);
    this.rowParts.set(row, { bg, text, dot, check, label });
    return row;
  }

  private layoutTaskRow(row: PIXI.Container, width: number) {
    const data = this.rowParts.get(row);
    if (!data) return;
    data.bg.width = width;
    data.bg.height = this.rowHeight;
    data.dot.position.set(12, this.rowHeight / 2);
    const maxTextWidth = Math.max(40, width - 52);
    this.applyEllipsis(data.text, data.label, maxTextWidth);
    data.text.position.set(28, (this.rowHeight - data.text.height) / 2);
    if (data.check) {
      data.check.position.set(width - 18, (this.rowHeight - 10) / 2);
    }
  }

  private updateToggleIcon() {
    this.toggleIcon.clear();
    this.toggleIcon.lineStyle(2, COLORS.text, 1);
    const cx = 16;
    const cy = 25;
    if (this.collapsed) {
      this.toggleIcon.moveTo(cx - 4, cy - 6);
      this.toggleIcon.lineTo(cx + 4, cy);
      this.toggleIcon.lineTo(cx - 4, cy + 6);
    } else {
      this.toggleIcon.moveTo(cx + 4, cy - 6);
      this.toggleIcon.lineTo(cx - 4, cy);
      this.toggleIcon.lineTo(cx + 4, cy + 6);
    }
  }

  private createCheckMark() {
    const check = new PIXI.Graphics();
    check.lineStyle(2, COLORS.green, 1);
    check.moveTo(0, 4);
    check.lineTo(4, 8);
    check.lineTo(10, 0);
    return check;
  }

  private applyEllipsis(textObject: PIXI.Text, fullText: string, maxWidth: number) {
    textObject.text = fullText;
    if (textObject.width <= maxWidth) return;
    const ellipsis = "...";
    let trimmed = fullText;
    while (trimmed.length > 0 && textObject.width > maxWidth) {
      trimmed = trimmed.slice(0, -1);
      textObject.text = trimmed + ellipsis;
    }
  }

  private setScrollY(nextY: number) {
    const clampedY = Math.min(0, Math.max(this.scrollMinY, nextY));
    this.scrollY = clampedY;
    this.scrollContent.y = clampedY;
  }

  applyTheme() {
    this.requiredHeader.style.fill = COLORS.text;
    this.bonusHeader.style.fill = COLORS.pink;
    this.setTasks(this.tasks.required, this.tasks.bonus);
  }

  getBounds() {
    return this.container.getBounds();
  }
}
