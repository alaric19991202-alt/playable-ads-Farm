import { setHint } from "./ui.js";

export function createTutorial(ui) {
  const steps = [
    { type: "overlay", text: "Tap a category below, pick an item, then tap a glowing spot." },
    { type: "hint", text: "Required items are marked in teal on the left." },
    { type: "hint", text: "When you're done, tap Finish." }
  ];
  let stepIndex = 0;
  let isDone = false;

  function showStep() {
    const step = steps[stepIndex];
    if (!step || isDone) return;
    if (step.type === "overlay") {
      ui?.showTutorial(true, step.text);
    } else {
      ui?.showTutorial(false);
      setHint(step.text);
    }
  }

  function next() {
    if (isDone) return;
    stepIndex = Math.min(stepIndex + 1, steps.length - 1);
    showStep();
    if (stepIndex === steps.length - 1) {
      window.setTimeout(() => setHint(""), 2200);
    }
  }

  function dismissOverlay() {
    ui?.showTutorial(false);
    if (stepIndex === 0) {
      stepIndex = 1;
      showStep();
    }
  }

  function complete() {
    isDone = true;
    ui?.showTutorial(false);
    setHint("");
  }

  function isCompleted() {
    return isDone;
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

