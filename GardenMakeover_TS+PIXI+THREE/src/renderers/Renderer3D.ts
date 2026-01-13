import type * as THREE from "three";
import { createLighting } from "../systems/lighting";
import { createScene } from "../systems/scene";
import type { QualitySettings } from "../utils/qualitySettings";

export class Renderer3D {
  
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public lighting: ReturnType<typeof createLighting>;

  private resizeFn: () => void;
  private setPixelRatioFn: (ratio: number) => void;

  constructor(canvas: HTMLCanvasElement, quality: QualitySettings) {

    const { scene, camera, renderer, resize, setPixelRatio } = createScene({
      canvas,
      pixelRatio: quality.pixelRatio,
      powerPreference: quality.powerPreference,
      antialias: quality.antialias
    });

    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.resizeFn = resize;
    this.setPixelRatioFn = setPixelRatio;

    this.lighting = createLighting(scene, { shadowMapSize: quality.shadowMapSize });
  }

  resize() {
    this.resizeFn();
  }

  setPixelRatio(next: number) {

    this.setPixelRatioFn(next);
  }

  render() {
    this.resizeFn();
    this.renderer.render(this.scene, this.camera);
  }
}
