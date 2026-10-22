/* =========================================================
   GALÁXIA MATCH — DESEMPENHO (qualidade automática)
   1) Na abertura, estima a força do aparelho (memória, núcleos,
      tela) e escolhe a resolução inicial do 3D.
   2) Durante a fase, mede o tempo de cada quadro do 3D. Se o
      jogo cair abaixo de ~40 quadros por segundo, baixa a
      resolução um degrau; se mesmo na menor resolução ficar
      abaixo de ~28 qps, avisa o jogo para passar ao 2D.
   ========================================================= */
(function(root){
'use strict';

const mem = navigator.deviceMemory || 4;            // GB (aproximado; nem todo navegador informa)
const nucleos = navigator.hardwareConcurrency || 4;
const dprTela = Math.min(2, devicePixelRatio || 1);
// baixo: celulares de entrada (2 GB, 4 núcleos); medio: intermediários; alto: o resto
const nivel = mem <= 2 || nucleos <= 2 ? 'baixo' : mem <= 4 || nucleos <= 4 ? 'medio' : 'alto';
const DEGRAUS = [2, 1.75, 1.5, 1.25, 1].filter(d => d <= dprTela);
if(!DEGRAUS.length) DEGRAUS.push(dprTela);
const tetoInicial = { alto:2, medio:1.5, baixo:1 }[nivel];

const D = {
  nivel,
  degrau: Math.max(0, DEGRAUS.findIndex(d => d <= tetoInicial)),
  ouvintes: [], aoLento: [],
  soma: 0, n: 0, inicioJanela: 0, lentoDesde: 0, subiu: false, avisouLento: false
};

const pixelRatio = () => DEGRAUS[D.degrau];

function mudar(degrau){
  if(degrau === D.degrau || degrau < 0 || degrau >= DEGRAUS.length) return;
  D.degrau = degrau;
  console.info('[galaxia] resolução do 3D:', DEGRAUS[degrau]);
  for(const f of D.ouvintes) try { f(pixelRatio()); } catch(e){ console.warn(e); }
}

// recebe o tempo de um quadro (em segundos) do laço 3D
// os testes automáticos rodam o 3D em software (lento de propósito) e desligam o ajuste
let desligado = false;
try { desligado = localStorage.getItem('galaxia-qualidade-fixa') === '1'; } catch(e){}
function amostra(dt){
  if(desligado || !(dt > 0) || dt > 0.25) return;                 // aba escondida / pausa: ignora
  const agora = performance.now();
  if(!D.inicioJanela) D.inicioJanela = agora;
  D.soma += dt; D.n++;
  if(agora - D.inicioJanela < 2500) return;          // avalia a cada ~2,5 s
  const qps = D.n / D.soma;
  D.soma = 0; D.n = 0; D.inicioJanela = agora;
  if(qps < 40 && D.degrau < DEGRAUS.length - 1){ mudar(D.degrau + 1); D.lentoDesde = 0; return; }
  if(qps < 24 && D.degrau === DEGRAUS.length - 1){
    if(!D.lentoDesde) D.lentoDesde = agora;
    else if(agora - D.lentoDesde > 8000 && !D.avisouLento){
      D.avisouLento = true;
      for(const f of D.aoLento) try { f(qps); } catch(e){ console.warn(e); }
    }
    return;
  }
  D.lentoDesde = 0;
  // sobra folga: volta um degrau, só uma vez (evita ficar subindo e descendo)
  if(qps > 57 && D.degrau > 0 && !D.subiu && DEGRAUS[D.degrau - 1] <= tetoInicial){ D.subiu = true; mudar(D.degrau - 1); }
}

// nova fase: recomeça a medição sem perder o degrau já encontrado
function reiniciar(){ D.soma = 0; D.n = 0; D.inicioJanela = 0; D.lentoDesde = 0; }

root.Desempenho = {
  get nivel(){ return D.nivel; },
  pixelRatio, amostra, reiniciar,
  aoMudar(f){ D.ouvintes.push(f); },
  aoFicarLento(f){ D.aoLento.push(f); },
  // partículas e flocos: menos em aparelhos fracos
  get fatorParticulas(){ return { alto:1, medio:0.7, baixo:0.45 }[D.nivel]; }
};
})(window);
