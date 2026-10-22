/* =========================================================
   GALÁXIA MATCH — EFEITOS (explosões e especiais)
   Um canvas por cima do tabuleiro, com margem para os
   estilhaços voarem para fora. Partículas com física simples,
   desenhadas com mistura aditiva para o brilho.
   Qualidade 'leve': menos partículas e sem estilhaços.
   ========================================================= */
(function(root){
'use strict';

const COR = { marte:'#ff7a45', jupiter:'#f2c08a', saturno:'#ffe08a', terra:'#5cc4ff', netuno:'#7d9cff', lua:'#e6e6e6', buraco:'#c48bff' };
const FX = { parts:[], rodando:false, cel:48, margem:72, qualidade:'completo', imgs:{}, canvas:null, ctx:null, dpr:1 };

const aleat = (a, b) => a + Math.random() * (b - a);
const easeIn = t => t * t * t;
const easeOut = t => 1 - Math.pow(1 - t, 3);

function init(tabuleiro, spriteFn, rotacoes){
  FX.sprite = spriteFn; FX.rot = rotacoes;
  FX.canvas = document.createElement('canvas');
  FX.canvas.className = 'fx-canvas';
  tabuleiro.appendChild(FX.canvas);
  FX.ctx = FX.canvas.getContext('2d');
}

function dimensionar(cel){
  FX.cel = cel; FX.margem = Math.round(cel * 1.6);
  FX.dpr = Math.min(2, devicePixelRatio || 1);
  const lado = cel * 8 + FX.margem * 2;
  Object.assign(FX.canvas.style, { left:`${-FX.margem}px`, top:`${-FX.margem}px`, width:`${lado}px`, height:`${lado}px` });
  FX.canvas.width = lado * FX.dpr; FX.canvas.height = lado * FX.dpr;
}

// Ponto de luz pré-desenhado por cor (shadowBlur por partícula é caro demais).
const brilhos = {};
function brilho(cor){
  if(!brilhos[cor]){
    const cv = document.createElement('canvas'); cv.width = cv.height = 32;
    const ctx = cv.getContext('2d'), g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, cor); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32);
    brilhos[cor] = cv;
  }
  return brilhos[cor];
}

function imagem(tipo){
  if(!FX.imgs[tipo]){ const i = new Image(); i.src = FX.sprite(tipo, 128, FX.rot[tipo] || 0); FX.imgs[tipo] = i; }
  return FX.imgs[tipo];
}
function preCarregar(tipos){ tipos.forEach(imagem); }
function recarregar(tipos){ FX.imgs = {}; preCarregar(tipos); }

// centro de uma casa nas coordenadas do canvas (no 3D, FX.projetar vem da câmera)
const centro = (r, c) => {
  if(FX.projetar){ const p = FX.projetar(r, c); return { x: FX.margem + p.x, y: FX.margem + p.y }; }
  return { x: FX.margem + (c + 0.5) * FX.cel, y: FX.margem + (r + 0.5) * FX.cel };
};
const leve = () => FX.qualidade === 'leve';

function add(p){ p.t = 0; FX.parts.push(p); if(!FX.rodando){ FX.rodando = true; FX.ultimo = performance.now(); requestAnimationFrame(quadro); } }

// ---------- primitivas ----------
function faiscas(x, y, cor, n, vel = 1, vida = 0.6){
  for(let i = 0; i < n; i++){
    const a = Math.random() * Math.PI * 2, v = aleat(0.6, 2.4) * FX.cel * vel;
    add({ tipo:'faisca', x, y, vx:Math.cos(a) * v, vy:Math.sin(a) * v, vida:aleat(0.6, 1) * vida, r:aleat(1.2, 3) * FX.cel / 48, cor });
  }
}
function clarao(x, y, raio, cor = '#ffffff', vida = 0.25){ add({ tipo:'clarao', x, y, raio, cor, vida }); }
function onda(x, y, raio, cor = '#ffd27a', vida = 0.45, largura = 4){ add({ tipo:'onda', x, y, raio, cor, vida, largura }); }

