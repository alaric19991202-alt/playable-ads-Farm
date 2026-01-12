import * as THREE from "three";

function pickDefaultClip(clips) {
  if (!clips?.length) return null;
  const idle = clips.find((clip) => /idle/i.test(clip.name));
  if (idle) return idle;
  return clips.find((clip) => clip.duration > 0) || clips[0];
}

export function createAnimationSystem() {
  const clipsByItem = new Map();
  const activeMixers = [];
  const mixerMap = new WeakMap();
  const clock = new THREE.Clock();
  const maxDelta = 0.05;

  function registerClips(itemId, clips) {
    if (!clips?.length) return;
    clipsByItem.set(itemId, clips);
  }

  function registerAll(map) {
    if (!map) return;
    for (const [itemId, clips] of map.entries()) {
      registerClips(itemId, clips);
    }
  }

  function start(root) {
    if (!root || mixerMap.has(root)) return;
    const itemId = root.userData?.itemId;
    if (!itemId) return;
    const clips = clipsByItem.get(itemId);
    if (!clips?.length) return;
    const clip = pickDefaultClip(clips);
    if (!clip) return;

    if (!activeMixers.length) {
      clock.getDelta();
    }

    const mixer = new THREE.AnimationMixer(root);
    mixer.clipAction(clip).play();
    mixerMap.set(root, mixer);
    activeMixers.push({ root, mixer });
  }

  function stop(root) {
    const mixer = mixerMap.get(root);
    if (!mixer) return;
    mixer.stopAllAction();
    mixerMap.delete(root);
    for (let i = activeMixers.length - 1; i >= 0; i -= 1) {
      if (activeMixers[i].root === root) activeMixers.splice(i, 1);
    }
  }

  function update() {
    if (!activeMixers.length) return;
    const delta = clock.getDelta();
    if (!delta) return;
    const step = Math.min(delta, maxDelta);
    for (let i = activeMixers.length - 1; i >= 0; i -= 1) {
      const entry = activeMixers[i];
      if (!entry.root || !entry.root.parent) {
        mixerMap.delete(entry.root);
        activeMixers.splice(i, 1);
        continue;
      }
      entry.mixer.update(step);
    }
  }

  return {
    registerClips,
    registerAll,
    start,
    stop,
    update,
    resetClock() {
      clock.getDelta();
    },
    hasActive() {
      return activeMixers.length > 0;
    }
  };
}
