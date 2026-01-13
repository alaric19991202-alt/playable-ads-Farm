import type * as THREE from "three";

export type CurrencyType = "coin" | "diamond";

export type CategoryDef = {
  id: string;
  label: string;
  emoji?: string;
};

export type ItemDef = {
  id: string;
  label: string;
  icon?: string;
  model?: string;
  procedural?: string;
  scale?: number;
  cost?: number;
  currency?: CurrencyType;
  categoryId?: string;
};

export type ItemsByCategory = Record<string, ItemDef[]>;

export type SlotDef = {
  id: string;
  position: THREE.Vector3;
  rotationY?: number;
  radius?: number;
  required?: boolean;
  allowedItemIds?: string[];
  allowedCategories?: string[];
  marker?: THREE.Object3D;
  pickMesh?: THREE.Object3D;
  previewLift?: number;
  occupiedBy?: THREE.Object3D | null;
};

export type TaskDef = {
  label: string;
  done: boolean;
};
