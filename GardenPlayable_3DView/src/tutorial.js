import { setHint } from "./ui.js";

export function createTutorial() {
  const steps = [
    "Step 1: Choose an item below.",
    "Step 2: Tap inside the garden to place it.",
    "Great job! You've completed the tutorial."
  ];
  let i = 0;
  function show() { setHint(steps[i] || ""); }
  function next() { i = Math.min(i + 1, steps.length - 1); show(); }
  function reset() { i = 0; show(); }
  const isCompleted = () => i >= steps.length - 1;

  reset();
  return { next, reset, show, isCompleted };
}

export function createHintSystem() {

  const hintSteps = [
    "Tip: Time moves faster and Boost speeds it up.",
    "Tip: Move items with the assist buttons.",
    "Tip: Rotate items with the assist buttons.",
    "Tip: Delete items with the assist buttons.",
    "Tip: Use the undo button to revert your last action.",
    "Tip: Adjust the camera FOV for a better view.",
    "Tip: Explore and have fun designing your garden!",
    "Tip: RMB(Right Mouse Button) drag to rotate the camera.",
    "Tip: Use the mouse wheel to zoom in and out."
  ];

  let i = 0;
  function reset() { i = 0; show(); }
  function show() { setHint(""); }
  function pickStep(stepIndex) {
    i = Math.max(0, Math.min(stepIndex, hintSteps.length));
    playHint();
  }
  
  function playHint() {
    const hint = hintSteps[i - 1];
    if (hint) setHint(hint);
  }

  reset();
  return { pickStep, reset, playHint};
}