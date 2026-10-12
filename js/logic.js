// Pure game logic (no Phaser dependencies) so it is easy to reason about and test.
const MAP_W = 15, MAP_H = 11, MAX_FLOOR = 5, INV_MAX = 8, SPELL_COST = 4;

const ENEMY_TYPES = {
  rat:      { name: 'Rat',      hp: 5,  atk: 2, xp: 4,  sprite: 'rat' },
  bat:      { name: 'Bat',      hp: 4,  atk: 3, xp: 5,  sprite: 'bat', erratic: true },
  skeleton: { name: 'Skeleton', hp: 10, atk: 4, xp: 9,  sprite: 'skeleton' },
  boss:     { name: 'Dungeon Lord', hp: 45, atk: 8, xp: 100, sprite: 'boss' }
};

const CLASSES = {
  fighter: { name: 'Fighter', desc: 'Tough, great with swords', sprite: 'fighter', hp: 26, mp: 4, atk: 4, weapon: 'sword' },
  archer:  { name: 'Archer',  desc: 'Nimble, great with bows',   sprite: 'archer',  hp: 20, mp: 6, atk: 3, weapon: 'bow' },
  wizard:  { name: 'Wizard',  desc: 'Frail, great with wands',   sprite: 'wizard',  hp: 16, mp: 12, atk: 2, weapon: 'wand' }
};
const WEAPON_MATCH = 4, WEAPON_OFF = 1;

const ITEM_TYPES = {
  potion: { name: 'Health Potion', sprite: 'potion', desc: 'Restore 15 HP' },
  mana:   { name: 'Mana Potion',   sprite: 'mana',   desc: 'Restore 10 MP' },
  sword:  { name: 'Sword',         sprite: 'sword',  desc: '+4 ATK for Fighter, +1 others (equip)' },
  bow:    { name: 'Bow',           sprite: 'bow',    desc: '+4 ATK for Archer, +1 others (equip)' },
  wand:   { name: 'Wand',          sprite: 'wand',   desc: '+4 ATK & spell for Wizard, +1 others (equip)' },
  armor:  { name: 'Armor',         sprite: 'armor',  desc: '+1 DEF (equip)' }
};

const rnd = (n) => Math.floor(Math.random() * n);

function newPlayer(cls) {
  const c = CLASSES[cls] || CLASSES.fighter;
  return { cls: CLASSES[cls] ? cls : 'fighter', sprite: c.sprite, x: 1, y: 1, hp: c.hp, maxHp: c.hp, mp: c.mp, maxMp: c.mp, level: 1, xp: 0, baseAtk: c.atk, weapon: 0, spellBonus: 0, armor: 0, inv: [], turn: 0 };
}
const playerAtk = (p) => p.baseAtk + p.weapon;
const playerDef = (p) => p.armor;
const xpNeeded = (p) => p.level * 10;

// Returns the list of walkable cells reachable from (sx, sy) with their distance.
function floodFill(map, sx, sy) {
  const dist = {};
  const q = [[sx, sy]];
  dist[sx + ',' + sy] = 0;
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
      if (map[ny] && map[ny][nx] === 0 && dist[k] === undefined) { dist[k] = dist[x + ',' + y] + 1; q.push([nx, ny]); }
    }
  }
  return dist;
}

