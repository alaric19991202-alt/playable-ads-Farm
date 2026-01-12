import { easeOutQuad, lerp } from "./math.js";

export function tweenNumber({ from, to, duration = 220, onUpdate, onComplete }) {
  const start = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const e = easeOutQuad(t);
    const value = lerp(from, to, e);
    onUpdate(value);
    if (t < 1) requestAnimationFrame(tick);
    else onComplete?.();
  }
  requestAnimationFrame(tick);
}
