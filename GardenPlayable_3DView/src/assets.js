export const MODEL_PATHS = {
  ground: "assets/gltf/ground2.glb",
  objects: "assets/gltf/objects2.glb"
};

export const CATEGORIES = [
  { id: "plants", label: "Plants" },
  { id: "animals", label: "Animals" },
  { id: "decor", label: "Decor" }
];

export const ITEMS = {
  plants: [
    { id: "corn", label: "Corn", icon: "assets/images/corn.png", model: "assets/gltf/objects/plants/corn.glb", scale: 0.8 },
    { id: "tomato", label: "Tomato", icon: "assets/images/tomato.png", model: "assets/gltf/objects/plants/tomato.glb", scale: 0.9 },
    { id: "grape", label: "Grape", icon: "assets/images/grape.png", model: "assets/gltf/objects/plants/grape.glb", scale: 0.85 },
    { id: "strawberry", label: "Strawberry", icon: "assets/images/strawberry.png", model: "assets/gltf/objects/plants/strawberry.glb", scale: 0.8 }
  ],
  animals: [
    { id: "cow", label: "Cow", icon: "assets/images/cow.png", model: "assets/gltf/objects/animals/cow.glb", scale: 0.9, animated: true },
    { id: "sheep", label: "Sheep", icon: "assets/images/sheep.png", model: "assets/gltf/objects/animals/sheep.glb", scale: 0.85, animated: true },
    { id: "chicken", label: "Chicken", icon: "assets/images/plus (2).png", model: "assets/gltf/objects/animals/chicken.glb", scale: 0.3, animated: true }
  ],
  decor: [
    { id: "milk_can", label: "Fence", icon: "assets/images/plus-button.png", model: "assets/gltf/objects/Fence.glb", scale: 2 }
  ]
};

export const SOUNDS = {
  click: "assets/sounds/click_003.mp3",
  place: "assets/sounds/popup_chest.mp3",
  theme: "assets/sounds/theme.mp3",
  cow: "assets/sounds/cow.mp3",
  sheep: "assets/sounds/sheep.mp3",
  chicken: "assets/sounds/chicken.mp3"
};

export const TEXTURES = {
  smoke: "assets/images/smoke_alpha.png"
};
