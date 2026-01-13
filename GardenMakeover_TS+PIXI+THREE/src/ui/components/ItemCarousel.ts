import * as PIXI from "pixi.js";
import { CATEGORIES, ITEMS } from "../../assets";
import { drawRoundedRect, tweenNumber } from "../../utils/pixiHelpers";
import { COLORS, FONT, FONT_EMOJI } from "../theme";
import type { ItemDef } from "../../types";

type ItemCarouselCallbacks = {
  onSelectCategory?: (categoryId: string) => void;
  onSelectItem?: (categoryId: string, itemDef: ItemDef) => void;
  onUndo?: () => void;
  onFinish?: () => void;
  onTogglePanel?: (open: boolean) => void;
};

export class ItemCarousel {
  public container = new PIXI.Container();
  public body = new PIXI.Container();

  private bg: PIXI.Graphics;
  private topRow = new PIXI.Container();
  private callbacks: ItemCarouselCallbacks;
  private selectedCategory = CATEGORIES[0]?.id ?? "plants";
  private selectedItemId: string | null = null;
  private panelOpen = true;
  private lastLayout = { width: 0, height: 0 };

  private categoryTabs = new PIXI.Container();
  private categoryTabsBg = new PIXI.Graphics();
  private isNarrowTabs = false;
  private tabSize = 42;
  private tabGap = 8;
  private tabsPad = 8;
  private itemsViewport = new PIXI.Container();
  private itemsMask = new PIXI.Graphics();
  private itemsContainer = new PIXI.Container();
  private carouselWidth = 0;
  private itemCardCache = new Map<string, PIXI.Container>();
  private itemCardParts = new WeakMap<PIXI.Container, { bg: PIXI.Graphics; iconBg: PIXI.Graphics }>();

  private undoButton: PIXI.Container;
  private finishButton: PIXI.Container;
  private finishLabel: PIXI.Text;
  private panelToggleButton: PIXI.Container;
  private panelToggleIcon = new PIXI.Graphics();
  private buttonStroke = COLORS.stroke;

  private dragStartX = 0;
  private contentStartX = 0;
  private isDragging = false;

  private finishPulseActive = false;
  private finishPulseRaf = 0;

  constructor(callbacks: ItemCarouselCallbacks) {
    this.callbacks = callbacks;

    this.bg = drawRoundedRect(1500, 220, 20, COLORS.panel, 0.92, 0x000000, 0);
    this.container.addChild(this.bg);

    this.buildTopRowButtons();

    this.body.addChild(this.categoryTabs, this.itemsViewport);
    this.itemsViewport.addChild(this.itemsContainer);
    this.itemsViewport.addChild(this.itemsMask);
    this.itemsViewport.mask = this.itemsMask;

    this.categoryTabs.addChild(this.categoryTabsBg);
    this.container.addChild(this.topRow, this.body);

    this.renderCategoryTabs();
    this.renderItems();
    this.updatePanelToggleIcon();
  }

  private createButton(label: string, width: number, height: number, bgColor: number, textColor: number | string) {
    const parts = this.createButtonBase(width, height, bgColor);
    const container = new PIXI.Container();
    const text = new PIXI.Text(label, {
      fontFamily: FONT,
      fontSize: 12,
      fill: textColor,
      fontWeight: "800"
    });
    text.position.set((width - text.width) / 2, (height - text.height) / 2);
    container.addChild(parts.shadow, parts.bg, text);
    container.eventMode = "static";
    container.cursor = "pointer";
    return container;
  }

  private createButtonBase(width: number, height: number, bgColor: number) {
    const radius = height / 2;
    const shadow = drawRoundedRect(width, height, radius, 0x000000, 0.12, 0x000000, 0);
    shadow.position.set(0, 2);
    const bg = drawRoundedRect(width, height, radius, bgColor, 1, this.buttonStroke, 1);
    return { shadow, bg };
  }

