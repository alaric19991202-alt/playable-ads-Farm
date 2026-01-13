export const LIGHT_COLORS = {
  teal: 0x2bb5b0,
  pink: 0xff6fae,
  green: 0x34c76a,
  gold: 0xffcf5a,
  text: 0x183044,
  muted: 0x6a7a8c,
  panel: 0xffffff,
  panelSoft: 0xf7fbff,
  stroke: 0xdde7f0,
  nightText: 0xf3f7ff
};

export const DARK_COLORS = {
  teal: 0x32c9b0,
  pink: 0xff7eb6,
  green: 0x45c98a,
  gold: 0xf6d36c,
  text: 0xf3f7ff,
  muted: 0xa5b4c8,
  panel: 0x1f2a33,
  panelSoft: 0x27353f,
  stroke: 0x394957,
  nightText: 0xf3f7ff
};

export const COLORS = { ...LIGHT_COLORS };

export function setTheme(isNight: boolean) {
  Object.assign(COLORS, isNight ? DARK_COLORS : LIGHT_COLORS);
}

export const FONT = "\"Baloo 2\", \"Outfit\", system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif";
export const FONT_EMOJI = "\"Apple Color Emoji\", \"Segoe UI Emoji\", \"Segoe UI Symbol\", \"Noto Color Emoji\", \"Android Emoji\", \"EmojiSymbols\"";
