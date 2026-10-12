const TILE = 16;
const $ = (id) => document.getElementById(id);

let player, level, floorNum, gameOver, scene;
let logLines = [];

function log(msgs) {
  logLines = logLines.concat(msgs).slice(-3);
  $('log').innerHTML = logLines.map((l) => '<div>' + l + '</div>').join('');
}

function updateHud() {
  const p = player;
  $('floor').textContent = 'Floor ' + floorNum + '/' + MAX_FLOOR;
  $('lvl').textContent = 'Lv ' + p.level;
  $('stats').textContent = 'ATK ' + playerAtk(p) + ' DEF ' + playerDef(p);
  $('hpFill').style.width = (100 * p.hp / p.maxHp) + '%';
  $('mpFill').style.width = (100 * p.mp / p.maxMp) + '%';
  $('xpFill').style.width = (100 * p.xp / xpNeeded(p)) + '%';
  $('hpText').textContent = 'HP ' + p.hp + '/' + p.maxHp;
  $('mpText').textContent = 'MP ' + p.mp + '/' + p.maxMp;
  $('bagCount').textContent = p.inv.length + '/' + INV_MAX;
  $('spellBtn').disabled = p.mp < SPELL_COST;
}

function showMessage(title, text) {
  $('msgTitle').textContent = title;
  $('msgText').textContent = text;
  $('message').classList.remove('hidden');
}

function chooseClass() {
  gameOver = true;
  $('message').classList.add('hidden');
  const list = $('classes');
  list.innerHTML = '';
  Object.keys(CLASSES).forEach((k) => {
    const b = document.createElement('button');
    b.textContent = CLASSES[k].name + ' - ' + CLASSES[k].desc;
    b.onclick = () => { $('classSelect').classList.add('hidden'); startGame(k); };
    list.appendChild(b);
  });
  $('classSelect').classList.remove('hidden');
}

function startGame(cls) {
  player = newPlayer(cls);
  floorNum = 1;
  gameOver = false;
  logLines = [];
  $('message').classList.add('hidden');
  loadFloor();
  log(['You enter the dungeon. Find the stairs!']);
  updateHud();
}

function loadFloor() {
  level = generateLevel(floorNum);
  player.x = 1; player.y = 1;
  if (scene) scene.render();
}

// Finish a player action: enemies act, then check win/lose.
function endTurn(result) {
  const msgs = result.msgs.slice();
  if (result.won) {
    log(msgs); updateHud(); scene.render(); gameOver = true;
    showMessage('Victory!', 'The Dungeon Lord has fallen. You conquered the dungeon!');
    return;
  }
  if (result.newFloor) {
    floorNum++;
    player.hp = Math.min(player.maxHp, player.hp + 5);
    msgs.push('You descend to floor ' + floorNum + (floorNum === MAX_FLOOR ? ' - the Dungeon Lord awaits!' : '.'));
    loadFloor();
  } else {
    msgs.push(...enemyTurn(player, level));
    regen(player);
  }
  log(msgs);
  updateHud();
  scene.render();
  if (player.hp <= 0) {
    gameOver = true;
    showMessage('You died', 'Reached floor ' + floorNum + ', level ' + player.level + '.');
  }
}

function act(dx, dy) {
  if (gameOver || !$('inventory').classList.contains('hidden')) return;
  const r = playerMove(player, level, dx, dy);
  if (!r.acted) return;
  if (r.hitX !== undefined) scene.flash(r.hitX, r.hitY);
  endTurn(r);
}

function cast() {
  if (gameOver) return;
  const r = castSpell(player, level);
  if (!r.acted) { log(r.msgs); return; }
  r.targets.forEach(([x, y]) => scene.flash(x, y));
  endTurn(r);
}

function renderInventory() {
  const list = $('invList');
  list.innerHTML = '';
  if (!player.inv.length) list.innerHTML = '<div class="empty">Empty</div>';
  player.inv.forEach((type, i) => {
    const b = document.createElement('button');
    b.textContent = ITEM_TYPES[type].name + ' - ' + ITEM_TYPES[type].desc;
    b.onclick = () => {
      const r = useItem(player, i);
      if (r.used) {
        $('inventory').classList.add('hidden');
        endTurn({ msgs: [r.msg] });
      }
    };
    list.appendChild(b);
  });
}

class DungeonScene extends Phaser.Scene {
  create() {
    buildTextures(this);
    scene = this;
    this.layer = this.add.group();
    const dirs = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], ' ': [0, 0], q: [-1, -1], e: [1, -1], z: [-1, 1], c: [1, 1] };
    window.addEventListener('keydown', (e) => {
      if (dirs[e.key]) { e.preventDefault(); act(...dirs[e.key]); }
      else if (e.key === 'f') cast();
      else if (e.key === 'i') { renderInventory(); $('inventory').classList.toggle('hidden'); }
    });
    // Swipe on canvas to move, tap to wait.
    let start = null;
    this.input.on('pointerdown', (p) => { start = { x: p.x, y: p.y }; });
    this.input.on('pointerup', (p) => {
      if (!start) return;
      const dx = p.x - start.x, dy = p.y - start.y;
      start = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 12) return;
      const ax = Math.abs(dx), ay = Math.abs(dy);
      if (ax > 2 * ay) act(Math.sign(dx), 0);
      else if (ay > 2 * ax) act(0, Math.sign(dy));
      else act(Math.sign(dx), Math.sign(dy));
    });
    chooseClass();
  }

  flash(x, y) {
    const s = this.add.image(x * TILE + 8, y * TILE + 8, 'spark').setDepth(10);
    this.tweens.add({ targets: s, alpha: 0, scale: 1.6, duration: 250, onComplete: () => s.destroy() });
  }

  render() {
    this.layer.clear(true, true);
    const add = (key, x, y, d) => this.layer.add(this.add.image(x * TILE + 8, y * TILE + 8, key).setDepth(d));
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) add(level.map[y][x] ? 'wall' : 'floor', x, y, 0);
    if (level.stairs) add('stairs', level.stairs.x, level.stairs.y, 1);
    level.items.forEach((i) => add(ITEM_TYPES[i.type].sprite, i.x, i.y, 2));
    level.enemies.forEach((e) => {
      add(e.sprite, e.x, e.y, 3);
      const w = Math.max(1, Math.round(14 * e.hp / e.maxHp));
      this.layer.add(this.add.rectangle(e.x * TILE + 1, e.y * TILE, w, 2, 0xd03a3a).setOrigin(0, 0).setDepth(4));
    });
    add(player.sprite, player.x, player.y, 5);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: MAP_W * TILE,
  height: MAP_H * TILE,
  backgroundColor: '#14101e',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: DungeonScene
});

document.querySelectorAll('#dpad button').forEach((b) => {
  const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0], wait: [0, 0], ul: [-1, -1], ur: [1, -1], dl: [-1, 1], dr: [1, 1] }[b.dataset.dir];
  b.addEventListener('click', () => act(...d));
});
$('spellBtn').onclick = cast;
$('bagBtn').onclick = () => { if (!gameOver) { renderInventory(); $('inventory').classList.remove('hidden'); } };
$('closeBag').onclick = () => $('inventory').classList.add('hidden');
$('msgBtn').onclick = chooseClass;