  private buildTopRowButtons() {
    this.topRow.removeChildren();

    this.undoButton = this.createButton("Undo", 70, 32, COLORS.panel, COLORS.text);
    this.undoButton.on("pointertap", () => this.callbacks.onUndo?.());

    this.finishLabel = new PIXI.Text("Finish", {
      fontFamily: FONT,
      fontSize: 12,
      fill: 0xffffff,
      fontWeight: "700"
    });
    this.finishButton = this.createButton("", 78, 32, 0x20b462, 0xffffff);
    this.finishButton.removeChildren();
    const finishParts = this.createButtonBase(78, 32, 0x20b462);
    this.finishLabel.position.set((78 - this.finishLabel.width) / 2, (32 - this.finishLabel.height) / 2);
    this.finishButton.addChild(finishParts.shadow, finishParts.bg, this.finishLabel);
    this.finishButton.on("pointertap", () => this.callbacks.onFinish?.());

    this.panelToggleButton = this.createButton("", 32, 32, COLORS.panel, COLORS.text);
    this.panelToggleButton.removeChildren();
    const toggleParts = this.createButtonBase(32, 32, COLORS.panel);
    this.panelToggleIcon.position.set(1, 5);
    this.panelToggleButton.addChild(toggleParts.shadow, toggleParts.bg, this.panelToggleIcon);
    this.panelToggleButton.on("pointertap", () => this.togglePanel());

    this.topRow.addChild(this.undoButton, this.finishButton, this.panelToggleButton);
  }

  private redrawButtonBase(shadow: PIXI.Graphics, bg: PIXI.Graphics, width: number, height: number, bgColor: number) {
    const radius = height / 2;
    shadow.clear();
    shadow.beginFill(0x000000, 0.12);
    shadow.drawRoundedRect(0, 2, width, height, radius);
    shadow.endFill();

    bg.clear();
    bg.lineStyle(1, this.buttonStroke, 1);
    bg.beginFill(bgColor, 1);
    bg.drawRoundedRect(0, 0, width, height, radius);
    bg.endFill();
  }

  private renderCategoryTabs() {
    this.categoryTabs.removeChildren();
    this.categoryTabs.addChild(this.categoryTabsBg);
    const items = CATEGORIES;
    let y = 0;
    let x = 0;
    const pad = this.tabsPad;
    for (const category of items) {
      const tab = this.createCategoryTab(category.id, category.emoji || category.label[0], this.tabSize);
      if (this.isNarrowTabs) {
        tab.position.set(pad, pad + y);
        y += this.tabSize + this.tabGap;
      } else {
        tab.position.set(pad + x, pad);
        x += this.tabSize + this.tabGap;
      }
      this.categoryTabs.addChild(tab);
    }
  }

  private createCategoryTab(id: string, label: string, size: number) {
    const selected = id === this.selectedCategory;
    const tab = new PIXI.Container();
    const radius = Math.max(12, Math.floor(size * 0.32));
    const bg = drawRoundedRect(size, size, radius, selected ? COLORS.teal : COLORS.panelSoft, 1, 0x000000, 0);
    const text = new PIXI.Text(label, {
      fontFamily: `${FONT_EMOJI}, ${FONT}`,
      fontSize: Math.max(14, Math.floor(size * 0.4)),
      fill: selected ? 0xffffff : COLORS.text,
      fontWeight: "700"
    });
    text.anchor.set(0.5, 0.5);
    text.position.set(size / 2, size / 2);
    tab.addChild(bg, text);
    tab.eventMode = "static";
    tab.cursor = "pointer";
    tab.on("pointertap", () => {
      this.selectedCategory = id;
      this.selectedItemId = null;
      this.renderCategoryTabs();
      this.renderItems();
      this.callbacks.onSelectCategory?.(id);
    });
    return tab;
  }

  private renderItems() {
    this.itemsContainer.removeChildren();
    const items = ITEMS[this.selectedCategory] || [];
    let x = 0;
    for (const item of items) {
      const cached = this.itemCardCache.get(item.id);
      const card = cached ?? this.createItemCard(item);
      if (!cached) this.itemCardCache.set(item.id, card);
      this.updateItemCardSelection(card, item.id === this.selectedItemId);
      card.position.set(x, 0);
      this.itemsContainer.addChild(card);
      x += 116;
    }
    this.itemsContainer.x = 0;
    this.clampScroll();
  }

  private createItemCard(item: ItemDef) {
    const selected = item.id === this.selectedItemId;
    const card = new PIXI.Container();
    const shadow = drawRoundedRect(108, 120, 16, 0x000000, 0.08, 0x000000, 0);
    shadow.position.set(0, 3);
    const bg = new PIXI.Graphics();
    this.drawItemCardBg(bg, selected);

    const iconBg = new PIXI.Graphics();
    this.drawItemIconBg(iconBg);
    iconBg.position.set(26, 10);

    const thumb = new PIXI.Sprite(PIXI.Texture.from(item.icon || "assets/images/plus.png"));
    thumb.width = 44;
    thumb.height = 44;
    thumb.position.set(iconBg.x + 6, iconBg.y + 6);

    const label = new PIXI.Text(item.label, {
      fontFamily: FONT,
      fontSize: 12,
      fill: COLORS.text,
      fontWeight: "600"
    });
    label.anchor.set(0.5, 0);
    label.position.set(54, 72);

    const pricePill = this.createPricePill(item);
    pricePill.position.set((108 - pricePill.width) / 2, 92);

    card.addChild(shadow, bg, iconBg, thumb, label, pricePill);
    card.eventMode = "static";
    card.cursor = "pointer";
    card.on("pointertap", () => {
      this.selectedItemId = item.id;
      this.renderItems();
      this.callbacks.onSelectItem?.(this.selectedCategory, item);
      if (this.lastLayout.height && this.lastLayout.height < 520) {
        this.setPanelOpen(false);
        this.callbacks.onTogglePanel?.(this.panelOpen);
      }
    });
    this.itemCardParts.set(card, { bg, iconBg });
    return card;
  }

