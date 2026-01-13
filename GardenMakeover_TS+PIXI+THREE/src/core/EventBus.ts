import type { ItemDef } from "../types";

export type EventMap = {
  "ui:selectCategory": (categoryId: string) => void;
  "ui:selectItem": (categoryId: string, itemDef:ItemDef) => void;
  "ui:undo": () => void;
  "ui:finish": () => void;
  "ui:togglePanel": (open: boolean) => void;
  "ui:toggleLeftPanel": (open: boolean) => void;
  "ui:toggleDayNight": () =>void;
  "ui:cta": () => void;
  "ui:dismissTutorial": () => void;
};

type Listener<K extends keyof EventMap> = EventMap[K];

export class EventBus {

  private listeners = new Map<keyof EventMap, Set<unknown>>();

  private getListeners<K extends keyof EventMap>(event: K) {
    const existing = this.listeners.get(event) as Set<Listener<K>> | undefined;
    if (existing) return existing;
    const created = new Set<Listener<K>>();
    this.listeners.set(event, created as Set<unknown>);
    return created;
  }

  on<K extends keyof EventMap>(event: K, fn: Listener<K>) {
    this.getListeners(event).add(fn);
  }

  off<K extends keyof EventMap>(event: K, fn: Listener<K>) {
    const set = this.listeners.get(event) as Set<Listener<K>> | undefined;
    set?.delete(fn);
  }

  emit<K extends keyof EventMap>(event: K, ...args: Parameters<Listener<K>>) {
    const set = this.listeners.get(event) as Set<Listener<K>> | undefined;
    if (!set) return;
    const params = args as unknown[];
    set.forEach((fn) => (fn as (...rest: unknown[]) => void)(...params));
  }
}
