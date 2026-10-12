// Pixel art: 8x8 sprites defined as strings, rendered 2x into 16x16 textures.
const PALETTE = {
  '.': null, '#': '#2a2438', 'g': '#4a3f66', 'w': '#e8e8f0', 'k': '#111111',
  'r': '#d03a3a', 'b': '#3a6ad0', 'y': '#e0b830', 'n': '#8a5a2b', 'o': '#e07a30',
  'p': '#8a3ad0', 'G': '#3aa04a', 's': '#f0c8a0', 'c': '#9aa0b0'
};

const SPRITES = {
  floor: ['gggggggg','gggggggg','gggggggg','gggg#ggg','gggggggg','gggggggg','g#gggggg','gggggggg'],
  wall: ['########','#gg#gg#g','########','g#gg#gg#','########','#gg#gg#g','########','g#gg#gg#'],
  stairs: ['gggggggg','gwwwwwwg','gggggggg','gkwwwwwg','gkkggggg','gkkkwwwg','gkkkkggg','gggggggg'],
  player: ['..bbbb..','.bssssb.','.bskksb.','..bbbb..','.bbyybb.','sbbbbbbs','.bbbbbb.','.nn..nn.'],
  rat: ['........','..nn..nn','.nnnnnnn','nnknnnkn','.nnnnnnn','..nnnnn.','nn.n.n.n','........'],
  bat: ['p......p','pp.pp.pp','pppppppp','ppkppkpp','.pppppp.','..pwwp..','...pp...','........'],
  skeleton: ['..wwww..','.wwwwww.','.wkwwkw.','..wwww..','.wwwwww.','.w.ww.w.','..wwww..','.ww..ww.'],
  goblin: ['..GGGG..','.GGGGGG.','.GkGGkG.','..GGGG..','.nGGGGn.','nwGGGG..','.nGGGG..','.GG..GG.'],
  boss: ['r.rrrr.r','rrrrrrrr','rykrrkyr','rrrrrrrr','.rwrrwr.','.rrrrrr.','rrrrrrrr','rr.rr.rr'],
  potion: ['...nn...','...ww...','..wrrw..','.wrrrrw.','.wrrrrw.','.wrrrrw.','..wwww..','........'],
  mana: ['...nn...','...ww...','..wbbw..','.wbbbbw.','.wbbbbw.','.wbbbbw.','..wwww..','........'],
  sword: ['......cc','.....cwc','....cwc.','...cwc..','n.cwc...','.nwc....','.nn.....','nn......'],
  bow: ['..n.....','.n.w....','n..w....','n...w...','n...w...','n..w....','.n.w....','..n.....'],
  wand: ['......yy','.....yy.','....nn..','...nn...','..nn....','.nn.....','nn......','n.......'],
  fighter: ['..cccc..','.cssssc.','.cskksc.','..cccc..','.rrccrr.','srrrrrrs','.rrrrrr.','.nn..nn.'],
  archer: ['..GGGG..','.GssssG.','.GskksG.','..GGGG..','.GGnnGG.','sGGGGGGs','.GGGGGG.','.nn..nn.'],
  wizard: ['...pp...','..pppp..','.pssssp.','.pskksp.','.pppppp.','spyppyps','.pppppp.','.pp..pp.'],
  armor: ['.cc..cc.','cccccccc','cwcccwcc','cccccccc','.cccccc.','.cccccc.','.cc..cc.','........'],
  spark: ['........','..o..o..','...oo...','.oo..oo.','.oo..oo.','...oo...','..o..o..','........']
};

function buildTextures(scene) {
  for (const key of Object.keys(SPRITES)) {
    const rows = SPRITES[key];
    const canvas = scene.textures.createCanvas(key, 16, 16);
    const ctx = canvas.getContext();
    // floor and wall fill the tile; others get a transparent background.
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const col = PALETTE[rows[y][x]];
        if (col) { ctx.fillStyle = col; ctx.fillRect(x * 2, y * 2, 2, 2); }
      }
    }
    canvas.refresh();
  }
}