  private createPricePill(item: ItemDef) {
    const pill = new PIXI.Container();
    const pillWidth = 76;
    const pillHeight = 24;
    const bg = drawRoundedRect(pillWidth, pillHeight, pillHeight / 2, COLORS.panel, 1, COLORS.stroke, 1);
    pill.addChild(bg);

    if (item.currency === "diamond") {
      const iconBg = drawRoundedRect(18, 18, 9, COLORS.panelSoft, 1, COLORS.stroke, 1);
      iconBg.position.set(17, 3);
      pill.addChild(iconBg);
      const diamond = new PIXI.Text("\u{1F48E}", {
        fontFamily: `${FONT_EMOJI}, ${FONT}`,
        fontSize: 12,
        fill: COLORS.text,
        fontWeight: "700"
      });
      diamond.anchor.set(0.1, 0.5);
      diamond.position.set(20, 12);
      pill.addChild(diamond);
    } else {
      const iconBg = drawRoundedRect(18, 18, 9, COLORS.panelSoft, 1, COLORS.stroke, 1);
      iconBg.position.set(14, 3);
      pill.addChild(iconBg);
      const coin = new PIXI.Sprite(PIXI.Texture.from("assets/images/money.png"));
      coin.width = 12;
      coin.height = 12;
      coin.position.set(18, 6);
      pill.addChild(coin);
    }

    const value = new PIXI.Text(String(item.cost ?? 0), {
      fontFamily: FONT,
      fontSize: 12,
      fill: COLORS.text,
      fontWeight: "700"
    });
    value.position.set(39, 4);
    pill.addChild(value);
    return pill;
  }

  private drawItemCardBg(bg: PIXI.Graphics, selected: boolean) {
    bg.clear();
    bg.lineStyle(selected ? 2 : 1, selected ? COLORS.pink : COLORS.stroke, 1);
    bg.beginFill(COLORS.panel, 1);
    bg.drawRoundedRect(0, 0, 108, 120, 16);
    bg.endFill();
  }

  private drawItemIconBg(iconBg: PIXI.Graphics) {
    iconBg.clear();
    iconBg.lineStyle(1, COLORS.stroke, 1);
    iconBg.beginFill(COLORS.panelSoft, 1);
    iconBg.drawRoundedRect(0, 0, 56, 56, 16);
    iconBg.endFill();
  }

  private updateItemCardSelection(card: PIXI.Container, selected: boolean) {
    const parts = this.itemCardParts.get(card);
    if (!parts) return;
    this.drawItemCardBg(parts.bg, selected);
    this.drawItemIconBg(parts.iconBg);
  }

  private updatePanelToggleIcon() {
    this.panelToggleIcon.clear();
    this.panelToggleIcon.lineStyle(2, COLORS.text, 1);
    if (this.panelOpen) {
      this.panelToggleIcon.moveTo(10, 12);
      this.panelToggleIcon.lineTo(15, 18);
      this.panelToggleIcon.lineTo(20, 12);
    } else {
      this.panelToggleIcon.moveTo(10, 18);
      this.panelToggleIcon.lineTo(15, 12);
      this.panelToggleIcon.lineTo(20, 18);
    }
  }


  setUndoEnabled(enabled: boolean) {
    this.undoButton.alpha = enabled ? 1 : 0.5;
    this.undoButton.eventMode = enabled ? "static" : "none";
  }

  setFinishEnabled(enabled: boolean, pulse = false) {
    this.finishButton.alpha = enabled ? 1 : 0.5;
    this.finishButton.eventMode = enabled ? "static" : "none";
    this.finishPulseActive = enabled && pulse;
    if (this.finishPulseActive) this.startFinishPulse();
    else this.stopFinishPulse();
  }

  clearItemSelection() {
    this.selectedItemId = null;
    this.renderItems();
  }

