import * as PIXI from "pixi.js";
import { drawRoundedRect } from "../../utils/pixiHelpers";
import { COLORS, FONT, FONT_EMOJI } from "../theme";

type PillIcon = PIXI.Sprite | PIXI.Text;

type PillParts = {
  shadow: PIXI.Graphics;
  bg: PIXI.Graphics;
  icon: PillIcon;
  value: PIXI.Text;
};

const ACCENT = 0x5fe7b2;
const ACCENT_2 = 0x6ad9ff;
const SHADOW_ALPHA = 0.14;

export class TopBar {
  public container = new PIXI.Container();

  private brandSprite: PIXI.Sprite;
  private brandContainer = new PIXI.Container();
  private brandBg: PIXI.Graphics;
  private brandMask: PIXI.Graphics;
  private brandSize = 45;
  private brandRadius = 9;
  private challengeCard = new PIXI.Container();
  private challengeShadow = new PIXI.Graphics();
  private challengeBg = new PIXI.Graphics();
  private challengeTitle: PIXI.Text;
  private challengeSub: PIXI.Text;
  private challengeTitleFull = "GardenMakeover";
  private challengeSubFull = "Design your dream garden";
  private challengePaddingX = 12;
  private challengePaddingY = 10;
  private challengeRadius = 16;

  private currencyRow = new PIXI.Container();
  private coinPill: PIXI.Container;
  private diamondPill: PIXI.Container;
  private energyPill: PIXI.Container;
  private coinValue: PIXI.Text;
  private diamondValue: PIXI.Text;
  private energyValue: PIXI.Text;
  private pillParts = new Map<PIXI.Container, PillParts>();
  private pillHeight = 34;
  private pillPaddingX = 10;
  private pillGap = 6;
  private pillIconSize = 18;

  private dayNightButton = new PIXI.Container();
  private dayNightShadow = new PIXI.Graphics();
  private dayNightBg = new PIXI.Graphics();
  private dayNightIcon = new PIXI.Graphics();
  private dayNightSize = 44;

  private onToggleDayNight?: () => void;
  private lastLayoutWidth = 0;

