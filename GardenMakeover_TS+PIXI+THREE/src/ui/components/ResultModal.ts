import * as PIXI from "pixi.js";
import { drawRoundedRect } from "../../utils/pixiHelpers";
import { COLORS, FONT, FONT_EMOJI, LIGHT_COLORS } from "../theme";

export class ResultModal {
  public container = new PIXI.Container();
  private overlay = new PIXI.Graphics();
  private card = new PIXI.Container();
  private cardShadow = new PIXI.Graphics();
  private starRow = new PIXI.Container();
  private starValue: PIXI.Text;
  private rewardCoins: PIXI.Text;
  private rewardDiamonds: PIXI.Text;
  private onCTA?: () => void;
  private cardBg: PIXI.Graphics;
  private rewards: PIXI.Container;
  private titleText: PIXI.Text;
  private starLabel: PIXI.Text;
  private subText: PIXI.Text;
  private ctaBg: PIXI.Graphics;
  private ctaText: PIXI.Text;
  private coinPill: PIXI.Container;
  private diamondPill: PIXI.Container;
  private cardWidth = 360;
  private cardHeight = 220;

  constructor({ onCTA }: { onCTA?: () => void }) {
    this.onCTA = onCTA;

    this.overlay.beginFill(0x000000, 0.35);
    this.overlay.drawRect(0, 0, 10, 10);
    this.overlay.endFill();
    this.overlay.eventMode = "static";

    const fullStar = "\u2605";
    const emptyStar = "\u2606";

    this.cardBg = new PIXI.Graphics();
    this.cardShadow = new PIXI.Graphics();
    this.titleText = new PIXI.Text("Great Design!", {
      fontFamily: FONT,
      fontSize: 26,
      fill: COLORS.text,
      fontWeight: "800"
    });
    this.titleText.anchor.set(0.5, 0);

    this.starLabel = new PIXI.Text(fullStar + fullStar + fullStar + fullStar + emptyStar, {
      fontFamily: FONT_EMOJI,
      fontSize: 16,
      fill: COLORS.gold,
      fontWeight: "700"
    });
    this.starLabel.anchor.set(0, 0.5);

    this.starValue = new PIXI.Text("4.6", {
      fontFamily: FONT,
      fontSize: 12,
      fill: COLORS.text,
      fontWeight: "700"
    });
    this.starValue.anchor.set(0, 0.5);
    this.starRow.addChild(this.starLabel, this.starValue);

    this.rewards = new PIXI.Container();
    this.coinPill = this.createRewardPill("assets/images/money.png", "+0");
    this.rewardCoins = this.coinPill.getChildAt(2) as PIXI.Text;
    this.diamondPill = this.createDiamondPill("+0");
    this.rewardDiamonds = this.diamondPill.getChildAt(2) as PIXI.Text;
    this.rewards.addChild(this.coinPill, this.diamondPill);

    this.subText = new PIXI.Text("Keep designing gardens in the full game.", {
      fontFamily: FONT,
      fontSize: 12,
      fill: COLORS.muted,
      fontWeight: "600"
    });
    this.subText.anchor.set(0.5, 0);

    const cta = new PIXI.Container();
    this.ctaBg = drawRoundedRect(280, 44, 16, COLORS.gold, 1, 0x000000, 0);
    this.ctaText = new PIXI.Text("Download", {
      fontFamily: FONT,
      fontSize: 14,
      fill: 0x5a3b00,
      fontWeight: "800"
    });
    this.ctaText.anchor.set(0.5, 0.5);
    this.ctaText.position.set(140, 22);
    cta.addChild(this.ctaBg, this.ctaText);
    cta.eventMode = "static";
    cta.cursor = "pointer";
    cta.on("pointertap", () => this.onCTA?.());
    cta.position.set(40, 178);

    this.card.addChild(this.cardShadow, this.cardBg, this.titleText, this.starRow, this.rewards, this.subText, cta);
    this.container.addChild(this.overlay, this.card);
    this.container.visible = false;

    this.applyTheme();
  }

  private createRewardPill(iconPath: string, value: string) {
    const pill = new PIXI.Container();
    const bg = new PIXI.Graphics();
    const icon = new PIXI.Sprite(PIXI.Texture.from(iconPath));
    icon.width = 16;
    icon.height = 16;
    icon.position.set(12, 7);
    const text = new PIXI.Text(value, {
      fontFamily: FONT,
      fontSize: 12,
      fill: COLORS.text,
      fontWeight: "700"
    });
    text.position.set(36, 6);
    pill.addChild(bg, icon, text);
    return pill;
  }

  private createDiamondPill(value: string) {
    const pill = new PIXI.Container();
    const bg = new PIXI.Graphics();
    const diamond = new PIXI.Text("\u{1F48E}", {
      fontFamily: `${FONT_EMOJI}, ${FONT}`,
      fontSize: 14,
      fill: COLORS.text,
      fontWeight: "800"
    });
    diamond.position.set(12, 6);
    const text = new PIXI.Text(value, {
      fontFamily: FONT,
      fontSize: 12,
      fill: COLORS.text,
      fontWeight: "700"
    });
    text.position.set(36, 6);
    pill.addChild(bg, diamond, text);
    return pill;
  }

