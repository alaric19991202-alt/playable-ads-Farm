import * as PIXI from "pixi.js";
import { drawRoundedRect, tweenNumber } from "../../utils/pixiHelpers";
import { COLORS, FONT } from "../theme";

export class HintToast {
  public container = new PIXI.Container();

  private hintBox = new PIXI.Container();
  private hintText: PIXI.Text;
  private hintBg: PIXI.Graphics;

  private toastBox = new PIXI.Container();
  private toastText: PIXI.Text;
  private toastBg: PIXI.Graphics;
  private hintTimeoutId: number | null = null;
  private toastTimeoutId: number | null = null;

  constructor() {
    this.hintBg = drawRoundedRect(320, 28, 14, COLORS.panel, 0.9, 0x000000, 0);
    this.hintText = new PIXI.Text("", {
      fontFamily: FONT,
      fontSize: 14,
      fill: COLORS.text,
      fontWeight: "500",
      align: "center"
    });
    this.hintText.anchor.set(0.5, 0.5);
    this.hintText.position.set(160, 13);
    this.hintBox.addChild(this.hintBg, this.hintText);
    this.hintBox.alpha = 0;

    this.toastBg = drawRoundedRect(260, 30, 16, 0x000000, 0.75, 0x000000, 0);
    this.toastText = new PIXI.Text("", {
      fontFamily: FONT,
      fontSize: 14,
      fill: 0xffffff,
      fontWeight: "400",
      align: "center"
    });
    this.toastText.anchor.set(0.5, 0.5);
    this.toastText.position.set(130, 15);
    this.toastBox.addChild(this.toastBg, this.toastText);
    this.toastBox.alpha = 0;

    this.container.addChild(this.hintBox, this.toastBox);
  }

  setHint(text: string, ms = 1700) {
    this.hintText.text = text || "";
    if (!text) {
      tweenNumber({ from: this.hintBox.alpha, to: 0, duration: 180, onUpdate: (v) => { this.hintBox.alpha = v; } });
      return;
    }
    this.hintBox.alpha = 1;
    if (this.hintTimeoutId) window.clearTimeout(this.hintTimeoutId);
    this.hintTimeoutId = window.setTimeout(() => {
      tweenNumber({ from: this.hintBox.alpha, to: 0, duration: 180, onUpdate: (v) => { this.hintBox.alpha = v; } });
    }, ms);
  }

  toast(msg: string, ms = 1100) {
    this.toastText.text = msg;
    this.toastBox.alpha = 1;
    if (this.toastTimeoutId) window.clearTimeout(this.toastTimeoutId);
    this.toastTimeoutId = window.setTimeout(() => {
      tweenNumber({ from: this.toastBox.alpha, to: 0, duration: 200, onUpdate: (v) => { this.toastBox.alpha = v; } });
      
    }, ms);
  }

  layout(width: number, height: number) {
    this.hintBox.position.set((width - this.hintBox.width) / 2, 80);
    this.toastBox.position.set((width - this.toastBox.width) / 2, height -90);
  }

  getBounds() {
    return this.container.getBounds();
  }

  applyTheme() {
    this.hintBg.clear();
    this.hintBg.beginFill(COLORS.panel, 0.9);
    this.hintBg.drawRoundedRect(0, 0, 320, 28, 14);
    this.hintBg.endFill();
    this.hintText.style.fill = COLORS.text;
  }
}
