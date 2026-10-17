// Run with: node test.js  (simulates the game logic headlessly)
const assert = require('assert');
const L = require('./js/logic.js');

for (let f = 1; f <= 12; f++) {
  for (let i = 0; i < 50; i++) {
    const lv = L.generateLevel(f);
    assert(lv.stairs, 'stairs placement');
    assert.strictEqual(lv.enemies.some((e) => e.type === 'boss'), L.isBossFloor(f), 'boss every 5th floor');
    lv.enemies.forEach((e) => assert(e.level >= 1 && e.level <= f + 1, 'monster level cap'));
    assert(lv.enemies.length > 0);
  }
}

// Random-walk bot: should never throw and keep state sane.
for (let g = 0; g < 200; g++) {
  const p = L.newPlayer(["fighter","archer","wizard"][g % 3]);
  let floor = 1, lv = L.generateLevel(floor);
  for (let t = 0; t < 500 && p.hp > 0; t++) {
    const d = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,-1],[1,-1],[-1,1]][Math.floor(Math.random() * 8)];
    const r = t % 7 === 0 ? (p.cls === 'fighter' ? L.warCry(p, lv) : L.castSpell(p, lv)) : L.playerMove(p, lv, d[0], d[1]);
    if (p.inv.length) L.useItem(p, 0);
    if (r.newFloor) { lv = L.generateLevel(++floor); p.x = 1; p.y = 1; continue; }
    L.enemyTurn(p, lv); L.regen(p);
    assert(lv.map[p.y][p.x] === 0 && p.hp <= p.maxHp && p.mp <= p.maxMp);
  }
}
for (const c of Object.keys(L.CLASSES)) {
  const q = L.newPlayer(c);
  L.addItem(q, L.CLASSES[c].weapon);
  L.useItem(q, 0);
  assert.strictEqual(q.weapon, 1, c + ' matching weapon bonus');
  if (c === 'wizard') assert.strictEqual(q.spellBonus, 1, 'wand spell bonus');
}
{
  const wizard = L.newPlayer('wizard');
  L.addItem(wizard, 'sword');
  assert.strictEqual(L.useItem(wizard, 0).used, false);
  assert.strictEqual(wizard.weapon, 0, 'nonmatching weapon has no attack bonus');
  const fighter = L.newPlayer('fighter');
  L.addItem(fighter, 'wand');
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
L.gainXp(p, L.xpNeeded(p));
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
  L.addItem(p, 'potion'); L.addItem(p, 'potion'); L.addItem(p, 'wand');
  L.playerMove(p, lv, 1, 0);
  assert.strictEqual(p.gold, 2, 'enemy kill awards gold');
  assert.strictEqual(L.cashOutInventory(p), 20, 'remaining inventory converts to gold');
  assert.strictEqual(p.gold, 22, 'cash-out adds to player gold');
  assert.strictEqual(p.inv.length, 0, 'cash-out removes sold inventory');
}
{
  const p = L.newPlayer('fighter');
  L.addItem(p, 'potion'); L.addItem(p, 'potion');
  assert.strictEqual(p.inv.length, 1); assert.strictEqual(p.inv[0].count, 2, 'items stack');
  L.dropItem(p, 0); assert.strictEqual(p.inv[0].count, 1);
  L.dropItem(p, 0); assert.strictEqual(p.inv.length, 0);
  assert.strictEqual(L.castSpell(p, { enemies: [] }).acted, false, 'only wizards cast');
}
{
  const open = () => ({ map: Array.from({ length: 11 }, (_, y) => Array.from({ length: 15 }, (_, x) => (x === 0 || y === 0 || x === 14 || y === 10 ? 1 : 0))), enemies: [], items: [], floor: 1, stairs: null });
  const a = L.newPlayer('archer'); a.baseAtk = 10; a.x = 1; a.y = 1;
  const lv = open();
  [3, 5].forEach((x) => lv.enemies.push({ type: 'rat', name: 'Rat', x, y: 1, hp: 100, maxHp: 100, atk: 1, xp: 1 }));
  const mp = a.mp;
  const r = L.playerShoot(a, lv, 1, 0, true);
  assert(lv.enemies.every((e) => e.hp < 100) && r.hits.length === 2, 'piercing shot hits all in line');
  assert.strictEqual(a.mp, mp - 4, 'piercing shot costs mana');
  const f = L.newPlayer('fighter'); f.x = 1; f.y = 1;
  lv.enemies.push({ type: 'rat', name: 'Rat', x: 2, y: 1, hp: 100, maxHp: 100, atk: 5, xp: 1 });
  L.warCry(f, lv);
  const hp = f.hp;
  for (let i = 0; i < 4; i++) L.enemyTurn(f, lv);
  assert.strictEqual(f.hp, hp, 'frozen enemies do nothing for 4 turns');
  L.enemyTurn(f, lv);
  assert(f.hp < hp, 'enemies thaw after 4 turns');
}
console.log('all tests passed');
