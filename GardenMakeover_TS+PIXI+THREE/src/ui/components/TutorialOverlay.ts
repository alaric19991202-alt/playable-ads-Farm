import * as PIXI from "pixi.js";
import { COLORS, FONT } from "../theme";

export class TutorialOverlay {
  public container = new PIXI.Container();
  private overlay = new PIXI.Graphics();
  private card = new PIXI.Container();
  private cardShadow = new PIXI.Graphics();
  private cardBg = new PIXI.Graphics();
  private text: PIXI.Text;
  private okButton = new PIXI.Container();
  private okBg = new PIXI.Graphics();
  private okText: PIXI.Text;
  private onDismiss?: () => void;
  private lastLayout = { width: 0, height: 0 };

  constructor({ onDismiss }: { onDismiss?: () => void }) {
    this.onDismiss = onDismiss;

    this.overlay.beginFill(0x000000, 0.22);
    this.overlay.drawRect(0, 0, 10, 10);
    this.overlay.endFill();
    this.overlay.eventMode = "static";

    this.text = new PIXI.Text("", {
      fontFamily: FONT,
      fontSize: 36,
      fill: COLORS.text,
      fontWeight: "700"
    });
    this.text.style.wordWrap = true;

    this.okText = new PIXI.Text("Got it", {
      fontFamily: FONT,
      fontSize: 36,
      fill: 0xffffff,
      fontWeight: "700"
    });
    this.okButton.addChild(this.okBg, this.okText);
    this.okButton.eventMode = "static";
    this.okButton.cursor = "pointer";
    this.okButton.on("pointertap", () => this.onDismiss?.());

    this.card.addChild(this.cardShadow, this.cardBg, this.text, this.okButton);
    this.container.addChild(this.overlay, this.card);
    this.container.visible = false;
  }

  show(show: boolean, text?: string) {
    this.container.visible = show;
    if (text) this.text.text = text;
    if (this.lastLayout.width && this.lastLayout.height) {
      this.layout(this.lastLayout.width, this.lastLayout.height);
    }
  }

  layout(width: number, height: number) {
    this.lastLayout = { width, height };
    this.overlay.width = width;
    this.overlay.height = height;
    const isCompact = width < 420;
    const paddingX = isCompact ? 14 : 18;
    const paddingY = isCompact ? 10 : 12;
    const gap = isCompact ? 10 : 12;
    const buttonHeight = isCompact ? 28 : 32;
    const buttonRadius = buttonHeight / 2;

    this.okText.style.fontSize = isCompact ? 11 : 12;
    const buttonWidth = Math.max(isCompact ? 64 : 72, this.okText.width + (isCompact ? 16 : 20));

    const cardWidth = Math.max(260, Math.min(560, width - 32));
    const textWidth = Math.max(120, cardWidth - paddingX * 2 - buttonWidth - gap);
    this.text.style.fontSize = isCompact ? 11 : 12;
    this.text.style.wordWrapWidth = textWidth;

    const contentHeight = Math.max(buttonHeight + paddingY * 2, this.text.height + paddingY * 2);
    const cardHeight = Math.max(isCompact ? 48 : 54, contentHeight);
    const radius = Math.min(24, cardHeight / 2);

    this.cardShadow.clear();
    this.cardShadow.beginFill(0x000000, 0.18);
    this.cardShadow.drawRoundedRect(0, 5, cardWidth, cardHeight, radius);
    this.cardShadow.endFill();

    this.cardBg.clear();
    this.cardBg.beginFill(COLORS.panel, 0.98);
    this.cardBg.drawRoundedRect(0, 0, cardWidth, cardHeight, radius);
    this.cardBg.endFill();

    this.okBg.clear();
    this.okBg.beginFill(COLORS.teal, 1);
    this.okBg.drawRoundedRect(0, 0, buttonWidth, buttonHeight, buttonRadius);
    this.okBg.endFill();

    this.okText.position.set((buttonWidth - this.okText.width) / 2, (buttonHeight - this.okText.height) / 2);
    this.okButton.position.set(cardWidth - paddingX - buttonWidth, (cardHeight - buttonHeight) / 2);
    this.text.position.set(paddingX, (cardHeight - this.text.height) / 2);

    const bottomGap = Math.max(64, Math.min(120, height * 0.12));
    this.card.position.set((width - cardWidth) / 2, height - cardHeight - bottomGap);
  }

  getBounds() {
    return this.container.getBounds();
  }

  applyTheme() {
    this.text.style.fill = COLORS.text;
    this.okText.style.fill = 0xffffff;
    if (this.lastLayout.width && this.lastLayout.height) {
      this.layout(this.lastLayout.width, this.lastLayout.height);
    }
  }
}
