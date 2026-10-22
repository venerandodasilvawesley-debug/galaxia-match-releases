/* =========================================================
   GALÁXIA MATCH — TABULEIRO 2D (DOM)
   Planetas como <div><img> movidos por CSS transform. É o modo
   "efeitos leves" e a reserva quando o aparelho não tem WebGL.
   Mesma interface do tabuleiro 3D (render3d.js):
     montar(board, cel) · criar(p, r, c, {nasce, deR}) · mover(id, r, c)
     esconder(id) · estourar(id) · remover(id) · marcar(id, classe, on)
     poeira(r, c) · reposicionar(board) · celula(evento) · projetar(r, c)
     redimensionar(cel) · flash() · ativar() · pausar()
   ========================================================= */
(function(root){
'use strict';

function criarTab2D({ tabuleiro, sprite, rotacoes, tipoPeca }){
  const els = new Map();
  let cel = 48;
  const pos = (el, r, c) => { el.style.transform = `translate(${c * cel}px, ${r * cel}px)`; };

  const T = {
    nome: '2d',
    montar(board, novaCel){
      cel = novaCel;
      tabuleiro.classList.remove('modo3d');
      tabuleiro.querySelectorAll('.casa, .peca').forEach(e => e.remove());
      els.clear();
      for(let r = 0; r < 8; r++) for(let c = 0; c < 8; c++){
        const casa = document.createElement('div');
        casa.className = 'casa' + ((r + c) % 2 ? ' clara' : '') + (board.dust[r][c] ? ' poeira' : '');
        casa.id = `casa-${r}-${c}`;
        casa.style.transform = `translate(${c * cel}px, ${r * cel}px)`;
        tabuleiro.insertBefore(casa, tabuleiro.firstChild);
      }
      board.grid.forEach((row, r) => row.forEach((p, c) => T.criar(p, r, c)));
    },
    criar(p, r, c, { nasce = false, deR } = {}){
      const el = document.createElement('div'), tipo = tipoPeca(p);
      el.className = `peca ${tipo} ${p.special && p.special !== 'hole' ? p.special : ''} ${p.special === 'hole' ? 'hole' : ''} ${nasce ? 'nasce' : ''}`;
      el.dataset.id = p.id;
      el.innerHTML = `<img src="${sprite(tipo, 128, rotacoes[tipo] || 0)}" alt="">`;
      if(deR !== undefined){
        // nasce acima do tabuleiro e cai até a casa
        el.classList.add('sem-transicao'); pos(el, deR, c);
        tabuleiro.appendChild(el); void el.offsetWidth;
        el.classList.remove('sem-transicao');
        requestAnimationFrame(() => pos(el, r, c));
      } else { pos(el, r, c); tabuleiro.appendChild(el); }
      els.set(p.id, el);
    },
    mover(id, r, c){ const el = els.get(id); if(el) pos(el, r, c); },
    esconder(id){ const el = els.get(id); if(el) el.style.opacity = '0'; },
    estourar(id){ els.get(id)?.classList.add('estoura'); },
    remover(id){ els.get(id)?.remove(); els.delete(id); },
    marcar(id, classe, on){ els.get(id)?.classList.toggle(classe, on); },
    // Defesa da Terra: os meteoros (board.dust) mudam de casa a cada jogada
    sincronizarPoeira(board){
      for(let r = 0; r < 8; r++) for(let c = 0; c < 8; c++){
        const casa = document.getElementById(`casa-${r}-${c}`);
        if(!casa) continue;
        const tem = board.dust[r][c], tinha = casa.classList.contains('poeira') && !casa.classList.contains('limpa');
        if(tem && !tinha){ casa.classList.remove('limpa'); casa.classList.add('poeira', 'chega'); setTimeout(() => casa.classList.remove('chega'), 350); }
        else if(!tem && tinha) casa.classList.remove('poeira');
      }
    },
    poeira(r, c){
      const casa = document.getElementById(`casa-${r}-${c}`);
      if(!casa) return;
      casa.classList.add('limpa');
      setTimeout(() => casa.classList.remove('poeira', 'limpa'), 500);
    },
    reposicionar(board, novaCel){
      if(novaCel) cel = novaCel;
      board.grid.forEach((row, r) => row.forEach((p, c) => T.mover(p.id, r, c)));
      for(let r = 0; r < 8; r++) for(let c = 0; c < 8; c++){
        const casa = document.getElementById(`casa-${r}-${c}`);
        if(casa) casa.style.transform = `translate(${c * cel}px, ${r * cel}px)`;
      }
    },
    celula(e){
      const b = tabuleiro.getBoundingClientRect();
      return { r: Math.floor((e.clientY - b.top) / cel), c: Math.floor((e.clientX - b.left) / cel) };
    },
    projetar(r, c){ return { x:(c + 0.5) * cel, y:(r + 0.5) * cel }; },
    redimensionar(novaCel){ cel = novaCel; },
    flash(){}, ativar(){}, pausar(){},
    limpar(){ tabuleiro.querySelectorAll('.casa, .peca').forEach(e => e.remove()); els.clear(); },
  };
  return T;
}

root.criarTab2D = criarTab2D;
})(window);
