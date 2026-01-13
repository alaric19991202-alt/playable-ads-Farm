import { GameApp } from "./GameApp";
import { EventBus } from "../core/EventBus";
import { SceneManager } from "../core/SceneManager";
import { StateManager } from "../core/StateManager";
import { Renderer3D } from "../renderers/Renderer3D";
import { RendererUI } from "../renderers/RendererUI";
import { GardenScene } from "../scenes/GardenScene";
import { UIManager } from "../ui/UIManager";
import { getQualitySettings } from "../utils/qualitySettings";
import { setUIManager } from "../ui";



export function bootstrap() {
  const canvas3d = document.getElementById("c3d") as HTMLCanvasElement | null;
  const canvasUi = document.getElementById("cui") as HTMLCanvasElement | null;

  if (!canvas3d || !canvasUi) {
    throw new Error("Missing canvas elements");
  }

  window.clickTag = window.clickTag || "https://sett.example.com";

  const qualitySettings = getQualitySettings();
  const renderer3D = new Renderer3D(canvas3d, qualitySettings);
  const rendererUI = new RendererUI(canvasUi, window.innerWidth, window.innerHeight);
  const eventBus = new EventBus();
  const stateManager = new StateManager();
  const uiManager = new UIManager(rendererUI, eventBus);

  setUIManager(uiManager);
  const sceneManager = new SceneManager();

  const gardenScene = new GardenScene(renderer3D, uiManager, stateManager, eventBus);
  sceneManager.setScene(gardenScene);
  const app = new GameApp(renderer3D, rendererUI, sceneManager);
  app.start();

  function onResize() {
    rendererUI.resize(window.innerWidth, window.innerHeight);
    uiManager.resize(window.innerWidth, window.innerHeight);
  }

  window.addEventListener("resize", onResize, { passive: true });
  
  onResize();
}
