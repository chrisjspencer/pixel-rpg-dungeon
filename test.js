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
{
  const lv = L.generateLevel(1), q = L.newPlayer('fighter');
  q.x = 1; q.y = 1;
  lv.map[2][2] = 0;
  lv.enemies = [{ type: 'rat', name: 'Rat', x: 2, y: 2, hp: 5, maxHp: 5, atk: 2, xp: 4 }];
  const msgs = L.enemyTurn(q, lv);
  assert(msgs.some((msg) => msg.startsWith('Rat hits you for ')) && q.hp < q.maxHp, 'diagonal enemy attack');
}
const p = L.newPlayer();
L.gainXp(p, 10);
assert.strictEqual(p.level, 2);
console.log('all tests passed');

// Archer: shots deal half damage when adjacent, full at range; ranged enemies shoot.
{
  const open = () => ({ map: Array.from({ length: 11 }, (_, y) => Array.from({ length: 15 }, (_, x) => (x === 0 || y === 0 || x === 14 || y === 10 ? 1 : 0))), enemies: [], items: [], floor: 1, stairs: null });
  const p = L.newPlayer('archer'); p.baseAtk = 10; p.x = 1; p.y = 1;
  let lv = open(); lv.enemies.push({ type: 'rat', name: 'Rat', x: 2, y: 1, hp: 100, maxHp: 100, atk: 1, xp: 1 });
  L.playerShoot(p, lv, 1, 0);
  assert(lv.enemies[0].hp >= 100 - 6 && lv.enemies[0].hp <= 100 - 4, 'adjacent shot halved');
  lv = open(); lv.enemies.push({ type: 'rat', name: 'Rat', x: 4, y: 1, hp: 100, maxHp: 100, atk: 1, xp: 1 });
  L.playerShoot(p, lv, 1, 0);
  assert(lv.enemies[0].hp <= 100 - 9, 'distant shot full');
  const w = L.newPlayer('fighter'); w.x = 1; w.y = 1;
  lv = open(); lv.enemies.push({ type: 'goblin', name: 'Goblin Archer', x: 4, y: 1, hp: 7, maxHp: 7, atk: 4, xp: 1 });
  const hp = w.hp; L.enemyTurn(w, lv);
  assert(w.hp < hp && lv.enemies[0].x === 4, 'goblin shoots at range');
}
