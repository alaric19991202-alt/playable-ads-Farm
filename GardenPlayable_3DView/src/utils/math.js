export function easeOutQuad(t) {
  return t * (2 - t);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}
