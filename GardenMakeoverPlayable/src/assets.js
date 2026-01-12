export const MODEL_PATHS = {
  ground: "assets/gltf/ground2.glb",
  objects: "assets/gltf/objects2.glb"
};

export const CATEGORIES = [
  { id: "plants", label: "Plants", emoji: "🌿" },
  { id: "decor", label: "Decor", emoji: "✨" },
  { id: "furniture", label: "Furniture", emoji: "🪑" },
  { id: "animals", label: "Animals", emoji: "🐾" }
];

export const ITEMS = {
  plants: [
    { id: "tomato", label: "Tomato", icon: "assets/images/tomato.png", model: "assets/gltf/objects/plants/tomato.glb", scale: 0.9, cost: 120, currency: "coin" },
    { id: "corn", label: "Corn", icon: "assets/images/corn.png", model: "assets/gltf/objects/plants/corn.glb", scale: 0.8, cost: 100, currency: "coin" },
    { id: "grape", label: "Grape", icon: "assets/images/grape.png", model: "assets/gltf/objects/plants/grape.glb", scale: 0.85, cost: 140, currency: "coin" },
    { id: "strawberry", label: "Strawberry", icon: "assets/images/strawberry.png", model: "assets/gltf/objects/plants/strawberry.glb", scale: 0.8, cost: 160, currency: "coin" }
    
  ],
  decor: [
    { id: "fence", label: "Fence", icon: "assets/images/plus-button.png", model: "assets/gltf/objects/Fence.glb", scale: 2.0, cost: 350, currency: "coin" }
  ],
  furniture: [
    { id: "lantern", label: "Lantern", icon: "assets/images/plus.png", procedural: "lantern", scale: 1.0, cost: 2, currency: "diamond" },
    { id: "table", label: "Side Table", icon: "assets/images/plus (1).png", procedural: "table", scale: 1.0, cost: 240, currency: "coin" }
  ],
  animals: [
    { id: "sheep", label: "Sheep", icon: "assets/images/sheep.png", model: "assets/gltf/objects/animals/sheep.glb", scale: 0.3, cost: 180, currency: "coin" },
    { id: "cow", label: "Cow", icon: "assets/images/cow.png", model: "assets/gltf/objects/animals/cow.glb", scale: 0.6, cost: 10, currency: "diamond" },
    { id: "chicken", label: "Chicken", icon: "assets/images/plus.png", model: "assets/gltf/objects/animals/chicken.glb", scale: 0.3, cost: 140, currency: "coin" }
  ]
};

export const SOUNDS = {
  click: "assets/sounds/click_003.mp3",
  place: "assets/sounds/popup_chest.mp3",
  theme: "assets/sounds/theme.mp3"
};

export const TEXTURES = {
  smoke: "assets/images/smoke_alpha.png",
  money: "assets/images/money.png"
};