  constructor({ onToggleDayNight }: { onToggleDayNight?: () => void }) {
    this.onToggleDayNight = onToggleDayNight;

    const brandTexture = PIXI.Texture.from("assets/icon.png");
    this.brandSprite = new PIXI.Sprite(brandTexture);
    this.brandSprite.width = this.brandSize - 6;
    this.brandSprite.height = this.brandSize - 6;
    this.brandSprite.roundPixels = true;

    const brandHalo = drawRoundedRect(this.brandSize + 16, this.brandSize + 16, this.brandRadius + 8, ACCENT, 0.35, 0x000000, 0);
    brandHalo.position.set(-8, 1.5);

    this.brandBg = new PIXI.Graphics();
    const brandTex = this.createGradientTexture(this.brandSize, this.brandSize, ACCENT, ACCENT_2);
    this.brandBg.beginTextureFill({ texture: brandTex });
    this.brandBg.drawRoundedRect(0, 6.8, this.brandSize, this.brandSize, this.brandRadius);
    this.brandBg.endFill();

    this.brandMask = new PIXI.Graphics();
    this.brandMask.beginFill(0xffffff, 1);
    this.brandMask.drawRoundedRect(3, 10, this.brandSize - 6, this.brandSize - 6, Math.max(0, this.brandRadius - 2));
    this.brandMask.endFill();
    this.brandMask.renderable = true;
    this.brandMask.alpha = 0.001;

    this.brandSprite.position.set(3, 10);
    this.brandSprite.mask = this.brandMask;
    this.brandContainer.addChild(brandHalo, this.brandBg, this.brandSprite, this.brandMask);

    this.challengeTitle = new PIXI.Text(this.challengeTitleFull, {
      fontFamily: FONT,
      fontSize: 20,
      fill: COLORS.text,
      fontWeight: "800"
    });
    this.challengeSub = new PIXI.Text(this.challengeSubFull, {
      fontFamily: FONT,
      fontSize: 12,
      fill: COLORS.muted,
      fontWeight: "600"
    });

    this.challengeCard.addChild(this.challengeShadow, this.challengeBg, this.challengeTitle, this.challengeSub);

    this.coinValue = new PIXI.Text("0", {
      fontFamily: FONT,
      fontSize: 14,
      fill: COLORS.text,
      fontWeight: "800"
    });
    this.diamondValue = new PIXI.Text("0", {
      fontFamily: FONT,
      fontSize: 14,
      fill: COLORS.text,
      fontWeight: "800"
    });
    this.energyValue = new PIXI.Text("0/0", {
      fontFamily: FONT,
      fontSize: 14,
      fill: COLORS.text,
      fontWeight: "800"
    });

    this.coinPill = this.createCurrencyPill(PIXI.Texture.from("assets/images/money.png"), this.coinValue);
    this.diamondPill = this.createDiamondPill(this.diamondValue);
    this.energyPill = this.createEnergyPill(this.energyValue);

    this.currencyRow.addChild(this.coinPill, this.diamondPill, this.energyPill);

    this.dayNightShadow = drawRoundedRect(this.dayNightSize, this.dayNightSize, 14, 0x000000, SHADOW_ALPHA, 0x000000, 0);
    this.dayNightShadow.position.set(0, 2);
    this.dayNightBg = drawRoundedRect(this.dayNightSize, this.dayNightSize, 14, COLORS.panel, 1, COLORS.stroke, 1);
    this.dayNightButton.addChild(this.dayNightShadow, this.dayNightBg, this.dayNightIcon);
    this.dayNightButton.eventMode = "static";
    this.dayNightButton.cursor = "pointer";
    this.dayNightButton.on("pointertap", () => this.onToggleDayNight?.());

    this.container.addChild(this.brandContainer, this.challengeCard, this.currencyRow, this.dayNightButton);
    this.setDayNightIcon(false);
  }

  private createCurrencyPill(texture: PIXI.Texture, valueText: PIXI.Text) {
    const icon = new PIXI.Sprite(texture);
    return this.createPill(icon, valueText);
  }

  private createEmojiIcon(symbol: string, size: number) {
    const icon = new PIXI.Text(symbol, {
      fontFamily: `${FONT_EMOJI}, ${FONT}`,
      fontSize: size,
      fill: COLORS.text,
      fontWeight: "800",
      lineHeight: size
    });
    icon.anchor.set(0, 0);
    return icon;
  }

  private createDiamondPill(valueText: PIXI.Text) {
    const diamond = this.createEmojiIcon("\u{1F48E}", 16);
    return this.createPill(diamond, valueText);
  }

  private createEnergyPill(valueText: PIXI.Text) {
    const drop = this.createEmojiIcon("\u{1F4A7}", 16);
    return this.createPill(drop, valueText);
  }

  private createPill(icon: PillIcon, valueText: PIXI.Text) {
    const pill = new PIXI.Container();
    const shadow = new PIXI.Graphics();
    const bg = new PIXI.Graphics();
    pill.addChild(shadow, bg, icon, valueText);
    this.pillParts.set(pill, { shadow, bg, icon, value: valueText });
    return pill;
  }

