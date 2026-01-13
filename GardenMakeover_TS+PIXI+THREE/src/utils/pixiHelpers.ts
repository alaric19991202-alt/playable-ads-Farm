import * as PIXI from "pixi.js";

type TweenParams = {
  from: number;
  to: number;
  duration?: number;
  onUpdate?: (value: number) => void;
  onComplete?: () => void;
};

export function drawRoundedRect(width: number, height: number, radius: number, color: number, alpha = 1, strokeColor?: number, strokeWidth = 1) {
  const g = new PIXI.Graphics();
  if (strokeColor !== undefined) {
    g.lineStyle(strokeWidth, strokeColor, 1);
  }
  g.beginFill(color, alpha);
  g.drawRoundedRect(0, 0, width, height, radius);
  g.endFill();
  return g;
}

export function drawCircle(radius: number, color: number, alpha = 1) {
  const g = new PIXI.Graphics();
  g.beginFill(color, alpha);
  g.drawCircle(0, 0, radius);
  g.endFill();
  return g;
}

export function tweenNumber({ from, to, duration = 240, onUpdate, onComplete }: TweenParams) {
  const start = performance.now();
  function easeOutQuad(t: number) {
    return t * (2 - t);
  }
  function tick(now: number) {
    const t = Math.min(1, (now - start) / duration);
    const e = easeOutQuad(t);
    const value = from + (to - from) * e;
    onUpdate?.(value);
    if (t < 1) requestAnimationFrame(tick);
    else onComplete?.();
  }
  requestAnimationFrame(tick);
}
