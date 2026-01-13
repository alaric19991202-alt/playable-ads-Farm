import * as PIXI from "pixi.js";
import { drawRoundedRect } from "../../utils/pixiHelpers";
import { COLORS, FONT } from "../theme";

export class LoadingScreen {
  public container = new PIXI.Container();
  private overlay = new PIXI.Graphics();
  private barFill = new PIXI.Graphics();
  private loadingText: PIXI.Text;
  private card: PIXI.Container;
  private cardBg: PIXI.Graphics;
  private titleText: PIXI.Text;
  private subText: PIXI.Text;
  private barBg: PIXI.Graphics;
  private progress = 0;
  private readonly barWidth = 288;
  private readonly barHeight = 10;
  private readonly barRadius = 8;

  constructor() {
    this.overlay.beginFill(0x000000, 0.25);
    this.overlay.drawRect(0, 0, 10, 10);
    this.overlay.endFill();

    this.card = new PIXI.Container();
    this.cardBg = drawRoundedRect(320, 140, 20, COLORS.panel, 0.95, 0x000000, 0);

    this.titleText = new PIXI.Text("GardenMakeover", {
      fontFamily: FONT,
      fontSize: 18,
      fill: COLORS.text,
      fontWeight: "800"
    });
    this.titleText.position.set(16, 12);

    this.subText = new PIXI.Text("Design a Fantastic Garden in seconds", {
      fontFamily: FONT,
      fontSize: 12,
      fill: COLORS.muted,
      fontWeight: "600"
    });
    this.subText.position.set(16, 36);

    this.barBg = drawRoundedRect(this.barWidth, this.barHeight, this.barRadius, 0xe6eff6, 1, 0x000000, 0);
    this.barBg.position.set(16, 64);

    const barFillTexture = this.createGradientTexture(this.barWidth, this.barHeight);
    this.barFill.beginTextureFill({ texture: barFillTexture });
    this.barFill.drawRoundedRect(0, 0, this.barWidth, this.barHeight, this.barRadius);
    this.barFill.endFill();
    this.barFill.position.set(16, 64);

    this.loadingText = new PIXI.Text("Loading...", {
      fontFamily: FONT,
      fontSize: 12,
      fill: COLORS.muted,
      fontWeight: "600"
    });
    this.loadingText.position.set(16, 86);

    this.card.addChild(this.cardBg, this.titleText, this.subText, this.barBg, this.barFill, this.loadingText);

    this.container.addChild(this.overlay, this.card);
    this.container.visible = true;
  }

  setLoading(progress01: number, text?: string) {
    this.progress = Math.max(0, Math.min(1, progress01));
    const width = this.progress * this.barWidth;
    this.barFill.width = Math.max(6, width);
    if (text) this.loadingText.text = text;
    if (progress01 >= 1) this.container.visible = false;
  }

  layout(width: number, height: number) {
    this.overlay.width = width;
    this.overlay.height = height;
    this.card.position.set((width - this.card.width) / 2, (height - this.card.height) / 2);
  }

  getBounds() {
    return this.container.getBounds();
  }

  applyTheme() {
    this.cardBg.clear();
    this.cardBg.beginFill(COLORS.panel, 0.95);
    this.cardBg.drawRoundedRect(0, 0, 320, 140, 20);
    this.cardBg.endFill();

    this.barBg.clear();
    this.barBg.beginFill(COLORS.panelSoft, 1);
    this.barBg.drawRoundedRect(0, 0, this.barWidth, this.barHeight, this.barRadius);
    this.barBg.endFill();

    const barFillTexture = this.createGradientTexture(this.barWidth, this.barHeight);
    this.barFill.clear();
    this.barFill.beginTextureFill({ texture: barFillTexture });
    this.barFill.drawRoundedRect(0, 0, this.barWidth, this.barHeight, this.barRadius);
    this.barFill.endFill();
    this.barFill.width = Math.max(6, this.progress * this.barWidth);

    this.titleText.style.fill = COLORS.text;
    this.subText.style.fill = COLORS.muted;
    this.loadingText.style.fill = COLORS.muted;
  }

  private createGradientTexture(width: number, height: number) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return PIXI.Texture.WHITE;
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, this.colorToCss(COLORS.teal));
    gradient.addColorStop(1, this.colorToCss(COLORS.pink));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    return PIXI.Texture.from(canvas);
  }

  private colorToCss(color: number) {
    return `#${color.toString(16).padStart(6, "0")}`;
  }
}
