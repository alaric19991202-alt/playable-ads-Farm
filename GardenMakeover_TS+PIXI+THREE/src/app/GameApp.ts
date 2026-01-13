import type { SceneManager } from "../core/SceneManager";
import type { Renderer3D } from "../renderers/Renderer3D";
import type { RendererUI } from "../renderers/RendererUI";

export class GameApp {
  constructor(
    private renderer3D: Renderer3D,
    private rendererUI: RendererUI,
    private sceneManager: SceneManager
  ) {}

  start() {

    requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    if (document.hidden) {

      requestAnimationFrame(this.tick);
      return;
    }

    this.sceneManager.update(now);
    this.renderer3D.render();
    this.rendererUI.render();
    
    requestAnimationFrame(this.tick);
  };
}
