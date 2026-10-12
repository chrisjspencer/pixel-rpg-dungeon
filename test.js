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
  q.inv.push(L.CLASSES[c].weapon);
  L.useItem(q, 0);
  assert.strictEqual(q.weapon, 1, c + ' matching weapon bonus');
  if (c === 'wizard') assert.strictEqual(q.spellBonus, 1, 'wand spell bonus');
}
{
  const wizard = L.newPlayer('wizard');
  wizard.inv.push('sword');
  L.useItem(wizard, 0);
  assert.strictEqual(wizard.weapon, 0, 'nonmatching weapon has no attack bonus');
  const fighter = L.newPlayer('fighter');
  fighter.inv.push('wand');
  L.useItem(fighter, 0);
  assert.strictEqual(fighter.weapon, 0, 'nonmatching wand has no attack bonus');
  assert.strictEqual(fighter.spellBonus, 0, 'nonmatching wand adds no spell damage');
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

// Archer: shots deal half damage when adjacent, full at range; ranged enemies shoot.
{
  const open = () => ({ map: Array.from({ length: 11 }, (_, y) => Array.from({ length: 15 }, (_, x) => (x === 0 || y === 0 || x === 14 || y === 10 ? 1 : 0))), enemies: [], items: [], floor: 1, stairs: null });
  const p = L.newPlayer('archer'); p.baseAtk = 10; p.x = 1; p.y = 1;
  let lv = open(); lv.enemies.push({ type: 'rat', name: 'Rat', x: 2, y: 1, hp: 100, maxHp: 100, atk: 1, xp: 1 });
  L.playerShoot(p, lv, 1, 0);
  assert(lv.enemies[0].hp >= 100 - 6 && lv.enemies[0].hp <= 100 - 4, 'adjacent shot halved');
  lv = open(); lv.enemies.push({ type: 'rat', name: 'Rat', x: 4, y: 1, hp: 100, maxHp: 100, atk: 1, xp: 1 });
  const shot = L.playerShoot(p, lv, 1, 0);
  assert.deepStrictEqual(shot.shotPath, [[2, 1], [3, 1], [4, 1]], 'shot path ends at the first enemy');
  assert(lv.enemies[0].hp <= 100 - 9, 'distant shot full');
  lv = open(); lv.map[3][1] = 1;
  const blocked = L.playerShoot(p, lv, 0, 1);
  assert.deepStrictEqual(blocked.shotPath, [[1, 2]], 'shot path stops before a wall');
  const w = L.newPlayer('fighter'); w.x = 1; w.y = 1;
  lv = open(); lv.enemies.push({ type: 'goblin', name: 'Goblin Archer', x: 4, y: 1, hp: 7, maxHp: 7, atk: 4, xp: 1 });
  const hp = w.hp; L.enemyTurn(w, lv);
  assert(w.hp < hp && lv.enemies[0].x === 4, 'goblin shoots at range');
}
{
  const open = () => ({ map: Array.from({ length: 11 }, (_, y) => Array.from({ length: 15 }, (_, x) => (x === 0 || y === 0 || x === 14 || y === 10 ? 1 : 0))), enemies: [], items: [], floor: 1, stairs: null });
  const p = L.newPlayer('wizard'); p.baseAtk = 20; p.x = 1; p.y = 1;
  const lv = open();
  lv.enemies.push({ type: 'rat', name: 'Rat', x: 3, y: 1, hp: 100, maxHp: 100, atk: 1, xp: 1 });
  const mp = p.mp, hp = lv.enemies[0].hp;
  L.playerShoot(p, lv, 1, 0);
  assert.strictEqual(p.mp, mp - 1, 'wizard ranged attack costs one mana');
  assert(lv.enemies[0].hp <= hp - 18 && lv.enemies[0].hp >= hp - 20, 'wizard ranged damage fades with distance');
}
{
  const open = () => ({ map: Array.from({ length: 11 }, (_, y) => Array.from({ length: 15 }, (_, x) => (x === 0 || y === 0 || x === 14 || y === 10 ? 1 : 0))), enemies: [], items: [], floor: 1, stairs: null });
  const p = L.newPlayer('wizard'), lv = open();
  p.baseAtk = 10;
  lv.enemies.push({ type: 'rat', name: 'Rat', x: 2, y: 1, hp: 100, maxHp: 100, atk: 1, xp: 1 });
  const hp = lv.enemies[0].hp, mp = p.mp;
  L.playerMove(p, lv, 1, 0);
  assert(lv.enemies[0].hp <= hp - 9, 'wizard close attack deals full power');
  assert.strictEqual(p.mp, mp - 1, 'wizard close attack costs one mana');
  p.mp = 0;
  const noMana = L.playerShoot(p, lv, 1, 0);
  assert.strictEqual(noMana.acted, false, 'wizard cannot attack without mana');
  p.mp = 2;
  const blockedMp = p.mp;
  L.playerShoot(p, lv, -1, 0);
  assert.strictEqual(p.mp, blockedMp, 'blocked shot does not cost mana');
}
{
  const p = L.newPlayer('wizard');
  const lv = { enemies: [{ type: 'rat', name: 'Rat', x: 2, y: 1, hp: 100, maxHp: 100, atk: 1, xp: 1 }], floor: 1 };
  L.castSpell(p, lv);
  assert.strictEqual(lv.enemies[0].hp, 88, 'wizard spells deal double damage');
}
{
  const map = Array.from({ length: 11 }, (_, y) => Array.from({ length: 15 }, (_, x) => (x === 0 || y === 0 || x === 14 || y === 10 ? 1 : 0)));
  const p = L.newPlayer('fighter'), lv = { map, enemies: [{ type: 'rat', name: 'Rat', x: 2, y: 1, hp: 1, xp: 4, gold: 2 }], floor: 1 };
  p.inv.push('potion', 'wand');
  L.playerMove(p, lv, 1, 0);
  assert.strictEqual(p.gold, 2, 'enemy kill awards gold');
  assert.strictEqual(L.cashOutInventory(p), 15, 'remaining inventory converts to gold');
  assert.strictEqual(p.gold, 17, 'cash-out adds to player gold');
  assert.strictEqual(p.inv.length, 0, 'cash-out removes sold inventory');
}
console.log('all tests passed');
