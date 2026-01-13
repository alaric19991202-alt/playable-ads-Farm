import * as PIXI from "pixi.js";

export class RendererUI {
  
  public app: PIXI.Application;
  public stage: PIXI.Container;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {

    this.app = new PIXI.Application({
      view: canvas,
      width,
      height,

      antialias: true,
      backgroundAlpha: 0,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2)
    });
    this.stage = this.app.stage;
    this.app.ticker.stop();
  }

  resize(width: number, height: number) {
    this.app.renderer.resize(width, height);
  }

  render() {
    this.app.render();
  }
}
