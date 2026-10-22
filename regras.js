/* =========================================================
   GALÁXIA MATCH — REGRAS DE OBJETIVO
   Compartilhadas entre o jogo e o simulador de balanceamento.
   ========================================================= */
(function(root){
'use strict';

function novoEstado(fase, board){
  return {
    jogadas: fase.jogadas,
    pontos: 0,
    coletado: Object.fromEntries(Object.keys(fase.objetivos.coletar || {}).map(c => [c, 0])),
    poeira: board.dustLeft(),
  };
}

// Aplica o resultado de uma jogada (board.play) ao estado da fase.
function aplicarJogada(est, resultado, board){
  est.jogadas--;
  for(const ph of resultado.phases){
    est.pontos += ph.score;
    for(const p of ph.cleared){
      if(p.color in est.coletado) est.coletado[p.color]++;
    }
  }
  est.poeira = board.dustLeft();
}

function venceu(fase, est){
  const o = fase.objetivos;
  if(o.pontos && est.pontos < o.pontos) return false;
  if(o.coletar && Object.entries(o.coletar).some(([c, n]) => est.coletado[c] < n)) return false;
  if(o.poeira && est.poeira > 0) return false;
  return true;
}

// Estrelas: 1 por vencer; 2 e 3 pelas jogadas que sobraram (cada uma vale bônus).
function estrelas(fase, est){
  if(!venceu(fase, est)) return 0;
  const sobra = est.jogadas / fase.jogadas;
  return sobra >= 0.35 ? 3 : sobra >= 0.15 ? 2 : 1;
}

const api = { novoEstado, aplicarJogada, venceu, estrelas };
if(typeof module !== 'undefined' && module.exports) module.exports = api;
else root.GalaxyRegras = api;
})(typeof window !== 'undefined' ? window : globalThis);
