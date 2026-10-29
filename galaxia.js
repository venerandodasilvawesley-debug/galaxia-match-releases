/* =========================================================
   GALÁXIA MATCH — FUNDO DE GALÁXIA
   Estrelas fixas + uma galáxia espiral (gerada uma vez num
   canvas à parte, tingida com a cor do mundo) girando bem
   devagar por CSS, estrelas cadentes e, às vezes, uma chuva de meteoros.
   Qualidade 'leve': galáxia parada e sem estrelas cadentes.
   ========================================================= */
(function(root){
'use strict';

const G = { cor:'#3fa7d6', qualidade:'completo', img:null, timer:null };

function rnd(seed){ let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function hexRgb(h){ return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); }

// Galáxia espiral: dois braços logarítmicos de pontos + núcleo brilhante.
function gerarGalaxia(lado, cor){
  const cv = document.createElement('canvas');
  cv.width = cv.height = lado;
  const ctx = cv.getContext('2d'), c = lado / 2, R = lado * 0.48, r = rnd(42), [tr, tg, tb] = hexRgb(cor);
  ctx.globalCompositeOperation = 'lighter';
  // halo difuso
  const halo = ctx.createRadialGradient(c, c, 0, c, c, R);
  halo.addColorStop(0, `rgba(${tr},${tg},${tb},.4)`); halo.addColorStop(0.5, `rgba(${tr},${tg},${tb},.12)`); halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo; ctx.fillRect(0, 0, lado, lado);
  const bracos = 2, b = 0.32;
  for(let i = 0; i < 14000; i++){
    const braco = i % bracos;
    const d = Math.pow(r(), 0.75);                      // distância do centro (0..1)
    const teta = braco * Math.PI + Math.log(d * 40 + 1) / b + (r() - 0.5) * (0.9 - d * 0.5);
    const esp = (r() - 0.5) * 0.12 * R * (1 - d * 0.4); // espessura do braço
    const x = c + Math.cos(teta) * d * R + esp, y = c + Math.sin(teta) * d * R * 0.62 + esp * 0.6;
    const quente = 1 - d;                                // núcleo amarelado, braços na cor do mundo
    const cr = Math.round(255 * quente + tr * (1 - quente)), cg = Math.round(230 * quente + tg * (1 - quente)), cb = Math.round(190 * quente + tb * (1 - quente));
    ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.4 + r() * 0.6})`;
    const tam = r() < 0.03 ? 1.8 : 0.9;
    ctx.fillRect(x, y, tam, tam);
  }
  const nucleo = ctx.createRadialGradient(c, c, 0, c, c, R * 0.22);
  nucleo.addColorStop(0, 'rgba(255,245,220,.95)'); nucleo.addColorStop(0.3, 'rgba(255,220,160,.5)'); nucleo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = nucleo; ctx.save(); ctx.translate(c, c); ctx.scale(1, 0.62); ctx.beginPath(); ctx.arc(0, 0, R * 0.22, 0, Math.PI * 2); ctx.restore(); ctx.fill();
  return cv;
}

function desenharEstrelas(){
  const cv = document.getElementById('ceu'), dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  Object.assign(cv.style, { width:innerWidth + 'px', height:innerHeight + 'px' });
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  const r = rnd(12345);
  for(let i = 0; i < Math.round(innerWidth * innerHeight / 3500); i++){
    ctx.globalAlpha = 0.25 + r() * 0.75;
    ctx.fillStyle = r() < 0.15 ? '#ffe9c4' : r() < 0.2 ? '#c4d8ff' : '#ffffff';
    ctx.beginPath(); ctx.arc(r() * innerWidth, r() * innerHeight, r() < 0.92 ? r() * 1.1 + 0.2 : r() * 1.8 + 1, 0, Math.PI * 2); ctx.fill();
  }
}

// A galáxia é desenhada UMA vez no canvas; o giro é uma animação CSS (feita pela
// GPU, sem redesenhar). Estrelas cadentes são elementos CSS curtos.
function desenharGalaxia(){
  const cv = document.getElementById('galaxia'), dpr = Math.min(2, devicePixelRatio || 1);
  const lado = G.img.width;
  if(!(lado > 0)) return;
  cv.width = lado * dpr; cv.height = lado * dpr;
  Object.assign(cv.style, { width:lado + 'px', height:lado + 'px', left:`${innerWidth * 0.5 - lado / 2}px`, top:`${innerHeight * 0.26 - lado / 2}px` });   // centralizada, no alto
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.drawImage(G.img, 0, 0);
  cv.classList.toggle('gira', G.qualidade === 'completo');
}

function cadente(x, y, chuva){
  const el = document.createElement('div');
  el.className = chuva ? 'cadente chuva' : 'cadente';
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

function estrelaCadente(){
  clearTimeout(G.timer);
  if(G.qualidade !== 'completo') return;
  cadente(Math.random() * innerWidth * 0.8, Math.random() * innerHeight * 0.45, false);
  G.timer = setTimeout(estrelaCadente, 5000 + Math.random() * 9000);
}

// Chuva de meteoros de vez em quando: 10 a 16 riscos em ~3 s, todos do mesmo ponto do céu
// (o "radiante"), como nas chuvas reais (Perseidas, Geminídeas).
function chuvaDeMeteoros(){
  clearTimeout(G.timerChuva);
  if(G.qualidade !== 'completo') return;
  if(!document.hidden && !semTamanho()){
    const n = 10 + Math.floor(Math.random() * 7);
    const rx = innerWidth * (0.55 + Math.random() * 0.4), ry = innerHeight * (0.02 + Math.random() * 0.12);
    for(let i = 0; i < n; i++){
      setTimeout(() => cadente(rx + (Math.random() - 0.5) * innerWidth * 0.5, ry + Math.random() * innerHeight * 0.3, true), i * 180 + Math.random() * 160);
    }
  }
  G.timerChuva = setTimeout(chuvaDeMeteoros, 45000 + Math.random() * 45000);
}

// Janela com tamanho zero (app aberto com a tela apagada/bloqueada, ou antes do Android
// terminar o layout): não desenha agora; o próximo 'resize' redesenha. Antes, o drawImage de
// um canvas 0×0 dava erro e derrubava o início do jogo (mapa vazio).
const semTamanho = () => !(innerWidth > 0 && innerHeight > 0);
function redimensionar(){
  if(semTamanho()) return;
  desenharEstrelas();
  const lado = Math.round(Math.max(innerWidth, innerHeight) * 1.05);
  if(!G.img || Math.abs(G.img.width - lado) > 40) G.img = gerarGalaxia(lado, G.cor);
  desenharGalaxia();
}

function iniciar(){
  if(G.img) desenharGalaxia();
  if(G.qualidade === 'completo'){
    clearTimeout(G.timer); G.timer = setTimeout(estrelaCadente, 3000);
    clearTimeout(G.timerChuva); G.timerChuva = setTimeout(chuvaDeMeteoros, 20000 + Math.random() * 15000);
  }
}

function tema(cor){
  if(cor === G.cor && G.img) return;
  G.cor = cor;
  if(semTamanho()) return;
  G.img = gerarGalaxia(Math.round(Math.max(innerWidth, innerHeight) * 1.05), cor);
  desenharGalaxia();
}

root.GalaxyFundo = { redimensionar, tema, chuvaDeMeteoros,
  set qualidade(q){ G.qualidade = q; iniciar(); }, get qualidade(){ return G.qualidade; } };
})(window);