// 0 = floor, 1 = wall. Regenerates until the level is well connected.
function generateLevel(floor) {
  for (;;) {
    const map = [];
    for (let y = 0; y < MAP_H; y++) {
      map.push([]);
      for (let x = 0; x < MAP_W; x++) {
        const edge = x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1;
        map[y].push(edge || (Math.random() < 0.15 && !(x <= 2 && y <= 2)) ? 1 : 0);
      }
    }
    const dist = floodFill(map, 1, 1);
    const cells = Object.keys(dist).map((k) => k.split(',').map(Number)).filter(([x, y]) => dist[x + ',' + y] >= 4);
    const open = map.flat().filter((c) => c === 0).length;
    if (Object.keys(dist).length < open || cells.length < 8) continue;

    const used = new Set(['1,1']);
    const pick = (minDist) => {
      const choices = cells.filter(([x, y]) => !used.has(x + ',' + y) && dist[x + ',' + y] >= minDist);
      if (!choices.length) return null;
      const [x, y] = choices[rnd(choices.length)];
      used.add(x + ',' + y);
      return { x, y };
    };

    const isBoss = floor === MAX_FLOOR;
    const far = cells.reduce((a, b) => (dist[b[0] + ',' + b[1]] > dist[a[0] + ',' + a[1]] ? b : a));
    used.add(far[0] + ',' + far[1]);
    const stairs = isBoss ? null : { x: far[0], y: far[1] };

    const enemies = [];
    if (isBoss) {
      enemies.push(makeEnemy('boss', far[0], far[1], floor));
    }
    const count = 2 + floor + rnd(2);
    const pool = floor === 1 ? ['rat', 'rat', 'bat'] : floor < 4 ? ['rat', 'bat', 'skeleton'] : ['bat', 'skeleton', 'skeleton'];
    for (let i = 0; i < count; i++) {
      const pos = pick(5);
      if (pos) enemies.push(makeEnemy(pool[rnd(pool.length)], pos.x, pos.y, floor));
    }

    const items = [];
    const itemPool = ['potion', 'potion', 'mana', 'sword', 'bow', 'wand', 'armor'];
    const ic = 2 + rnd(2);
    for (let i = 0; i < ic; i++) {
      const pos = pick(2);
      if (pos) items.push({ type: itemPool[rnd(itemPool.length)], x: pos.x, y: pos.y });
    }
    return { map, stairs, enemies, items, floor };
  }
}

function makeEnemy(type, x, y, floor) {
  const t = ENEMY_TYPES[type];
  const scale = type === 'boss' ? 0 : floor - 1;
  return { type, name: t.name, x, y, hp: t.hp + scale * 2, maxHp: t.hp + scale * 2, atk: t.atk + Math.floor(scale / 2), xp: t.xp + scale, sprite: t.sprite };
}

const inBounds = (lv, x, y) => lv.map[y] !== undefined && lv.map[y][x] === 0;
const enemyAt = (lv, x, y) => lv.enemies.find((e) => e.x === x && e.y === y);

// Awards XP and handles level ups. Returns log messages.
function gainXp(p, amount) {
  const msgs = [];
  p.xp += amount;
  while (p.xp >= xpNeeded(p)) {
    p.xp -= xpNeeded(p);
    p.level++;
    p.maxHp += 5; p.maxMp += 2; p.baseAtk += 1;
    p.hp = p.maxHp; p.mp = p.maxMp;
    msgs.push('Level up! You are now level ' + p.level + '.');
  }
  return msgs;
}

function damageEnemy(p, lv, e, dmg, msgs) {
  e.hp -= dmg;
  if (e.hp > 0) return false;
  lv.enemies.splice(lv.enemies.indexOf(e), 1);
  msgs.push(e.name + ' defeated! +' + e.xp + ' XP');
  msgs.push(...gainXp(p, e.xp));
  return true;
}

// Player attempts to move/attack. Returns { acted, msgs, newFloor, won }.
function playerMove(p, lv, dx, dy) {
  const msgs = [];
  const nx = p.x + dx, ny = p.y + dy;
  if (dx === 0 && dy === 0) return { acted: true, msgs: ['You wait.'] };
  if (!inBounds(lv, nx, ny)) return { acted: false, msgs };
  const e = enemyAt(lv, nx, ny);
  if (e) {
    const dmg = Math.max(1, playerAtk(p) + rnd(3) - 1);
    msgs.push('You hit ' + e.name + ' for ' + dmg + '.');
    damageEnemy(p, lv, e, dmg, msgs);
    return { acted: true, msgs, hitX: nx, hitY: ny, won: lv.floor === MAX_FLOOR && !lv.enemies.some((x) => x.type === 'boss') };
  }
  p.x = nx; p.y = ny;
  const idx = lv.items.findIndex((i) => i.x === nx && i.y === ny);
  if (idx >= 0) {
    if (p.inv.length < INV_MAX) {
      const it = lv.items.splice(idx, 1)[0];
      p.inv.push(it.type);
      msgs.push('Picked up ' + ITEM_TYPES[it.type].name + '.');
    } else msgs.push('Inventory full!');
  }
  if (lv.stairs && lv.stairs.x === nx && lv.stairs.y === ny) return { acted: true, msgs, newFloor: true };
  return { acted: true, msgs };
}

