# GardenMakeover - Garden Joy-style Mini Designer (HTML5 Playable)

## How to run
Because this project uses ES Modules, you need a local web server (opening `index.html` via `file://` may not load assets).

### Option A: Python
```bash
cd GardenMakeoverPlayable
python -m http.server 8080
```
Open: http://localhost:8080

### Option B: Node
```bash
npx http-server -p 8080
```

## Gameplay (mimics Garden Joy's challenge flow)
- **Required/Bonus goals** are shown on the left (teal/pink).
- **Bottom tabs + carousel**: choose a category, then pick an item.
- **Glowing placement spots**: tap a spot to place (required spots show the specific required item icon).
- Items spawn with a pop + smoke puff.
- **Finish** unlocks once all required items are placed.
- Finish triggers a quick **Submitting → Voting → Results** flow with stars + rewards.
- **Day/Night toggle** changes lighting.
- "Download" uses `clickTag` / `mraid.open` when available (see `src/main.js`).

## Assets
Uses the provided assets under `/assets` (GLB models, icons, sounds).
