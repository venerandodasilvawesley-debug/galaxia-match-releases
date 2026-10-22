/* =========================================================
   GALÁXIA MATCH — NEVE (evento de Natal)
   Um canvas fixo por cima da tela inteira, sem receber toques,
   com flocos caindo e balançando com o "vento".
   Poucos flocos com movimento reduzido no sistema; pausa
   quando a aba fica escondida.
   ========================================================= */
(function(root){
'use strict';

const N = { flocos:[], ligada:false, canvas:null, ctx:null, w:0, h:0, dpr:1, ultimo:0, vento:0, sprite:null };
const aleat = (a, b) => a + Math.random() * (b - a);
const poucos = matchMedia('(prefers-reduced-motion: reduce)').matches;

// floco redondo e macio, desenhado uma vez e reaproveitado
function criarSprite(){
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(235,245,255,.85)');
  g.addColorStop(1, 'rgba(200,225,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 32, 32);
  return c;
}

function novoFloco(noTopo){
  const cristal = Math.random() < 0.12; // alguns flocos de seis pontas, maiores
  return {
    x: aleat(0, N.w), y: noTopo ? aleat(-40, -8) : aleat(0, N.h),
    r: cristal ? aleat(5, 8) : aleat(1.2, 3.6),
    vy: aleat(22, 58), fase: aleat(0, 6.28), amp: aleat(8, 26), freq: aleat(0.4, 1.1),
    giro: aleat(-1, 1), ang: aleat(0, 6.28), alfa: aleat(0.55, 1), cristal
  };
}

function dimensionar(){
  N.dpr = Math.min(2, devicePixelRatio || 1);
  N.w = innerWidth; N.h = innerHeight;
  N.canvas.width = Math.round(N.w * N.dpr); N.canvas.height = Math.round(N.h * N.dpr);
  N.ctx.setTransform(N.dpr, 0, 0, N.dpr, 0, 0);
  const fator = root.Desempenho ? Desempenho.fatorParticulas : 1;
  const alvo = Math.round(Math.min(poucos ? 35 : 110, N.w * N.h / (poucos ? 22000 : 7000)) * fator);
  while(N.flocos.length < alvo) N.flocos.push(novoFloco(false));
  N.flocos.length = alvo;
}

function cristal(x, f){
  x.save(); x.translate(f.x, f.y); x.rotate(f.ang);
  x.strokeStyle = `rgba(235,245,255,${f.alfa})`; x.lineWidth = 1.2; x.lineCap = 'round';
  x.beginPath();
  for(let i = 0; i < 6; i++){
    x.rotate(Math.PI / 3);
    x.moveTo(0, 0); x.lineTo(0, -f.r);
    x.moveTo(0, -f.r * 0.55); x.lineTo(f.r * 0.28, -f.r * 0.78);
    x.moveTo(0, -f.r * 0.55); x.lineTo(-f.r * 0.28, -f.r * 0.78);
  }
  x.stroke(); x.restore();
}

function quadro(agora){
  if(!N.ligada) return;
  requestAnimationFrame(quadro);
  // dt sempre entre 0 e 50 ms (o relógio do quadro pode voltar no Android)
  const dt = Math.min(0.05, Math.max(0, (agora - N.ultimo) / 1000)); N.ultimo = agora;
  if(document.hidden) return;
  const x = N.ctx, t = agora / 1000;
  N.vento = Math.sin(t * 0.13) * 14 + Math.sin(t * 0.47) * 6; // rajadas suaves
  x.clearRect(0, 0, N.w, N.h);
  for(const f of N.flocos){
    f.y += f.vy * dt;
    f.x += (N.vento + Math.cos(t * f.freq + f.fase) * f.amp * 0.6) * dt;
    f.ang += f.giro * dt;
    if(f.y > N.h + 12) Object.assign(f, novoFloco(true));
    if(f.x < -12) f.x += N.w + 24; else if(f.x > N.w + 12) f.x -= N.w + 24;
    if(f.cristal){ cristal(x, f); continue; }
    x.globalAlpha = f.alfa;
    const d = f.r * 2.4;
    x.drawImage(N.sprite, f.x - d / 2, f.y - d / 2, d, d);
  }
  x.globalAlpha = 1;
}

function ligar(sim){
  if(sim === N.ligada) return;
  N.ligada = sim;
  if(!N.canvas){
    N.canvas = document.createElement('canvas');
    N.canvas.className = 'neve';
    N.canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(N.canvas);
    N.ctx = N.canvas.getContext('2d');
    N.sprite = criarSprite();
    addEventListener('resize', () => { if(N.ligada) dimensionar(); });
  }
  N.canvas.hidden = !sim;
  if(sim){ dimensionar(); N.ultimo = performance.now(); requestAnimationFrame(quadro); }
}

root.Neve = { ligar, get ligada(){ return N.ligada; } };
// evento de Natal: a neve começa ligada
if(document.readyState === 'loading') addEventListener('DOMContentLoaded', () => ligar(true)); else ligar(true);
})(window);