// Estilhaços: fatias da textura do planeta voando e girando.
function estilhacos(tipo, x, y){
  const img = imagem(tipo), n = 6, s = FX.cel, R = s * 0.46;
  let a0 = Math.random() * Math.PI * 2;
  for(let i = 0; i < n; i++){
    const a1 = a0 + (Math.PI * 2 / n) * aleat(0.8, 1.2);
    const pts = [[0, 0]];
    for(let k = 0; k <= 3; k++){ const a = a0 + (a1 - a0) * k / 3; const rr = R * aleat(0.85, 1.05); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
    const am = (a0 + a1) / 2, v = aleat(1.6, 3.4) * s;
    add({ tipo:'estilhaco', img, pts, x, y, dx:0, dy:0, vx:Math.cos(am) * v, vy:Math.sin(am) * v - s * 0.6, rot:0, vr:aleat(-7, 7), vida:aleat(0.55, 0.8), s });
    a0 = a1;
  }
}

// ---------- efeitos de jogo ----------
function explodir(tipo, r, c, forca = 1){
  const { x, y } = centro(r, c), cor = COR[tipo] || '#fff';
  if(!leve()) estilhacos(tipo, x, y);
  faiscas(x, y, cor, leve() ? 4 : Math.round(9 * forca));
  clarao(x, y, FX.cel * 0.7 * forca, cor, 0.18);
  if(!leve()) onda(x, y, FX.cel * 0.75, cor, 0.35, 2);
}

function cometa(r, c, dir){
  // de uma casa fora do tabuleiro à outra, seguindo a linha/coluna (também no 3D inclinado)
  const ini = dir === 'h' ? centro(r, -1) : centro(-1, c);
  const fim = dir === 'h' ? centro(r, 8) : centro(8, c);
  add({ tipo:'cometa', ini, fim, vida:0.38, rastro:[] });
}

// Meteoro do poder: cai em diagonal do alto até a casa escolhida.
function meteoro(r, c){
  const fim = centro(r, c), ini = { x: fim.x + FX.cel * 2.5, y: fim.y - FX.cel * 5 };
  add({ tipo:'cometa', ini, fim, vida:0.32, rastro:[], cor:'#ffb36b' });
}

function supernova(r, c, grande){
  const { x, y } = centro(r, c);
  add({ tipo:'estrela', x, y, vida:0.18, raio:FX.cel * (grande ? 1.4 : 0.9) });
  setTimeout(() => {
    clarao(x, y, FX.cel * (grande ? 4 : 2.6), '#fff6d6', 0.35);
    onda(x, y, FX.cel * (grande ? 3.4 : 2.1), '#ffcf6b', 0.55, 6);
    onda(x, y, FX.cel * (grande ? 2.4 : 1.4), '#ff7a2e', 0.45, 3);
    faiscas(x, y, '#ffd27a', leve() ? 12 : 40, grande ? 2 : 1.4, 0.8);
    faiscas(x, y, '#ffffff', leve() ? 4 : 14, 1, 0.5);
  }, 170);
}

// Buraco negro: cada planeta é puxado em espiral até o centro, esticando.
function buracoNegro(r, c, pecas){
  const alvo = centro(r, c);
  add({ tipo:'disco', x:alvo.x, y:alvo.y, vida:0.85, img:imagem('buraco') });
  for(const p of pecas){
    const o = centro(p.r, p.c);
    if(leve()){ faiscas(o.x, o.y, COR[p.tipo], 3); continue; }
    const dx = o.x - alvo.x, dy = o.y - alvo.y;
    add({ tipo:'espiral', img:imagem(p.tipo), cx:alvo.x, cy:alvo.y, raio0:Math.hypot(dx, dy), ang0:Math.atan2(dy, dx), vida:aleat(0.55, 0.75), s:FX.cel });
  }
  setTimeout(() => { clarao(alvo.x, alvo.y, FX.cel * 1.6, '#c48bff', 0.3); faiscas(alvo.x, alvo.y, '#d9b3ff', leve() ? 6 : 20, 1.2); }, 620);
}

// Big Bang: tudo é engolido no centro e explode em luz.
function bigBang(pecas){
  const meio = centro(3.5, 3.5), cx = meio.x, cy = meio.y;
  for(const p of pecas){
    if(leve()) continue;
    const o = centro(p.r, p.c), dx = o.x - cx, dy = o.y - cy;
    add({ tipo:'espiral', img:imagem(p.tipo), cx, cy, raio0:Math.hypot(dx, dy), ang0:Math.atan2(dy, dx), vida:aleat(0.55, 0.8), s:FX.cel });
  }
  setTimeout(() => {
    clarao(cx, cy, FX.cel * 9, '#ffffff', 0.6);
    onda(cx, cy, FX.cel * 6, '#ffffff', 0.7, 8);
    onda(cx, cy, FX.cel * 4.5, '#9fd4ff', 0.6, 4);
    for(const cor of ['#ffd27a', '#9fd4ff', '#ff8ad8', '#ffffff']) faiscas(cx, cy, cor, leve() ? 10 : 35, 3, 1);
  }, 700);
}

// ---------- laço de animação ----------
function quadro(agora){
  // O carimbo do requestAnimationFrame pode ser ANTERIOR ao performance.now()
  // gravado em add() (no Android acontece): sem o max(0), o dt fica negativo,
  // os raios ficam negativos, o canvas lança erro e o laço morre.
  const dt = Math.max(0, Math.min(0.1, (agora - FX.ultimo) / 1000)); // teto de 0,1 s: em aparelho lento pula quadros em vez de ficar em câmera lenta
  FX.ultimo = Math.max(FX.ultimo, agora);
  const ctx = FX.ctx, d = FX.dpr;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  ctx.clearRect(0, 0, FX.canvas.width / d, FX.canvas.height / d);
  FX.parts = FX.parts.filter(p => (p.t += dt) < p.vida);
  for(const p of FX.parts){
    // um efeito com erro é descartado; nunca derruba o laço inteiro
    try { desenhar(ctx, p, dt, Math.min(1, Math.max(0, p.t / p.vida))); }
    catch(e){ p.vida = 0; ctx.restore(); console.warn('efeito descartado', p.tipo, e); }
  }
  if(FX.parts.length) requestAnimationFrame(quadro);
  else { FX.rodando = false; ctx.clearRect(0, 0, FX.canvas.width, FX.canvas.height); }
}

function desenhar(ctx, p, dt, k){
  ctx.save();
  switch(p.tipo){
    case 'faisca': {
      p.vx *= 0.94; p.vy = p.vy * 0.94 + FX.cel * 2 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1 - k;
      const t = p.r * 4 * (1 - k * 0.6);
      ctx.drawImage(brilho(p.cor), p.x - t / 2, p.y - t / 2, t, t);
      break;
    }
    case 'clarao': {
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(0.1, p.raio * (0.6 + k * 0.6)));
      g.addColorStop(0, p.cor); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 1 - k; ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.raio * 1.2, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'onda': {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (1 - k) * 0.9; ctx.strokeStyle = p.cor; ctx.lineWidth = p.largura * (1 - k) + 0.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.1, p.raio * easeOut(k)), 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha *= 0.35; ctx.lineWidth *= 3;                  // halo sem shadowBlur
      ctx.stroke();
      break;
    }
    case 'estilhaco': {
      p.vy += FX.cel * 5 * dt; p.dx += p.vx * dt; p.dy += p.vy * dt; p.rot += p.vr * dt;
      ctx.globalAlpha = 1 - easeIn(k);
      ctx.translate(p.x + p.dx, p.y + p.dy); ctx.rotate(p.rot); ctx.scale(1 - k * 0.3, 1 - k * 0.3);
      ctx.beginPath(); p.pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
      ctx.clip();
      ctx.drawImage(p.img, -p.s / 2, -p.s / 2, p.s, p.s);
      // borda incandescente da rachadura
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,190,120,.8)'; ctx.lineWidth = 2; ctx.stroke();
      break;
    }
    case 'cometa': {
      const e = easeOut(Math.min(1, k * 1.15));
      const x = p.ini.x + (p.fim.x - p.ini.x) * e, y = p.ini.y + (p.fim.y - p.ini.y) * e;
      p.rastro.push([x, y]); if(p.rastro.length > 14) p.rastro.shift();
      ctx.globalCompositeOperation = 'lighter';
      p.rastro.forEach(([rx, ry], i) => {
        const f = i / p.rastro.length;
        ctx.globalAlpha = f * 0.7; ctx.fillStyle = i % 2 ? '#9fd4ff' : '#ffffff';
        ctx.beginPath(); ctx.arc(rx, ry, Math.max(0.1, FX.cel * 0.22 * f), 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      const t = FX.cel * 1.4;
      ctx.drawImage(brilho('#bfe4ff'), x - t / 2, y - t / 2, t, t);
      if(Math.random() < 0.6) faiscas(x, y, '#bfe4ff', 1, 0.5, 0.4);
      break;
    }
    case 'estrela': {
      ctx.globalCompositeOperation = 'lighter';
      const r = Math.max(2, p.raio * easeIn(k) + 2);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#fff1b0'); g.addColorStop(1, 'rgba(255,140,40,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'disco': {
      const s = FX.cel * 2.2 * (k < 0.2 ? easeOut(k / 0.2) : k > 0.8 ? 1 - easeIn((k - 0.8) / 0.2) : 1);
      ctx.translate(p.x, p.y); ctx.rotate(k * 9);
      ctx.drawImage(p.img, -s / 2, -s / 2, s, s);
      break;
    }
    case 'espiral': {
      const e = easeIn(k), raio = Math.max(0, p.raio0 * (1 - e)), ang = p.ang0 + e * 5.5;
      const x = p.cx + Math.cos(ang) * raio, y = p.cy + Math.sin(ang) * raio;
      ctx.globalAlpha = 1 - easeIn(Math.max(0, (k - 0.75) / 0.25));
      // "espaguetificação": estica na direção do centro conforme se aproxima
      ctx.translate(x, y); ctx.rotate(ang);
      ctx.scale(1 + e * 1.6, Math.max(0.15, 1 - e * 0.85));
      ctx.drawImage(p.img, -p.s / 2, -p.s / 2, p.s, p.s);
      break;
    }
  }
  ctx.restore();
}

root.GalaxyFX = { init, dimensionar, preCarregar, recarregar, meteoro,
  set projetar(f){ FX.projetar = f; }, explodir, cometa, supernova, buracoNegro, bigBang,
  set qualidade(q){ FX.qualidade = q; }, get qualidade(){ return FX.qualidade; }, get ativos(){ return FX.parts.length; } };
})(window);
