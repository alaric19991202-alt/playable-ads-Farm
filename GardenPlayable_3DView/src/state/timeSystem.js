export function createTimeSystem({
  ui,
  applyTimeOfDay,
  baseScale = 300,
  boostSteps = [1],
  dayStartHour = 6,
  nightStartHour = 18,
  initialTimeMs = Date.now()
}) {
  let boostIndex = 0;
  let boostMultiplier = boostSteps[boostIndex];
  let gameTimeMs = initialTimeMs;
  let lastClockSecond = -1;
  let isNight = isNightForDate(new Date(gameTimeMs));

  function isNightForDate(date) {
    const hour = date.getHours();
    return hour < dayStartHour || hour >= nightStartHour;
  }

  function formatClockTime(date) {
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    const s = String(date.getSeconds()).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  function formatBoostLabel(multiplier) {
    const value = Number.isInteger(multiplier)
      ? multiplier.toFixed(0)
      : multiplier.toFixed(1);
    return `${value}x`;
  }

  function init() {
    applyTimeOfDay(isNight, false);
    ui.setClock(formatClockTime(new Date(gameTimeMs)), isNight);
  }

  function advance(dt) {
    gameTimeMs += dt * 1000 * baseScale * boostMultiplier;

    const gameDate = new Date(gameTimeMs);
    const nextIsNight = isNightForDate(gameDate);
    if (nextIsNight !== isNight) {
      isNight = nextIsNight;
      applyTimeOfDay(isNight, true);
    }

    const gameSecond = Math.floor(gameTimeMs / 1000);
    if (gameSecond !== lastClockSecond) {
      ui.setClock(formatClockTime(gameDate), isNight);
      lastClockSecond = gameSecond;
    }
  }

  function cycleBoost() {
    boostIndex = (boostIndex + 1) % boostSteps.length;
    boostMultiplier = boostSteps[boostIndex];
    return boostMultiplier;
  }

  function getBoostLabel() {
    return formatBoostLabel(boostMultiplier);
  }

  function getBoostMultiplier() {
    return boostMultiplier;
  }

  function getIsNight() {
    return isNight;
  }

  return {
    init,
    advance,
    cycleBoost,
    getBoostLabel,
    getBoostMultiplier,
    getIsNight
  };
}