  setPanelOpen(open: boolean) {
    this.panelOpen = open;
    if (this.lastLayout.width && this.lastLayout.height) {
      this.layout(this.lastLayout.width, this.lastLayout.height);
    }
    if (this.panelOpen) {
      this.bg.visible = true;
      this.body.visible = true;
      this.bg.alpha = 0;
      this.body.alpha = 0;
      this.bg.scale.y = 0.96;
      this.body.scale.y = 0.96;
      tweenNumber({
        from: 0,
        to: 1,
        duration: 220,
        onUpdate: (v) => {
          this.bg.alpha = v;
          this.bg.scale.y = 0.96 + 0.04 * v;
          this.body.alpha = v;
          this.body.scale.y = 0.96 + 0.04 * v;
        }
      });
    } else {
      const startAlpha = this.body.alpha;
      tweenNumber({
        from: startAlpha,
        to: 0,
        duration: 200,
        onUpdate: (v) => {
          this.bg.alpha = v;
          this.bg.scale.y = 0.96 + 0.04 * v;
          this.body.alpha = v;
          this.body.scale.y = 0.96 + 0.04 * v;
        },
        onComplete: () => {
          this.bg.visible = false;
          this.body.visible = false;
        }
      });
    }
    this.updatePanelToggleIcon();
  }

  togglePanel() {
    this.setPanelOpen(!this.panelOpen);
    this.callbacks.onTogglePanel?.(this.panelOpen);
  }

  applyTheme() {
    const undoEnabled = this.undoButton.eventMode === "static";
    const finishEnabled = this.finishButton.eventMode === "static";
    const finishPulse = this.finishPulseActive;
    this.buttonStroke = COLORS.stroke;
    for (const card of this.itemCardCache.values()) {
      card.destroy({ children: true, texture: false, baseTexture: false });
    }
    this.itemCardCache.clear();
    this.itemCardParts = new WeakMap();
    this.buildTopRowButtons();
    this.setUndoEnabled(undoEnabled);
    this.setFinishEnabled(finishEnabled, finishPulse);
    this.renderCategoryTabs();
    this.renderItems();
    this.updatePanelToggleIcon();
    if (this.lastLayout.width && this.lastLayout.height) {
      this.layout(this.lastLayout.width, this.lastLayout.height);
    }
  }