  showResult({ stars = 4.6, coins = 250, diamonds = 1 }: { stars: number; coins: number; diamonds: number }) {
    this.container.visible = true;
    this.starValue.text = stars.toFixed(1);
    this.rewardCoins.text = `+${coins}`;
    this.rewardDiamonds.text = `+${diamonds}`;
  }

  hideResult() {
    this.container.visible = false;
  }

  layout(width: number, height: number) {
    this.overlay.width = width;
    this.overlay.height = height;
    this.layoutCard(width);
    this.applyTheme();
    this.card.position.set((width - this.cardWidth) / 2, (height - this.cardHeight) / 2);
  }

  getBounds() {
    return this.container.getBounds();
  }

  applyTheme() {
    const isNight = COLORS.panel !== LIGHT_COLORS.panel;
    const radius = 24;
    const cardAlpha = isNight ? 0.65 : 0.96;

    this.overlay.clear();
    this.overlay.beginFill(0x000000, isNight ? 0.45 : 0.25);
    this.overlay.drawRect(0, 0, 10, 10);
    this.overlay.endFill();

    this.cardShadow.clear();
    this.cardShadow.beginFill(0x000000, isNight ? 0.38 : 0.2);
    this.cardShadow.drawRoundedRect(0, 10, this.cardWidth, this.cardHeight, radius);
    this.cardShadow.endFill();

    this.cardBg.clear();
    this.cardBg.beginFill(COLORS.panel, cardAlpha);
    this.cardBg.lineStyle(1, isNight ? 0x3a4a55 : 0x000000, isNight ? 0.5 : 0);
    this.cardBg.drawRoundedRect(0, 0, this.cardWidth, this.cardHeight, radius);
    this.cardBg.endFill();

    this.titleText.style.fill = COLORS.text;
    this.starLabel.style.fill = COLORS.gold;
    this.starValue.style.fill = COLORS.text;
    this.subText.style.fill = COLORS.muted;
    this.ctaText.style.fill = isNight ? 0x3b2a00 : 0x5a3b00;
    this.updateRewardPill(this.coinPill, COLORS.text, isNight);
    this.updateRewardPill(this.diamondPill, COLORS.text, isNight);
  }

  private updateRewardPill(pill: PIXI.Container, textColor: number, isNight: boolean) {
    const bg = pill.getChildAt(0) as PIXI.Graphics;
    const icon = pill.getChildAt(1);
    const text = pill.getChildAt(2) as PIXI.Text;
    bg.clear();
    bg.beginFill(COLORS.panelSoft, isNight ? 0.65 : 0.9);
    bg.lineStyle(1, isNight ? 0x3a4855 : 0x000000, isNight ? 0.6 : 0);
    bg.drawRoundedRect(0, 0, 112, 30, 15);
    bg.endFill();
    if (icon instanceof PIXI.Text) {
      icon.style.fill = textColor;
    }
    text.style.fill = textColor;
  }

  private layoutCard(width: number) {
    const cardWidth = Math.max(300, Math.min(520, width - 40));
    const cardHeight = cardWidth < 360 ? 210 : 230;
    this.cardWidth = cardWidth;
    this.cardHeight = cardHeight;

    this.titleText.style.fontSize = cardWidth < 360 ? 20 : 24;
    this.titleText.position.set(cardWidth / 2, 18);

    this.starLabel.style.fontSize = cardWidth < 360 ? 14 : 16;
    this.starValue.style.fontSize = cardWidth < 360 ? 12 : 13;
    this.starLabel.position.set(0, 0);
    this.starValue.position.set(this.starLabel.width + 8, 0);
    this.starRow.position.set((cardWidth - this.starRow.width) / 2, 60);

    const pillGap = 10;
    const pillWidth = 112;
    const totalPillsWidth = pillWidth * 2 + pillGap;
    const rewardsX = (cardWidth - totalPillsWidth) / 2;
    this.rewards.position.set(rewardsX, 88);
    this.coinPill.position.set(0, 0);
    this.diamondPill.position.set(pillWidth + pillGap, 0);

    this.subText.style.fontSize = cardWidth < 360 ? 10 : 12;
    this.subText.position.set(cardWidth / 2, 128);

    const ctaWidth = Math.max(200, Math.min(320, cardWidth - 64));
    this.ctaBg.clear();
    this.ctaBg.beginFill(COLORS.gold, 1);
    this.ctaBg.drawRoundedRect(0, 0, ctaWidth, 44, 16);
    this.ctaBg.endFill();
    this.ctaText.position.set(ctaWidth / 2, 22);
    const cta = this.ctaBg.parent as PIXI.Container;
    cta.position.set((cardWidth - ctaWidth) / 2, cardHeight - 58);

    this.cardShadow.position.set(0, 0);
    this.cardBg.position.set(0, 0);
  }
}
