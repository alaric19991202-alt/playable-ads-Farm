import type { ItemDef } from "../types";

export type GameState = {
  coins: number;
  diamonds: number;
  energy: number;
  energyMax: number;
  locked: boolean;
};

export class StateManager {
  public gameState: GameState = {
    coins: 1550,
    diamonds: 15,
    energy: 5,
    energyMax: 5,
    locked: true
  };

  canAfford(itemDef: ItemDef | null): boolean {
    if (!itemDef) return false;
    const cost = itemDef.cost ?? 0;
    if (itemDef.currency === "diamond") return this.gameState.diamonds >= cost;
    return this.gameState.coins >= cost;
  }

  spend(itemDef: ItemDef): void {
    const cost = itemDef.cost ?? 0;
    if (itemDef.currency === "diamond") this.gameState.diamonds -= cost;
    else this.gameState.coins -= cost;
  }

  refund(itemDef: ItemDef): void {
    const cost = itemDef.cost ?? 0;
    if (itemDef.currency === "diamond") this.gameState.diamonds += cost;
    else this.gameState.coins += cost;
  }
}
