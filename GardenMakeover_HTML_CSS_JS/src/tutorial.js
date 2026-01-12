import { setHint } from "./ui.js";

export function createTutorial(ui) {
  const steps = [
    { type: "overlay", text: "Tap a category below, pick an item, then tap a glowing spot." },
    { type: "hint", text: "Required items are marked in teal on the left." },
    { type: "hint", text: "When you're done, tap Finish." }
  ];
  let i = 0;
  let done = false;

  function showStep() {
    const s = steps[i];
    if (!s || done) return;
    if (s.type === "overlay") {
      ui?.showTutorial(true, s.text);
    } else {
      ui?.showTutorial(false);
      setHint(s.text);
    }
  }

  function next() {
    if (done) return;
    i = Math.min(i + 1, steps.length - 1);
    showStep();
    if (i === steps.length - 1) {
      // keep last hint around briefly
      window.setTimeout(() => setHint(""), 2200);
    }
  }

  function dismissOverlay() {
    ui?.showTutorial(false);
    if (i === 0) {
      i = 1;
      showStep();
    }
  }

  function complete() {
    done = true;
    ui?.showTutorial(false);
    setHint("");
  }

  function isCompleted() {
    return done;
  }

  showStep();

  return { next, dismissOverlay, complete, isCompleted };
}

export function createHintSystem() {

  function requiredHint() {
    setHint("Tip: Teal = required. Pink = bonus.");
  }
  function placeHint() {
    setHint("Tip: Tap a glowing spot to place.");
  }
  function finishHint() {
    setHint("Tip: Tap Finish to submit.");
  }
  return { requiredHint, placeHint, finishHint };
}
