# Pixel Dungeon RPG

A small turn-based pixel dungeon crawler built with **Phaser 3** and vanilla JavaScript. It runs in any modern browser and is designed for phones (touch controls, responsive layout).

[Play the game](https://chrisjspencer.github.io/pixel-rpg-dungeon/)

## How to play
Descend through 5 floors and defeat the **Dungeon Lord** on floor 5.

- **Move / attack:** D-pad buttons, swipe on the map, or arrow keys / WASD. Walk into an enemy to attack.
- **Audio:** synthesized dungeon music and sound effects begin after you choose a hero.
- **Wait:** the centre button (or Space). Every action is a turn; enemies move after you.
- **Spell (🔥):** costs 4 MP, burns all enemies within 3 tiles (key `F`).
- **Bag (🎒):** tap an item to use or equip it (key `I`). Potions heal HP/MP, swords add ATK, armor adds DEF. Walk over items to pick them up (max 8).
- **Stairs:** the white stair tile takes you to the next floor (+5 HP).
- **Level up:** defeating enemies grants XP, which raises max HP/MP and ATK and fully heals you.

Enemies: rats, erratic bats, skeletons and the boss. They chase you when you come near.

## Run locally
Phaser is bundled in `lib/`, so no install is needed. Serve the folder with any static server:

```
python3 -m http.server 8000
```
Then open `http://localhost:8000` (on your phone, use your computer's LAN IP).

## Deploy
It is a static site: enable **GitHub Pages** (Settings → Pages → deploy from branch, root folder), or upload the folder to Netlify/Vercel/any static host.

## Project layout
- `index.html`, `css/style.css` – page, HUD, touch controls
- `js/art.js` – pixel sprites (generated in code, no image files)
- `js/logic.js` – level generation, combat, AI, items (no Phaser dependency)
- `js/main.js` – Phaser scene, input, UI wiring
- `test.js` – headless logic tests: `node test.js`

Phaser is MIT licensed (`lib/PHASER_LICENSE.md`).