  layout(width: number, height: number) {
    this.lastLayout = { width, height };
    const pad = 12;
    const bottom = height - 12;
    const barHeight = 220;
    const panelWidth = width - pad * 2;
    const panelX = pad;
    const topRowHeight = this.undoButton.height || 32;
    const panelY = this.panelOpen ? bottom - barHeight : height - pad - topRowHeight;
    this.container.position.set(panelX, panelY);

    this.bg.clear();
    this.bg.beginFill(COLORS.panel, 0.92);
    this.bg.drawRoundedRect(0, 0, panelWidth, barHeight, 20);
    this.bg.endFill();

    this.undoButton.position.set(0, 0);
    this.finishButton.position.set(this.undoButton.x + this.undoButton.width + 10, 0);
    this.panelToggleButton.position.set(this.finishButton.x + this.finishButton.width + 10, 0);
    this.panelToggleIcon.position.set(1, 3);

    const topRowGap = 8;
    const topRowX = panelWidth - this.topRow.width - 12;
    const topRowY = this.panelOpen ? -topRowHeight - topRowGap : 0;
    this.topRow.position.set(topRowX, topRowY);

    const bodyTop = 24;
    this.body.position.set(12, bodyTop);
    const bodyWidth = width - pad * 2 - 24;
    const availableHeight = Math.max(0, barHeight - bodyTop);
    const isNarrow = width < 720;
    const tabCount = Math.max(1, CATEGORIES.length);
    let nextTabSize = 40;
    let nextTabGap = 8;
    let nextTabsPad = 8;
    if (isNarrow) {
      const minGap = 6;
      const targetPad = 10;
      const maxTabSize = Math.floor(
        (availableHeight - targetPad * 2 - minGap * (tabCount - 1)) / tabCount
      );
      nextTabSize = Math.max(24, Math.min(44, maxTabSize));
      const gapRoom = availableHeight - targetPad * 2 - nextTabSize * tabCount;
      nextTabGap = tabCount > 1 ? Math.max(4, Math.min(10, Math.floor(gapRoom / (tabCount - 1)))) : 0;
      const padRoom = availableHeight - nextTabSize * tabCount - nextTabGap * (tabCount - 1);
      nextTabsPad = Math.max(6, Math.min(10, Math.floor(padRoom / 2)));
    }
    const shouldRerenderTabs =
      isNarrow !== this.isNarrowTabs ||
      nextTabSize !== this.tabSize ||
      nextTabGap !== this.tabGap ||
      nextTabsPad !== this.tabsPad;
    if (shouldRerenderTabs) {
      this.isNarrowTabs = isNarrow;
      this.tabSize = nextTabSize;
      this.tabGap = nextTabGap;
      this.tabsPad = nextTabsPad;
      this.renderCategoryTabs();
    }

    this.categoryTabs.position.set(0, 0);
    const tabsPad = this.tabsPad;
    const tabSpan = this.tabSize * tabCount + this.tabGap * (tabCount - 1);
    let tabsWidth = 0;
    let tabsHeight = 0;
    if (this.isNarrowTabs) {
      tabsWidth = this.tabSize + tabsPad * 2;
      tabsHeight = tabSpan + tabsPad * 2;
      this.categoryTabsBg.clear();
      this.categoryTabsBg.beginFill(COLORS.panel, 0.95);
      this.categoryTabsBg.drawRoundedRect(0, 0, tabsWidth, tabsHeight, 16);
      this.categoryTabsBg.endFill();
      this.categoryTabs.position.set(0, 0);
    } else {
      tabsWidth = Math.min(bodyWidth, tabSpan + tabsPad * 2);
      tabsHeight = this.tabSize + tabsPad * 2;
      this.categoryTabsBg.clear();
      this.categoryTabsBg.beginFill(COLORS.panel, 0.95);
      this.categoryTabsBg.drawRoundedRect(0, 0, tabsWidth, tabsHeight, Math.floor(tabsHeight / 2));
      this.categoryTabsBg.endFill();
      this.categoryTabs.position.set(0, 0);
    }

    const tabsOffsetX = this.isNarrowTabs ? this.tabSize + tabsPad * 2 + 12 : 0;
    const tabsOffsetY = this.isNarrowTabs ? 0 : tabsHeight + 12;
    const rawCarouselWidth = this.isNarrowTabs ? bodyWidth - tabsOffsetX : bodyWidth;
    this.carouselWidth = Math.max(140, rawCarouselWidth);
    this.itemsViewport.position.set(tabsOffsetX, tabsOffsetY);
    const itemsHeight = Math.max(120, availableHeight - tabsOffsetY);
    this.itemsMask.clear();
    this.itemsMask.beginFill(0xffffff, 1);
    this.itemsMask.drawRoundedRect(0, 0, this.carouselWidth, itemsHeight, 12);
    this.itemsMask.endFill();
    this.itemsViewport.hitArea = new PIXI.Rectangle(0, 0, this.carouselWidth, itemsHeight);

    this.itemsContainer.position.set(0, 0);
    this.clampScroll();
  }

  private clampScroll() {
    const contentWidth = this.itemsContainer.width;
    const viewWidth = this.carouselWidth;
    const minX = Math.min(0, viewWidth - contentWidth - 4);
    if (this.itemsContainer.x < minX) this.itemsContainer.x = minX;
    if (this.itemsContainer.x > 0) this.itemsContainer.x = 0;
  }

  private startFinishPulse() {
    if (this.finishPulseRaf) return;
    const tick = (now: number) => {
      if (!this.finishPulseActive) {
        this.finishButton.scale.set(1);
        this.finishPulseRaf = 0;
        return;
      }
      const scale = 1 + Math.sin(now * 0.008) * 0.04;
      this.finishButton.scale.set(scale);
      this.finishPulseRaf = requestAnimationFrame(tick);
    };
    this.finishPulseRaf = requestAnimationFrame(tick);
  }

  private stopFinishPulse() {
    if (this.finishPulseRaf) {
      cancelAnimationFrame(this.finishPulseRaf);
      this.finishPulseRaf = 0;
    }
    this.finishButton.scale.set(1);
  }

  enableDragScroll() {
    this.itemsViewport.eventMode = "static";
    this.itemsViewport.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
      this.isDragging = true;
      this.dragStartX = e.global.x;
      this.contentStartX = this.itemsContainer.x;
    });
    this.itemsViewport.on("pointermove", (e: PIXI.FederatedPointerEvent) => {
      if (!this.isDragging) return;
      const dx = e.global.x - this.dragStartX;
      this.itemsContainer.x = this.contentStartX + dx;
      this.clampScroll();
    });
    this.itemsViewport.on("pointerup", () => {
      this.isDragging = false;
    });
    this.itemsViewport.on("pointerupoutside", () => {
      this.isDragging = false;
    });
  }

  getBounds() {
    return this.container.getBounds();
  }
}
