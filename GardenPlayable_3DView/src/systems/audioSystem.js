export function createAudioSystem(sounds) {
  const audio = {
    enabled: false,
    click: new Audio(sounds.click),
    place: new Audio(sounds.place),
    theme: new Audio(sounds.theme),
    chicken: new Audio(sounds.chicken),
    cow: new Audio(sounds.cow),
    sheep: new Audio(sounds.sheep)
  };

  audio.click.volume = 0.55;
  audio.place.volume = 0.60;
  audio.theme.loop = true;
  audio.theme.volume = 0.22;
  audio.cow.volume = 0.55;
  audio.sheep.volume = 0.55;
  audio.chicken.volume = 0.5;

  let themeStarted = false;

  function startThemeOnce() {
    if (themeStarted) return;
    themeStarted = true;
    try {
      audio.theme.currentTime = 0;
      const p = audio.theme.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => { themeStarted = false; });
      }
    } catch {
      themeStarted = false;
    }
  }

  function unlock() {
    if (audio.enabled) return;
    audio.enabled = true;
    audio.click.play().then(() => {
      audio.click.pause();
      audio.click.currentTime = 0;
    }).catch(() => {});
    startThemeOnce();
  }

  function playSfx(aud) {
    if (!audio.enabled) return;
    try {
      aud.currentTime = 0;
      aud.play();
    } catch {}
  }

  const animalAudioById = new Map([
    ["cow", audio.cow],
    ["sheep", audio.sheep],
    ["chicken", audio.chicken]
  ]);

  function playAnimalSelection(itemId) {
    if (!itemId) return;
    const aud = animalAudioById.get(itemId);
    if (!aud) return;
    unlock();
    playSfx(aud);
  }

  return {
    unlock,
    playSfx,
    playClick: () => playSfx(audio.click),
    playPlace: () => playSfx(audio.place),
    playTheme: () => playSfx(audio.theme),
    playAnimalSelection
  };
}
