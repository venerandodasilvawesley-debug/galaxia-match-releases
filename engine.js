/* =========================================================
   GALÁXIA MATCH — MOTOR DO TABULEIRO
   Lógica pura (sem DOM): roda no navegador e no Node, para
   que as fases possam ser simuladas e balanceadas por script.
   ========================================================= */
(function(root){
'use strict';

const ROWS = 8, COLS = 8;
const HOLE = -1; // "cor" do buraco negro: não combina com nada

function mulberry32(a){
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const key = (r, c) => r * COLS + c;
const unkey = k => [Math.floor(k / COLS), k % COLS];
const inside = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS;

class Board {
  // colors: quantos planetas diferentes (4–6)
  // dust:   8 strings de 8 caracteres, '#' = poeira cósmica naquela casa
  constructor({ colors = 6, dust = null, seed = Date.now() } = {}){
    this.colors = colors;
    this.rand = mulberry32(seed);
    this.nextId = 1;
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    this.dust = Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) => !!dust && dust[r][c] === '#'));
    this.fillInitial();
  }

  newPiece(color, special = null){ return { id: this.nextId++, color, special }; }
  randColor(){ return Math.floor(this.rand() * this.colors); }
  dustLeft(){ return this.dust.flat().filter(Boolean).length; }

  fillInitial(){
    const g = this.grid;
    do {
      for(let r = 0; r < ROWS; r++) for(let c = 0; c < COLS; c++){
        let color;
        do { color = this.randColor(); } while(
          (c >= 2 && g[r][c-1].color === color && g[r][c-2].color === color) ||
          (r >= 2 && g[r-1][c].color === color && g[r-2][c].color === color));
        g[r][c] = this.newPiece(color);
      }
    } while(!this.hasMove());
  }

  // ---------- detecção ----------
  findRuns(){
    const g = this.grid, runs = [];
    for(let r = 0; r < ROWS; r++){
      let c = 0;
      while(c < COLS){
        const p = g[r][c];
        if(!p || p.color === HOLE){ c++; continue; }
        let e = c + 1;
        while(e < COLS && g[r][e] && g[r][e].color === p.color) e++;
        if(e - c >= 3) runs.push({ dir:'h', color:p.color, cells:Array.from({ length:e-c }, (_, i) => [r, c+i]) });
        c = e;
      }
    }
    for(let c = 0; c < COLS; c++){
      let r = 0;
      while(r < ROWS){
        const p = g[r][c];
        if(!p || p.color === HOLE){ r++; continue; }
        let e = r + 1;
        while(e < ROWS && g[e][c] && g[e][c].color === p.color) e++;
        if(e - r >= 3) runs.push({ dir:'v', color:p.color, cells:Array.from({ length:e-r }, (_, i) => [r+i, c]) });
        r = e;
      }
    }
    return runs;
  }

  swapCells(a, b){
    const g = this.grid;
    [g[a.r][a.c], g[b.r][b.c]] = [g[b.r][b.c], g[a.r][a.c]];
  }

  // lista de jogadas válidas (dica e simulador)
  validMoves(){
    const moves = [], g = this.grid;
    for(let r = 0; r < ROWS; r++) for(let c = 0; c < COLS; c++){
      for(const [dr, dc] of [[0,1],[1,0]]){
        const r2 = r + dr, c2 = c + dc;
        if(!inside(r2, c2)) continue;
        const pa = g[r][c], pb = g[r2][c2];
        let ok = pa.special === 'hole' || pb.special === 'hole' || !!(pa.special && pb.special);
        if(!ok){
          this.swapCells({ r, c }, { r:r2, c:c2 });
          ok = this.findRuns().length > 0;
          this.swapCells({ r, c }, { r:r2, c:c2 });
        }
        if(ok) moves.push([{ r, c }, { r:r2, c:c2 }]);
      }
    }
    return moves;
  }
  hasMove(){ return this.validMoves().length > 0; }

  mostCommonColor(){
    const count = Array(this.colors).fill(0);
    this.grid.flat().forEach(p => { if(p && p.color >= 0) count[p.color]++; });
    return count.indexOf(Math.max(...count));
  }

  // ---------- efeitos ----------
  effectCells(p, r, c){
    const out = [];
    if(p.special === 'h') for(let x = 0; x < COLS; x++) out.push(key(r, x));
    if(p.special === 'v') for(let y = 0; y < ROWS; y++) out.push(key(y, c));
    if(p.special === 'bomb'){
      for(let y = r-1; y <= r+1; y++) for(let x = c-1; x <= c+1; x++) if(inside(y, x)) out.push(key(y, x));
    }
    if(p.special === 'hole'){
      // buraco negro acionado em cadeia: suga a cor mais comum
      const target = this.mostCommonColor();
      this.grid.forEach((row, y) => row.forEach((q, x) => { if(q && q.color === target) out.push(key(y, x)); }));
    }
    return out;
  }

  // Remove as casas; especiais atingidos disparam o próprio efeito em cadeia.
  clearCells(keys, ph, triggered = new Set()){
    const toClear = new Set(keys), queue = [...toClear];
    while(queue.length){
      const k = queue.pop();
      const [r, c] = unkey(k);
      const p = this.grid[r][c];
      if(!p || !p.special || triggered.has(p.id)) continue;
      triggered.add(p.id);
      ph.fx.push({ tipo:p.special, r, c });
      for(const e of this.effectCells(p, r, c)){
        if(!toClear.has(e)){ toClear.add(e); queue.push(e); }
      }
    }
    for(const k of toClear){
      const [r, c] = unkey(k);
      const p = this.grid[r][c];
      if(!p) continue;
      ph.cleared.push({ id:p.id, r, c, color:p.color, special:p.special });
      this.grid[r][c] = null;
      if(this.dust[r][c]){ this.dust[r][c] = false; ph.dustCleared.push([r, c]); }
    }
  }

  // Combinações: 5+ = buraco negro; L/T = supernova; 4 = cometa.
  resolveRuns(runs, prefer, ph, combo){
    const cellRuns = new Map();
    runs.forEach((run, i) => run.cells.forEach(([r, c]) => {
      const k = key(r, c);
      if(!cellRuns.has(k)) cellRuns.set(k, []);
      cellRuns.get(k).push(i);
    }));
    const pickPos = run => {
      const hit = (prefer || []).find(p => run.cells.some(([r, c]) => r === p.r && c === p.c));
      if(hit) return { r:hit.r, c:hit.c };
      const [r, c] = run.cells[Math.floor(run.cells.length / 2)];
      return { r, c };
    };
    const used = new Set(), creations = new Map();
    const create = (pos, color, special) => {
      const k = key(pos.r, pos.c);
      if(!creations.has(k)) creations.set(k, { ...pos, color, special });
    };
    runs.forEach((run, i) => {
      if(run.cells.length >= 5){ used.add(i); create(pickPos(run), HOLE, 'hole'); }
    });
    for(const [k, list] of cellRuns){
      if(list.length >= 2 && list.every(i => !used.has(i))){
        list.forEach(i => used.add(i));
        const [r, c] = unkey(k);
        create({ r, c }, runs[list[0]].color, 'bomb');
      }
    }
    runs.forEach((run, i) => {
      if(!used.has(i) && run.cells.length === 4){ used.add(i); create(pickPos(run), run.color, run.dir); }
    });

    const keys = new Set();
    runs.forEach(run => run.cells.forEach(([r, c]) => keys.add(key(r, c))));
    this.clearCells(keys, ph);
    for(const cr of creations.values()){
      const p = this.newPiece(cr.color, cr.special);
      this.grid[cr.r][cr.c] = p;
      ph.created.push({ id:p.id, r:cr.r, c:cr.c, color:p.color, special:p.special });
    }
    ph.score += ph.cleared.length * 60 * combo + creations.size * 200;
  }

  gravity(ph){
    const g = this.grid;
    for(let c = 0; c < COLS; c++){
      let write = ROWS - 1;
      for(let r = ROWS - 1; r >= 0; r--){
        const p = g[r][c];
        if(!p) continue;
        if(write !== r){
          g[write][c] = p; g[r][c] = null;
          ph.falls.push({ id:p.id, r:write, c, fromR:r });
        }
        write--;
      }
      const empty = write + 1;
      for(let r = write; r >= 0; r--){
        const p = this.newPiece(this.randColor());
        g[r][c] = p;
        ph.spawns.push({ id:p.id, r, c, color:p.color, special:null, fromR:r - empty });
      }
    }
  }

  shuffle(){
    const pieces = this.grid.flat();
    for(let tries = 0; tries < 200; tries++){
      for(let i = pieces.length - 1; i > 0; i--){
        const j = Math.floor(this.rand() * (i + 1));
        [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
      }
      pieces.forEach((p, i) => { this.grid[Math.floor(i / COLS)][i % COLS] = p; });
      if(this.findRuns().length === 0 && this.hasMove()) return;
    }
    // não achou arranjo: sorteia cores novas para as peças comuns
    pieces.forEach(p => { if(!p.special) p.color = this.randColor(); });
    if(this.findRuns().length || !this.hasMove()) this.shuffle();
  }

  // ---------- jogada ----------
  // Retorna { valid:false } ou { valid:true, phases, shuffled }.
  // Cada fase = uma etapa da cascata, na ordem em que deve ser animada.
  play(a, b){
    if(!inside(a.r, a.c) || !inside(b.r, b.c) || Math.abs(a.r - b.r) + Math.abs(a.c - b.c) !== 1) return { valid:false };
    const pa = this.grid[a.r][a.c], pb = this.grid[b.r][b.c];
    const newPhase = () => this.novaFase();
    this.swapCells(a, b); // pa agora está em b, pb em a
    let ph = newPhase();

    if(pa.special === 'hole' || pb.special === 'hole'){
      const keys = new Set([key(a.r, a.c), key(b.r, b.c)]);
      const hole = pa.special === 'hole' ? pa : pb;
      if(pa.special === 'hole' && pb.special === 'hole'){
        for(let k = 0; k < ROWS * COLS; k++) keys.add(k);
        ph.fx.push({ tipo:'bigbang', r:b.r, c:b.c });
      } else {
        const target = (hole === pa ? pb : pa).color;
        this.grid.forEach((row, r) => row.forEach((q, c) => { if(q.color === target) keys.add(key(r, c)); }));
        ph.fx.push({ tipo:'hole', r: hole === pa ? b.r : a.r, c: hole === pa ? b.c : a.c, cor:target });
      }
      this.clearCells(keys, ph, new Set([hole.id]));
      ph.score += ph.cleared.length * 80;
    } else if(pa.special && pb.special){
      const types = [pa.special, pb.special].map(s => s === 'bomb' ? 'bomb' : 'comet');
      const keys = new Set();
      const addRow = r => { if(r >= 0 && r < ROWS) for(let x = 0; x < COLS; x++) keys.add(key(r, x)); };
      const addCol = c => { if(c >= 0 && c < COLS) for(let y = 0; y < ROWS; y++) keys.add(key(y, c)); };
      if(types[0] === 'comet' && types[1] === 'comet'){ addRow(b.r); addCol(b.c); ph.fx.push({ tipo:'cruz', r:b.r, c:b.c }); }
      else if(types[0] === 'bomb' && types[1] === 'bomb'){
        for(let y = b.r-2; y <= b.r+2; y++) for(let x = b.c-2; x <= b.c+2; x++) if(inside(y, x)) keys.add(key(y, x));
        ph.fx.push({ tipo:'bomb', r:b.r, c:b.c, grande:true });
      } else { for(let d = -1; d <= 1; d++){ addRow(b.r + d); addCol(b.c + d); } ph.fx.push({ tipo:'cruz', r:b.r, c:b.c, largo:true }); }
      this.clearCells(keys, ph, new Set([pa.id, pb.id]));
      ph.score += ph.cleared.length * 80;
    } else {
      const runs = this.findRuns();
      if(!runs.length){ this.swapCells(a, b); return { valid:false }; }
      this.resolveRuns(runs, [a, b], ph, 1);
    }

    return this.cascata(ph);
  }

  // Gravidade + novas combinações em cadeia, a partir da primeira fase já resolvida.
  cascata(ph){
    const phases = [];
    let combo = ph.combo || 1;
    for(;;){
      this.gravity(ph);
      phases.push(ph);
      const runs = this.findRuns();
      if(!runs.length) break;
      combo++;
      ph = this.novaFase();
      ph.combo = combo;
      this.resolveRuns(runs, null, ph, combo);
    }
    let shuffled = false;
    if(!this.hasMove()){ this.shuffle(); shuffled = true; }
    return { valid:true, phases, shuffled };
  }

  novaFase(){ return { cleared:[], created:[], dustCleared:[], falls:[], spawns:[], fx:[], score:0, combo:1 }; }

  // Poderes (não gastam jogada): 'meteoro' destrói uma casa, 'foguete' limpa uma linha,
  // 'gravidade' embaralha. Especiais atingidos disparam normalmente.
  usarPoder(tipo, alvo){
    if(tipo === 'gravidade'){ this.shuffle(); return { valid:true, phases:[], shuffled:true }; }
    if(!alvo || !inside(alvo.r, alvo.c)) return { valid:false };
    const ph = this.novaFase(), keys = new Set();
    if(tipo === 'meteoro'){ keys.add(key(alvo.r, alvo.c)); ph.fx.push({ tipo:'meteoro', r:alvo.r, c:alvo.c }); }
    else if(tipo === 'foguete'){ for(let x = 0; x < COLS; x++) keys.add(key(alvo.r, x)); ph.fx.push({ tipo:'foguete', r:alvo.r, c:alvo.c }); }
    else return { valid:false };
    this.clearCells(keys, ph);
    ph.score += ph.cleared.length * 60;
    return this.cascata(ph);
  }

  clone(seed){
    const b = Object.create(Board.prototype);
    b.colors = this.colors;
    b.rand = mulberry32(seed ?? Math.floor(Math.random() * 2**31));
    b.nextId = this.nextId;
    b.grid = this.grid.map(row => row.map(p => p && { ...p }));
    b.dust = this.dust.map(row => row.slice());
    return b;
  }
}

const api = { Board, ROWS, COLS, HOLE };
if(typeof module !== 'undefined' && module.exports) module.exports = api;
else root.GalaxyEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
