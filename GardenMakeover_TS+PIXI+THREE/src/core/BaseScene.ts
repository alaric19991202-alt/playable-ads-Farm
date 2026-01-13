export abstract class BaseScene {

  abstract init(): void | Promise<void>;
  abstract update(now: number): void;
  abstract dispose(): void;
  
}
