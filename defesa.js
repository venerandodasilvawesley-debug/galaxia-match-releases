/* =========================================================
   GALÁXIA MATCH — DEFESA DA TERRA (regras dos meteoros)
   Modo especial: meteoros caem do alto do tabuleiro, uma fileira
   por jogada. Combinar planetas em cima de um meteoro o destrói
   (mesma mecânica da poeira cósmica: board.dust). Meteoro que passa
   da última fileira atinge a Terra e tira um ponto do escudo.
   Lógica pura (sem DOM): roda no jogo e no simulador de balanceamento.
   ========================================================= */
(function(root){
'use strict';

// valores calibrados por simulação (tests/calibrar-defesa.js)
const CONFIG = { cores:6, jogadas:30, meta:20, escudo:4, primeiraOnda:3, aCada:2, porOnda:2 };   // ≈83% de vitória no simulador

const ROWS = 8, COLS = 8;

function novaDefesa(cfg = CONFIG){
  return { cfg, escudo:cfg.escudo, destruidos:0, jogada:0, impactos:0 };
}

// coloca `n` meteoros na fileira de cima, em colunas livres (sorteio do próprio tabuleiro)
function lancar(board, n){
  const livres = [];
  for(let c = 0; c < COLS; c++) if(!board.dust[0][c]) livres.push(c);
  const novos = [];
  for(let k = 0; k < n && livres.length; k++){
    const c = livres.splice(Math.floor(board.rand() * livres.length), 1)[0];
    board.dust[0][c] = true; novos.push([0, c]);
  }
  return novos;
}

// Depois de cada jogada: os meteoros descem uma fileira (de baixo para cima, para não
// "pular" duas); os da última fileira atingem a Terra. A cada `aCada` jogadas chega uma onda.
function passo(d, board){
  d.jogada++;
  const colunas = [];
  for(let c = 0; c < COLS; c++) if(board.dust[ROWS - 1][c]){ board.dust[ROWS - 1][c] = false; colunas.push(c); }
  const impactos = colunas.length;
  for(let r = ROWS - 2; r >= 0; r--) for(let c = 0; c < COLS; c++){
    if(board.dust[r][c]){ board.dust[r][c] = false; board.dust[r + 1][c] = true; }
  }
  d.escudo = Math.max(0, d.escudo - impactos); d.impactos += impactos;
  const novos = d.jogada % d.cfg.aCada === 0 ? lancar(board, d.cfg.porOnda) : [];
  return { impactos, colunas, novos };
}

// início: a primeira onda já aparece no topo
function comecar(d, board){
  for(const l of board.dust) l.fill(false);
  return lancar(board, d.cfg.primeiraOnda);
}

const venceu = d => d.destruidos >= d.cfg.meta;
const perdeu = (d, jogadas) => d.escudo <= 0 || (jogadas <= 0 && !venceu(d));

const api = { CONFIG, novaDefesa, lancar, passo, comecar, venceu, perdeu };
if(typeof module !== 'undefined' && module.exports) module.exports = api;
else root.GalaxyDefesa = api;
})(typeof window !== 'undefined' ? window : globalThis);
