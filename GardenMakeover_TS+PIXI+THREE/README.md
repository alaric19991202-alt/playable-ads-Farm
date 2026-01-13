# GardenMakeoverPlayable Project Overview

## Technical Stack
- TypeScript for application logic and stronger refactor safety.
- Vite for fast dev server, ESM-first bundling, and small build config.
- Three.js for the 3D scene (GLTF loading, lighting, shadows).
- Pixi.js for the UI layer (GPU-accelerated 2D overlays).
- HTML/CSS for the base page shell and fonts.
- Web Audio via HTMLAudioElement for lightweight SFX and music.

## Why These Choices
- TypeScript keeps the codebase maintainable as features expand and reduces runtime mistakes.
- Vite provides quick iteration speed, minimal config overhead, and modern output.
- Three.js is a proven WebGL engine with mature GLTF support and good tooling.
- Pixi.js excels at fast 2D rendering and effects, which fits a UI-heavy playable.
- HTMLAudioElement avoids extra audio dependencies and keeps the build lean.

## Architecture Diagram (Text-Based)

main.ts
  -> app/bootstrap.ts
     -> GameApp (render loop)
        -> SceneManager
           -> GardenScene
              -> Systems
                 - PlacementSystem
                 - TemplateLibrary
                 - AnimationSystem
                 - AudioSystem
                 - VFXSystem
                 - Lighting
                 - EnvironmentLoader
              -> Renderers
                 - Renderer3D (Three.js)
                 - RendererUI (Pixi.js)
              -> EventBus <-> UIManager
                 -> UI Components
                    - TopBar
                    - TaskPanel
                    - ItemCarousel
                    - HintToast
                    - TutorialOverlay
                    - ResultModal
                    - LoadingScreen
              -> StateManager

## Project Details
- GardenMakeoverPlayable is a small interactive garden makeover experience.
- The 3D garden loads from GLTF and is normalized to the scene with lighting and fog.
- Items are defined in src/assets.ts and grouped by categories.
- The TemplateLibrary loads models or builds procedural items, then clones them for placement.
- PlacementSystem handles:
  - Slot-based placement with raycasting and compatibility rules.
  - Undo history for item placement and deletion.
  - Blueprint previews before placement.
- UI is rendered via Pixi.js on a separate canvas and communicates through EventBus:
  - TopBar shows the brand, challenge, currency, and day/night toggle.
  - TaskPanel lists required and bonus tasks with a responsive toggle and scroll.
  - ItemCarousel lists categories and items with responsive layout and selection.
  - TutorialOverlay guides the user and blurs the background.
  - ResultModal shows end-of-session rewards with blur and day/night styling.
  - HintToast surfaces short messages and tips.
- Day/night mode updates scene lighting and UI theme colors.
- Performance scaling is handled by quality settings:
  - Pixel ratio, shadow map size, and frame interval adapt to device constraints.

## Key Folders
- src/scenes: game scenes (GardenScene).
- src/systems: rendering helpers, loading, animation, audio, VFX.
- src/ui: Pixi UI manager and components.
- src/renderers: Three.js and Pixi.js renderer wrappers.
- src/assets.ts: item, category, sound, and texture references.
