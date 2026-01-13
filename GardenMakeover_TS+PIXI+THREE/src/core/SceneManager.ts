import type { BaseScene } from "./BaseScene";

export class SceneManager {
  
  private activeScene: BaseScene | null = null;

  setScene(scene: BaseScene) {
    this.activeScene?.dispose();
    this.activeScene = scene;
    this.activeScene.init();
  }

  update(now: number) {
    this.activeScene?.update(now);
  }
}