  private layoutPill(pill: PIXI.Container) {
    const parts = this.pillParts.get(pill);
    if (!parts) return { width: 0, height: 0 };

    if (parts.icon instanceof PIXI.Sprite) {
      parts.icon.width = this.pillIconSize;
      parts.icon.height = this.pillIconSize;
    }

    const height = this.pillHeight;
    const radius = height / 2;
    const iconWidth = Math.max(this.pillIconSize, parts.icon.width);
    const width = Math.ceil(this.pillPaddingX * 2 + iconWidth + this.pillGap + parts.value.width);

    parts.shadow.clear();
    parts.shadow.beginFill(0x000000, SHADOW_ALPHA);
    parts.shadow.drawRoundedRect(0, 2, width, height, radius);
    parts.shadow.endFill();

    parts.bg.clear();
    parts.bg.lineStyle(1, COLORS.stroke, 1);
    parts.bg.beginFill(COLORS.panel, 1);
    parts.bg.drawRoundedRect(0, 0, width, height, radius);
    parts.bg.endFill();

    const iconOffsetX = this.pillPaddingX + Math.max(0, (iconWidth - parts.icon.width) / 2);
    parts.icon.position.set(iconOffsetX, (height - parts.icon.height) / 2);
    parts.value.position.set(this.pillPaddingX + iconWidth + this.pillGap, (height - parts.value.height) / 2);

    return { width, height };
  }

  private layoutCurrencyRow(maxWidth: number) {
    const pills = [this.coinPill, this.diamondPill, this.energyPill];
    const rowGap = 8;
    let x = 0;
    let y = 0;
    let rowHeight = 0;
    let maxRowWidth = 0;

    for (const pill of pills) {
      const size = this.layoutPill(pill);
      if (x > 0 && x + size.width > maxWidth) {
        x = 0;
        y += rowHeight + rowGap;
        rowHeight = 0;
      }
      pill.position.set(x, y);
      x += size.width + rowGap;
      rowHeight = Math.max(rowHeight, size.height);
      maxRowWidth = Math.max(maxRowWidth, x - rowGap);
    }

    return { width: maxRowWidth, height: y + rowHeight };
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

  private layoutChallengeCard(width: number) {
    const textWidth = Math.max(120, width - this.challengePaddingX * 2);
    this.applyEllipsis(this.challengeTitle, this.challengeTitleFull, textWidth);
    this.applyEllipsis(this.challengeSub, this.challengeSubFull, textWidth);

    this.challengeTitle.position.set(this.challengePaddingX, this.challengePaddingY - 1);
    this.challengeSub.position.set(this.challengePaddingX, this.challengePaddingY + this.challengeTitle.height + 2);

    const height = Math.max(56, this.challengePaddingY * 2 + this.challengeTitle.height + this.challengeSub.height + 2);

    this.challengeShadow.clear();
    this.challengeShadow.beginFill(0x000000, SHADOW_ALPHA);
    this.challengeShadow.drawRoundedRect(0, 2, width, height, this.challengeRadius);
    this.challengeShadow.endFill();

    this.challengeBg.clear();
    this.challengeBg.lineStyle(1, COLORS.stroke, 1);
    this.challengeBg.beginFill(COLORS.panel, 1);
    this.challengeBg.drawRoundedRect(0, 0, width, height, this.challengeRadius);
    this.challengeBg.endFill();

    return height;
  }

  private createGradientTexture(width: number, height: number, from: number, to: number) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return PIXI.Texture.WHITE;
    const gradient = ctx.createLinearGradient(0, height, width, 0);
    gradient.addColorStop(0, this.colorToCss(from));
    gradient.addColorStop(1, this.colorToCss(to));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    return PIXI.Texture.from(canvas);
  }

  private colorToCss(color: number) {
    return `#${color.toString(16).padStart(6, "0")}`;
  }

  setCurrencies({ coins, diamonds }: { coins: number; diamonds: number }) {
    this.coinValue.text = String(Math.max(0, Math.floor(coins)));
    this.diamondValue.text = String(Math.max(0, Math.floor(diamonds)));
    if (this.lastLayoutWidth) this.layout(this.lastLayoutWidth);
  }

  setEnergy(cur: number, max: number) {
    this.energyValue.text = `${Math.max(0, cur)}/${Math.max(1, max)}`;
    if (this.lastLayoutWidth) this.layout(this.lastLayoutWidth);
  }

