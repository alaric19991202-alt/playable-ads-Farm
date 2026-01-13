export type QualitySettings = {
  pixelRatio: number;
  shadowMapSize: number;
  powerPreference: WebGLPowerPreference;
  antialias: boolean;
  frameInterval: number;
};

export function getQualitySettings(): QualitySettings {
  const dpr = window.devicePixelRatio || 1;
  const shortSide = Math.min(window.innerWidth, window.innerHeight);
  const isMobile = shortSide <= 820;
  const isLowEnd = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || shortSide <= 420;
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const maxPixelRatio = isLowEnd ? 1.25 : (isMobile ? 1.5 : 2);
  const targetFps = prefersReducedMotion || isLowEnd ? 30 : 60;
  return {
    pixelRatio: Math.min(dpr, maxPixelRatio),
    shadowMapSize: isLowEnd || isMobile ? 512 : 1024,
    powerPreference: isLowEnd ? "low-power" : "high-performance",
    antialias: !isLowEnd,
    frameInterval: 1000 / targetFps
  };
}
