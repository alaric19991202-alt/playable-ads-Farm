export function createAudioSystem(sounds) {
  const audio = {
    enabled: false,
    click: new Audio(sounds.click),
    place: new Audio(sounds.place),
    theme: new Audio(sounds.theme)
  };

  audio.click.volume = 0.55;
  audio.place.volume = 0.60;
  audio.theme.loop = true;
  audio.theme.volume = 0.18;

  let themeStarted = false;

  function unlockAudioOnce() {
    if (audio.enabled) return;
    audio.enabled = true;
    audio.click.play().then(() => {
      audio.click.pause();
      audio.click.currentTime = 0;
    }).catch(() => {});
  }

  function startThemeOnce() {
    if (themeStarted || !audio.enabled) return;
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

  function playSfx(aud) {
    if (!audio.enabled) return;
    try {
      aud.currentTime = 0;
      aud.play();
    } catch {}
  }

  function playClick() {
    playSfx(audio.click);
  }

  function playPlace() {
    playSfx(audio.place);
  }

  return {
    unlockAudioOnce,
    startThemeOnce,
    playSfx,
    playClick,
    playPlace
  };
}