  setDayNightIcon(isNight: boolean) {
    this.dayNightIcon.clear();
    const center = this.dayNightSize / 2;
    if (isNight) {
      this.dayNightIcon.beginFill(0xb3d4ff, 1);
      this.dayNightIcon.drawCircle(center, center, 10);
      this.dayNightIcon.endFill();
      this.dayNightIcon.beginFill(0x0c1a2a, 1);
      this.dayNightIcon.drawCircle(center + 6, center - 5, 8);
      this.dayNightIcon.endFill();
    } else {
      this.dayNightIcon.beginFill(0xffcf5a, 1);
      this.dayNightIcon.drawCircle(center, center, 9);
      this.dayNightIcon.endFill();
      this.dayNightIcon.lineStyle(2, 0xffcf5a, 1);
      for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI * 2 * i) / 6;
        const x = center + Math.cos(angle) * 13;
        const y = center + Math.sin(angle) * 13;
        const x2 = center + Math.cos(angle) * 18;
        const y2 = center + Math.sin(angle) * 18;
        this.dayNightIcon.moveTo(x, y);
        this.dayNightIcon.lineTo(x2, y2);
      }
    }
  }

  applyTheme() {
    this.challengeTitle.style.fill = COLORS.text;
    this.challengeSub.style.fill = COLORS.muted;
    this.coinValue.style.fill = COLORS.text;
    this.diamondValue.style.fill = COLORS.text;
    this.energyValue.style.fill = COLORS.text;

    for (const parts of this.pillParts.values()) {
      if (parts.icon instanceof PIXI.Text) {
        parts.icon.style.fill = COLORS.text;
      }
    }

    this.dayNightBg.clear();
    this.dayNightBg.lineStyle(1, COLORS.stroke, 1);
    this.dayNightBg.beginFill(COLORS.panel, 1);
    this.dayNightBg.drawRoundedRect(0, 0, this.dayNightSize, this.dayNightSize, 14);
    this.dayNightBg.endFill();

    if (this.lastLayoutWidth) this.layout(this.lastLayoutWidth);
  }

  layout(width: number) {
    this.lastLayoutWidth = width;
    const pad = 12;
    const top = 10;
    const gap = 12;

    this.brandContainer.position.set(pad, top);

    const brandWidth = this.brandSize;
    const fullRow = this.layoutCurrencyRow(9999);
    const rightWidth = fullRow.width + gap + this.dayNightSize;
    const minChallengeWidth = 220;
    const availableForChallenge = width - pad * 2 - brandWidth - gap - rightWidth - gap;
    const isCompact = availableForChallenge < minChallengeWidth;

    if (isCompact) {
      const challengeWidth = Math.max(160, width - (pad * 2 + brandWidth + gap));
      const challengeHeight = this.layoutChallengeCard(challengeWidth);
      this.challengeCard.position.set(pad + brandWidth + gap, top);

      const rowTop = top + Math.max(this.brandSize, challengeHeight) + 10;
      const maxRowWidth = Math.max(140, width - pad * 2 - this.dayNightSize - gap);
      const wrapped = this.layoutCurrencyRow(maxRowWidth);
      this.currencyRow.position.set(width - pad - this.dayNightSize - gap - wrapped.width, rowTop);
      this.dayNightButton.position.set(width - pad - this.dayNightSize, rowTop - 2);
      return;
    }

    const challengeWidth = Math.max(minChallengeWidth, availableForChallenge);
    const challengeHeight = this.layoutChallengeCard(challengeWidth);
    this.challengeCard.position.set(pad + brandWidth + gap, top);

    const rightX = width - pad - rightWidth;
    this.currencyRow.position.set(rightX, top + Math.max(0, (challengeHeight - fullRow.height) / 2));
    this.dayNightButton.position.set(this.currencyRow.x + fullRow.width + gap, top + Math.max(0, (challengeHeight - this.dayNightSize) / 2));
  }

  getBounds() {
    return this.container.getBounds();
  }
}
