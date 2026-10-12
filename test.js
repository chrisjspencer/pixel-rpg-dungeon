// Run with: node test.js  (simulates the game logic headlessly)
const assert = require('assert');
const L = require('./js/logic.js');

for (let f = 1; f <= L.MAX_FLOOR; f++) {
  for (let i = 0; i < 50; i++) {
    const lv = L.generateLevel(f);
    assert(f === L.MAX_FLOOR ? !lv.stairs : lv.stairs, 'stairs placement');
    assert(lv.enemies.length > 0);
  }
}

// Random-walk bot: should never throw and keep state sane.
for (let g = 0; g < 200; g++) {
  const p = L.newPlayer(["fighter","archer","wizard"][g % 3]);
  let floor = 1, lv = L.generateLevel(floor);
  for (let t = 0; t < 500 && p.hp > 0; t++) {
    const d = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,-1],[1,-1],[-1,1]][Math.floor(Math.random() * 8)];
    const r = t % 7 === 0 ? L.castSpell(p, lv) : L.playerMove(p, lv, d[0], d[1]);
    if (r.won) break;
    if (p.inv.length) L.useItem(p, 0);
    if (r.newFloor) { lv = L.generateLevel(++floor); p.x = 1; p.y = 1; continue; }
    L.enemyTurn(p, lv); L.regen(p);
    assert(lv.map[p.y][p.x] === 0 && p.hp <= p.maxHp && p.mp <= p.maxMp);
  }
}
for (const c of Object.keys(L.CLASSES)) {
  const q = L.newPlayer(c);
  q.inv.push(L.CLASSES[c].weapon, 'sword');
  L.useItem(q, 0);
  assert(q.weapon >= 4, c + ' mastery');
}
{
  const lv = L.generateLevel(1), q = L.newPlayer('archer');
  lv.map[2][2] = 0; lv.enemies = []; lv.items = [];
  assert(L.playerMove(q, lv, 1, 1).acted && q.x === 2 && q.y === 2, 'diagonal move');
}
const p = L.newPlayer();
L.gainXp(p, 10);
assert.strictEqual(p.level, 2);
console.log('all tests passed');
