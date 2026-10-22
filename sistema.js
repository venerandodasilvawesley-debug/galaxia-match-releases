/* =========================================================
   GALÁXIA MATCH — MAPA EM SISTEMA SOLAR
   O Sol no centro e os mundos da viagem girando em órbitas
   (vistas inclinadas, como um disco). Velocidades na proporção
   das reais, comprimidas (Mercúrio rápido, Netuno lento). Tocar
   num planeta chama aoTocar(w) — o mapa rola até o mundo dele.
   Mundo bloqueado: apagado e com 🔒; o mundo atual pulsa.
   Pausa fora do mapa, com a aba escondida e, com movimento
   reduzido no sistema, fica parado.
   ========================================================= */
(function(root){
'use strict';

// período orbital real em anos terrestres (o Sol não orbita)
const PERIODO = { mercurio:0.24, venus:0.62, terra:1, marte:1.88, jupiter:11.9, saturno:29.5, urano:84, netuno:165, plutao:248 };
// tamanho do planeta no desenho (fora de escala: Júpiter grande, Mercúrio pequeno, mas todos tocáveis)
const TAM = { mercurio:0.7, venus:0.85, terra:0.9, marte:0.78, jupiter:1.35, saturno:1.5, urano:1.05, netuno:1.0, plutao:0.62 };
const poucoMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;

function criar(container, { mundos, sprite, aoTocar }){
  const S = { ativo:true, ultimo:0, t:Math.random() * 1000, pecas:[], raf:0 };
  container.classList.add('sistema-solar');
  // o Sol também é um mundo (o último da viagem): fica no centro e também se toca
  const wSol = mundos.findIndex(m => m.id === 'sol');
  container.innerHTML = `<svg class="orbitas" aria-hidden="true"></svg><button type="button" class="sol-centro" data-mundo="${wSol}"><span class="cadeado">🔒</span></button>`;
  const svg = container.querySelector('svg'), solEl = container.querySelector('.sol-centro');
  solEl.onclick = () => aoTocar(wSol);
  const planetas = mundos.map((m, w) => ({ m, w })).filter(p => p.m.id !== 'sol' && !p.m.evento);

  // monta um botão por planeta (as órbitas vão de dentro para fora, na ordem da viagem)
  planetas.forEach((p, k) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'planeta-orbita'; b.dataset.mundo = p.w;
    b.innerHTML = `<img alt=""><span class="cadeado">🔒</span><small>${p.m.nome}</small>`;
    b.onclick = () => aoTocar(p.w);
    container.appendChild(b);
    S.pecas.push({ ...p, el:b, img:b.querySelector('img'), k, ang:(k * 2.399) % (Math.PI * 2),   // ângulo de ouro: espalha
      vel:(Math.PI * 2 / 9) / Math.pow(PERIODO[p.m.id] || 1, 0.42) });
  });

  function medidas(){
    const w = container.clientWidth, h = container.clientHeight;
    return { w, h, cx:w / 2, cy:h / 2, rx0:w * 0.13, rx1:w * 0.47, achata:0.42 };
  }
  // raio de cada órbita: espaçamento que cresce devagar (as de fora ficam um pouco mais separadas)
  const raio = (k, M) => M.rx0 + (M.rx1 - M.rx0) * Math.pow(k / Math.max(1, S.pecas.length - 1), 0.9);

  function desenharOrbitas(){
    const M = medidas();
    svg.setAttribute('viewBox', `0 0 ${M.w} ${M.h}`);
    svg.innerHTML = S.pecas.map(p => { const r = raio(p.k, M);
      return `<ellipse cx="${M.cx}" cy="${M.cy}" rx="${r}" ry="${r * M.achata}" class="${p.liberado ? 'aberta' : ''}"/>`; }).join('');
    const ts = Math.max(34, M.w * 0.15);
    Object.assign(solEl.style, { width:ts + 'px', height:ts + 'px', left:(M.cx - ts / 2) + 'px', top:(M.cy - ts / 2) + 'px' });
  }

  function posicionar(){
    const M = medidas(), base = Math.max(26, M.w * 0.085);
    for(const p of S.pecas){
      const r = raio(p.k, M), x = M.cx + Math.cos(p.ang) * r, y = M.cy + Math.sin(p.ang) * r * M.achata;
      // atrás do Sol (metade de cima da elipse) fica um pouco menor e mais escuro: dá a ideia de disco inclinado
      const frente = Math.sin(p.ang), esc = 0.86 + 0.14 * (frente + 1) / 2, tam = base * (TAM[p.m.id] || 1) * esc;
      p.el.style.width = p.el.style.height = tam + 'px';
      p.el.style.transform = `translate(${x - tam / 2}px, ${y - tam / 2}px)`;
      p.el.style.zIndex = frente > 0 ? 3 : 1;
      p.el.style.filter = p.liberado ? `brightness(${0.75 + 0.25 * (frente + 1) / 2})` : '';
    }
  }

  function quadro(agora){
    S.raf = 0;
    if(!S.ativo || document.hidden) return;
    const dt = Math.min(0.1, Math.max(0, (agora - (S.ultimo || agora)) / 1000)); S.ultimo = agora;
    for(const p of S.pecas) p.ang += p.vel * dt;
    posicionar();
    S.raf = requestAnimationFrame(quadro);
  }

  const api = {
    // estado de cada mundo (liberado, atual) e fotos — chamado a cada renderMapa
    atualizar({ liberado, atual }){
      for(const p of S.pecas){
        p.liberado = liberado(p.w);
        p.el.classList.toggle('bloqueado', !p.liberado);
        p.el.classList.toggle('atual', p.w === atual);
        p.el.setAttribute('aria-label', `${p.m.nome}${p.liberado ? '' : ' (bloqueado)'}`);
        const src = sprite(p.m.foto || p.m.id, 96);
        if(p.img.getAttribute('src') !== src) p.img.src = src;
      }
      solEl.style.backgroundImage = `url("${sprite('sol', 160)}")`;
      const solOk = liberado(wSol); solEl.classList.toggle('bloqueado', !solOk); solEl.classList.toggle('atual', wSol === atual);
      solEl.setAttribute('aria-label', `Sol${solOk ? '' : ' (bloqueado)'}`);
      desenharOrbitas(); posicionar();
    },
    retomar(){ S.ativo = true; if(!S.raf && !poucoMovimento){ S.ultimo = 0; S.raf = requestAnimationFrame(quadro); } },
    pausar(){ S.ativo = false; if(S.raf){ cancelAnimationFrame(S.raf); S.raf = 0; } },
    redimensionar(){ desenharOrbitas(); posicionar(); },
    get angulos(){ return S.pecas.map(p => p.ang); },
    get planetas(){ return S.pecas.map(p => p.m.id); },
  };
  addEventListener('visibilitychange', () => { if(!document.hidden && S.ativo) api.retomar(); });
  return api;
}

root.GalaxySistema = { criar, PERIODO };
})(window);