// Fire spell: hits every enemy within 3 tiles.
function castSpell(p, lv) {
  const msgs = [];
  if (p.mp < SPELL_COST) return { acted: false, msgs: ['Not enough mana.'] };
  p.mp -= SPELL_COST;
  const dmg = 4 + p.level * 2 + (p.spellBonus || 0);
  const targets = lv.enemies.filter((e) => Math.abs(e.x - p.x) + Math.abs(e.y - p.y) <= 3);
  if (!targets.length) msgs.push('The flames fizzle out.');
  targets.forEach((e) => { msgs.push('Fire burns ' + e.name + ' for ' + dmg + '.'); damageEnemy(p, lv, e, dmg, msgs); });
  return { acted: true, msgs, targets: targets.map((e) => [e.x, e.y]), won: lv.floor === MAX_FLOOR && !lv.enemies.some((x) => x.type === 'boss') };
}

function useItem(p, index) {
  const type = p.inv[index];
  if (!type) return { used: false, msg: '' };
  let msg = '';
  if (type === 'potion') { const h = Math.min(15, p.maxHp - p.hp); p.hp += h; msg = 'Healed ' + h + ' HP.'; }
  else if (type === 'mana') { const m = Math.min(10, p.maxMp - p.mp); p.mp += m; msg = 'Restored ' + m + ' MP.'; }
  else if (type === 'sword' || type === 'bow' || type === 'wand') {
    const b = CLASSES[p.cls] && CLASSES[p.cls].weapon === type ? WEAPON_MATCH : WEAPON_OFF;
    p.weapon += b;
    if (type === 'wand') p.spellBonus += b;
    msg = 'Equipped ' + ITEM_TYPES[type].name.toLowerCase() + '. ATK +' + b + (b === WEAPON_MATCH ? ' (mastery!)' : '') + (type === 'wand' ? ', spell +' + b : '') + '.';
  }
  else if (type === 'armor') { p.armor += 1; msg = 'Equipped armor. DEF +1.'; }
  p.inv.splice(index, 1);
  return { used: true, msg };
}

// Enemy turn: chase when close, otherwise wander. Returns messages.
function enemyTurn(p, lv) {
  const msgs = [];
  for (const e of lv.enemies) {
    const dist = Math.abs(e.x - p.x) + Math.abs(e.y - p.y);
    if (dist === 1) {
      const dmg = Math.max(1, e.atk - playerDef(p) + rnd(2));
      p.hp -= dmg;
      msgs.push(e.name + ' hits you for ' + dmg + '.');
      if (p.hp <= 0) { p.hp = 0; break; }
      continue;
    }
    let dirs;
    if (dist <= 6 && !(ENEMY_TYPES[e.type].erratic && Math.random() < 0.4)) {
      const sx = Math.sign(p.x - e.x), sy = Math.sign(p.y - e.y);
      dirs = Math.abs(p.x - e.x) >= Math.abs(p.y - e.y) ? [[sx, 0], [0, sy]] : [[0, sy], [sx, 0]];
    } else if (Math.random() < 0.5) {
      dirs = [[[1,0],[-1,0],[0,1],[0,-1]][rnd(4)]];
    } else continue;
    for (const [dx, dy] of dirs) {
      if (dx === 0 && dy === 0) continue;
      const nx = e.x + dx, ny = e.y + dy;
      if (inBounds(lv, nx, ny) && !enemyAt(lv, nx, ny) && !(nx === p.x && ny === p.y)) { e.x = nx; e.y = ny; break; }
    }
  }
  return msgs;
}

function regen(p) {
  p.turn++;
  if (p.turn % 3 === 0 && p.mp < p.maxMp) p.mp++;
  if (p.turn % 8 === 0 && p.hp < p.maxHp && p.hp > 0) p.hp++;
}

if (typeof module !== 'undefined') {
  module.exports = { CLASSES, generateLevel, newPlayer, playerMove, castSpell, useItem, enemyTurn, regen, gainXp, MAP_W, MAP_H, MAX_FLOOR };
}
