/* =========================================================
   GALÁXIA MATCH — JOGO (telas, tabuleiro, animações)
   ========================================================= */
'use strict';
const { Board, ROWS, COLS } = GalaxyEngine;
const { PECAS, MUNDOS, FASES, FICHAS, NATAL } = GalaxyConteudo;
const Natal = GalaxyNatal, Defesa = GalaxyDefesa;
// As 50 fases da viagem (FASES) + as do evento de Natal (Polo Norte), que continuam a numeração.
// Contagens da viagem (estrelas do mapa, álbum "x de 50", conquistas) usam só as BASE primeiras.
const TODAS = FASES.concat(NATAL.fases), TODOS_MUNDOS = MUNDOS.concat([NATAL.mundo]), BASE = FASES.length;
const ehNatal = i => i >= BASE;
const fotoDe = m => m.foto || m.id;   // o Polo Norte usa a foto da Terra
const R = GalaxyRegras, Sons = GalaxySons, Musica = GalaxyMusica, vibrar = GalaxyVibrar;
const VERSAO_APP = '1.10.1';
const FX = GalaxyFX, Fundo = GalaxyFundo;
// Fotos dos planetas: as renderizadas em 3D com textura real (quando prontas);
// até lá, ou sem WebGL, as procedurais de planetas.js.
const spritesReais = {};
const sprite = (tipo, tam, rot) => spritesReais[tipo] || GalaxyPlanetas.sprite(tipo, tam, rot);
// no evento de Natal: fotos dos planetas com gorro 3D (mapa e álbum); sem WebGL fica o gorro de CSS
const spritesGorro = {};
const fotoMundo = (m, tam) => (Natal.ativo() && spritesGorro[fotoDe(m)]) || sprite(fotoDe(m), tam, 0.7);

const COR_LUZ = { marte:'#ff7a45', jupiter:'#ffc890', saturno:'#ffe08a', terra:'#7fc8ff', netuno:'#8aa8ff', lua:'#ffffff' };
const ROTACAO = { marte:0.4, jupiter:1.1, saturno:0.3, terra:2.2, netuno:0.9, lua:1.7 }; // cada peça mostra um "lado"
const espera = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

// ---------- progresso salvo no aparelho ----------
const CHAVE = 'galaxia-match-v1';
function carregar(){
  // efeitos 'leve' por padrão para quem pediu menos movimento no sistema
  const base = { estrelas:{}, cartas:[], som:true, musica:true, vibrar:true, efeitos: matchMedia('(prefers-reduced-motion: reduce)').matches || Desempenho.nivel === 'baixo' ? 'leve' : 'completo',
    poderes:{ meteoro:1, foguete:1, gravidade:1, jogadas:1 },   // começa com 1 de cada
    tutorial:false, dicas:[], conquistas:[], stats:{}, natal:{ ano:0, portas:[], carta:false }, defesa:{ vitorias:0, partidas:0, melhor:0 } };
  try {
    const s = Object.assign(base, JSON.parse(localStorage.getItem(CHAVE)) || {});
    s.poderes = Object.assign({ meteoro:1, foguete:1, gravidade:1, jogadas:1 }, s.poderes);
    validar(s);
    // quem já jogava antes do tutorial existir não precisa dele
    if(s.tutorial === false && Object.keys(s.estrelas).length) s.tutorial = true;
    return s;
  } catch { return base; }
}
// O progresso vai para o HTML (mapa, álbum): só aceita números e ids conhecidos,
// para um valor estranho no armazenamento não virar código na página.
function validar(s){
  const inteiro = (v, max) => Math.max(0, Math.min(max, Math.floor(Number(v)) || 0));
  const fase = k => /^\d+$/.test(k) && Number(k) < TODAS.length;
  s.estrelas = Object.fromEntries(Object.entries(Object(s.estrelas)).filter(([k]) => fase(k)).map(([k, v]) => [k, inteiro(v, 3)]));
  s.cartas = [...new Set((Array.isArray(s.cartas) ? s.cartas : []).map(Number).filter(n => Number.isInteger(n) && n >= 0 && n < TODAS.length))];
  for(const k of ['meteoro', 'foguete', 'gravidade', 'jogadas']) s.poderes[k] = inteiro(s.poderes[k], 999);
  for(const k of Object.keys(s.poderes)) if(!['meteoro', 'foguete', 'gravidade', 'jogadas'].includes(k)) delete s.poderes[k];
  s.stats = Object.fromEntries(Object.entries(Object(s.stats)).map(([k, v]) => [k, inteiro(v, 1e9)]));
  s.conquistas = (Array.isArray(s.conquistas) ? s.conquistas : []).filter(id => typeof id === 'string' && /^[a-z]+$/.test(id));
  s.dicas = (Array.isArray(s.dicas) ? s.dicas : []).filter(id => typeof id === 'string' && /^[a-z]+$/.test(id));
  for(const k of ['som', 'musica', 'vibrar', 'tutorial']) s[k] = !!s[k];
  if(s.efeitos !== 'leve') s.efeitos = 'completo';
  if(typeof s.convite !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.convite)) delete s.convite;
  const df = Object(s.defesa);
  s.defesa = { vitorias:inteiro(df.vitorias, 1e6), partidas:inteiro(df.partidas, 1e6), melhor:inteiro(df.melhor, 99) };
  const n = Object(s.natal);
  s.natal = { ano:inteiro(n.ano, 9999), carta:!!n.carta,
    portas:[...new Set((Array.isArray(n.portas) ? n.portas : []).map(Number).filter(d => Number.isInteger(d) && d >= 1 && d <= Natal.ULTIMA_PORTA))] };
}
let salvo = carregar();
function gravar(){ try { localStorage.setItem(CHAVE, JSON.stringify(salvo)); } catch { /* aba privada: segue sem salvar */ } }
Sons.ligado = salvo.som;
vibrar.ligado = salvo.vibrar;
// o navegador só libera áudio depois de um toque: a música começa no primeiro
addEventListener('pointerdown', () => { Musica.ligada = salvo.musica; }, { once:true, capture:true });
FX.qualidade = salvo.efeitos;
Fundo.qualidade = salvo.efeitos;

// Polo Norte: só durante o evento; a 1ª fase dele fica aberta para todos, as outras em sequência
const liberada = i => ehNatal(i) ? Natal.ativo() && (i === BASE || (salvo.estrelas[i - 1] || 0) > 0)
  : i === 0 || (salvo.estrelas[i - 1] || 0) > 0;
const totalEstrelas = () => Object.entries(salvo.estrelas).reduce((a, [k, v]) => a + (Number(k) < BASE ? v : 0), 0);
const cartaDaFase = i => TODOS_MUNDOS[Math.floor(i / 5)].cartas[i % 5];

// Avisos em fila: um de cada vez (prêmio, conquista e dica podem chegar juntos).
const filaToast = [];
function toast(msg){
  if(filaToast.length < 5) filaToast.push(msg);
  if(!toast.ativo) proximoToast();
}
function proximoToast(){
  const t = document.getElementById('toast'), msg = filaToast.shift();
  if(msg === undefined){ toast.ativo = false; t.classList.remove('on'); return; }
  toast.ativo = true; t.textContent = msg; t.classList.add('on');
  setTimeout(proximoToast, 2400);
}

function aplicarTema(w){
  const m = TODOS_MUNDOS[w];
  Fundo.tema(m.cor);
  document.documentElement.style.setProperty('--tema', m.cor);
  document.documentElement.style.setProperty('--tema-fundo', m.fundo);
}

// ---------- telas ----------
function mostrarTela(nome){
  if(nome !== 'fase' && T) T.pausar();   // 3D parado fora do jogo: poupa bateria
  if(nome !== 'fase'){ descartarPlaneta(); fecharBalao(); document.body.classList.remove('fase-gelo'); }
  if(nome !== 'mapa' && Sistema) Sistema.pausar();          // órbitas só giram com o mapa na tela
  document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
  document.getElementById('tela-' + nome).classList.add('ativa');
  scrollTo({ top:0 });
  if(nome === 'mapa') renderMapa();
  if(nome === 'album') renderAlbum();
  // fora do mapa, deixa uma entrada no histórico: o botão "voltar" do Android (e do navegador)
  // volta para o mapa em vez de fechar o app
  try { if(nome !== 'mapa' && !(history.state && history.state.galaxia)) history.pushState({ galaxia:nome }, ''); } catch(e){}
}

addEventListener('popstate', () => {
  const camada = document.querySelector('.carta-camada');
  const ativa = (document.querySelector('.tela.ativa') || {}).id;
  const reempilhar = () => { try { history.pushState({ galaxia:'volta' }, ''); } catch(e){} };
  if(camada){ camada.querySelector('.acoes .btn')?.click(); reempilhar(); return; }   // fecha a carta aberta
  if(!document.getElementById('modal').hidden && ativa !== 'tela-fase'){ fecharModal(); reempilhar(); return; }
  if(ativa === 'tela-fase'){
    // no meio da fase pergunta antes; nas janelas de fim de fase, volta direto ao mapa
    if(F && !F.ocupado && document.getElementById('modal').hidden){ sairDaFase(); reempilhar(); return; }
    if(!document.getElementById('modal').hidden){ fecharModal(); limparDica(); F = null; mostrarTela('mapa'); return; }
    reempilhar(); return;
  }
  if(ativa === 'tela-album'){ mostrarTela('mapa'); return; }
});

function renderMapa(){
  document.getElementById('total-estrelas').textContent = `★ ${totalEstrelas()}/${BASE * 3}`;
  document.getElementById('btn-som').textContent = salvo.som || salvo.musica ? '🔊' : '🔇';
  const natal = Natal.ativo();
  document.body.classList.toggle('natal', natal);
  let atual = null;
  // no evento, o Polo Norte vem primeiro (logo abaixo do aviso do evento)
  const ordem = natal ? [MUNDOS.length, ...MUNDOS.keys()] : [...MUNDOS.keys()];
  const bd = document.getElementById('btn-defesa');
  if(bd){ const ok = liberada(10); bd.disabled = !ok;
    bd.innerHTML = ok ? `☄️ Defesa da Terra${salvo.defesa.vitorias ? ` <small>· ${salvo.defesa.vitorias} vitória${salvo.defesa.vitorias > 1 ? 's' : ''}</small>` : ''}` : '🔒 Defesa da Terra <small>· chegue à Terra</small>'; }
  document.getElementById('mundos').innerHTML = (natal ? bannerNatal() : '') + ordem.map(w => {
    const m = TODOS_MUNDOS[w];
    const nos = [0, 1, 2, 3, 4].map(f => {
      const i = w * 5 + f, ok = liberada(i), est = salvo.estrelas[i] || 0;
      // "atual" (pulsando, e o mundo para onde o mapa rola) é o da viagem; no Polo Norte marca a próxima fase dele
      const eAtual = ok && !est && (m.evento ? !TODAS.slice(BASE, i).some((_, k) => !(salvo.estrelas[BASE + k] > 0)) : atual === null);
      if(eAtual && !m.evento) atual = w;
      return `<button type="button" class="no ${ok ? 'liberado' : ''} ${f === 4 ? 'chefe' : ''} ${eAtual ? 'atual' : ''}" ${ok ? '' : 'disabled'}
        onclick="abrirFase(${i})" aria-label="${m.nome} fase ${f + 1}${est ? `, ${est} estrelas` : ''}">
        ${f === 4 ? '👑' : f + 1}<span class="est">${est ? '★'.repeat(est) : ''}</span></button>`;
    }).join('');
    return `<section class="mundo ${liberada(w * 5) ? '' : 'bloqueado'} ${m.evento ? 'mundo-natal' : ''}" id="mundo-${w}" style="--tema-mundo:${m.cor}">
      <div class="mundo-cab"><span class="foto-mundo"><img src="${fotoMundo(m, 172)}" alt=""></span>
        <div><h2>${m.nome}</h2><p>${m.intro}</p></div></div>
      <div class="fases">${nos}</div></section>`;
  }).join('');
  if(atual !== null) aplicarTema(atual);
  if(atual > 0) requestAnimationFrame(() => document.getElementById('mundo-' + atual).scrollIntoView({ block:'center' }));
  else if(natal) aplicarTema(MUNDOS.length);
  if(Sistema){ Sistema.atualizar({ liberado:w => liberada(w * 5), atual:atual === null ? MUNDOS.length - 1 : atual }); Sistema.retomar(); }
}

// ---------- mapa em Sistema Solar ----------
// Tocar num planeta rola até o mundo dele na lista; bloqueado avisa qual mundo vencer antes.
let Sistema = null;
function tocarPlaneta(w){
  if(!liberada(w * 5)){
    Sons.invalida(); vibrar(30);
    const antes = MUNDOS[w - 1];
    toast(`🔒 ${MUNDOS[w].nome}: vença o chefe de ${antes ? antes.nome : 'antes'} para liberar`);
    return;
  }
  Sons.clique();
  const el = document.getElementById('mundo-' + w);
  if(!el) return;
  el.scrollIntoView({ behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'center' });
  el.classList.remove('destaque'); void el.offsetWidth; el.classList.add('destaque');
}

// ---------- evento de Natal: aviso no mapa e calendário do advento ----------
// Na prévia (?natal=DD) o calendário fica só na memória: nada é gravado e os presentes não valem.
let natalPrevia = null;
function estadoNatal(){
  if(Natal.simulado) return natalPrevia || (natalPrevia = { ano:Natal.anoDoEvento(), portas:[], carta:false });
  // as portas recomeçam a cada Natal; a carta Terra Nevada, uma vez ganha, fica
  if(salvo.natal.ano !== Natal.anoDoEvento()){ salvo.natal.ano = Natal.anoDoEvento(); salvo.natal.portas = []; }
  return salvo.natal;
}
const portasParaAbrir = () => { const e = estadoNatal(); let n = 0; for(let d = 1; d <= Natal.ultimaPortaLiberada(); d++) if(!e.portas.includes(d)) n++; return n; };
const estrelasPolo = () => NATAL.fases.reduce((a, f) => a + (salvo.estrelas[f.id] || 0), 0);
const temCartaNatal = () => estadoNatal().carta || salvo.natal.carta;
function bannerNatal(){
  const faltam = Natal.diasParaONatal(), n = portasParaAbrir();
  return `<section class="natal-banner">
    <div class="arvore" aria-hidden="true">🎄</div>
    <div class="natal-txt"><b>Evento de Natal</b><small>${faltam ? `Faltam ${faltam} dia${faltam > 1 ? 's' : ''} para o Natal` : 'Feliz Natal! 🎅'}${Natal.simulado ? ' · prévia' : ''}</small></div>
    <button type="button" class="btn primario natal-cal" onclick="abrirCalendario()">🎁 Calendário${n ? `<i class="badge">${n}</i>` : ''}</button>
  </section>`;
}
function nomesPresente(pr){
  const partes = Object.entries(pr.poderes).map(([k, q]) => `${q > 1 ? q + '× ' : ''}${PODERES[k].icone} ${PODERES[k].nome}`);
  if(pr.carta) partes.unshift('🃏 carta Terra Nevada');
  return partes.join(' + ');
}
function abrirCalendario(){
  Sons.clique();
  const e = estadoNatal(), ate = Natal.ultimaPortaLiberada();
  const portas = Array.from({ length:Natal.ULTIMA_PORTA }, (_, k) => {
    const d = k + 1, aberta = e.portas.includes(d), pode = !aberta && d <= ate;
    return `<button type="button" class="porta ${aberta ? 'aberta' : pode ? 'pode' : 'fechada'} ${d === Natal.ULTIMA_PORTA ? 'grande' : ''}" data-dia="${d}" ${pode ? '' : 'disabled'}
      aria-label="Dia ${d}${aberta ? ', aberta' : pode ? ', pode abrir' : ', ainda não'}"><b>${d}</b><span>${aberta ? (d === Natal.ULTIMA_PORTA ? '🌍' : '🎁') : pode ? '✨' : '🔒'}</span></button>`;
  }).join('');
  abrirModal(`<h3>🎁 Calendário do advento</h3>
    <p>Uma porta por dia até o Natal. Perdeu um dia? A porta espera por você. A do dia 25 traz a carta <b>Terra Nevada</b>.</p>
    ${Natal.simulado ? '<p class="opcao-ajuda">Prévia do evento: os presentes aparecem, mas não são guardados.</p>' : ''}
    <div class="calendario">${portas}</div>
    <div id="cal-premio" class="cal-premio"></div>
    <div class="acoes"><button type="button" class="btn primario" onclick="fecharModal(); renderMapa()">Fechar</button></div>`);
  document.querySelectorAll('.porta.pode').forEach(b => b.onclick = () => abrirPorta(Number(b.dataset.dia)));
}
function abrirPorta(d){
  const e = estadoNatal();
  if(e.portas.includes(d) || d > Natal.ultimaPortaLiberada() || d < 1) return;
  const pr = Natal.presente(d);
  e.portas.push(d);
  if(!Natal.simulado){
    for(const [k, q] of Object.entries(pr.poderes)) salvo.poderes[k] = (salvo.poderes[k] || 0) + q;
    if(pr.carta) salvo.natal.carta = true;
    gravar();
  } else if(pr.carta) e.carta = true;
  Sons.vitoria(); vibrar(60);
  abrirCalendario();
  const el = document.querySelector(`.porta[data-dia="${d}"]`); if(el) el.classList.add('acabou-de-abrir');
  document.getElementById('cal-premio').innerHTML = `<b>Dia ${d}:</b> ${nomesPresente(pr)}${Natal.simulado ? ' <small>(prévia)</small>' : ''}` +
    (pr.carta ? `<div class="carta-vitoria">${cartaHTML('natal')}</div>` : '');
  const c = document.querySelector('#cal-premio .carta-pk'); if(c) c.onclick = () => verCarta('natal');
}

function renderAlbum(){
  const daViagem = salvo.cartas.filter(i => i < BASE), douradas = daViagem.filter(ehDourada).length;
  document.getElementById('album-conta').textContent = `${daViagem.length} de ${BASE} cartas · ✦ ${douradas} douradas`;
  const feitas = CONQUISTAS.filter(c => salvo.conquistas.includes(c.id)).length;
  document.getElementById('album').innerHTML = `<div class="album-mundo conquistas"><h2>🏅 Conquistas <small>${feitas} de ${CONQUISTAS.length}</small></h2>
      <div class="lista-conquistas">${CONQUISTAS.map(c => { const ok = salvo.conquistas.includes(c.id);
        return `<div class="conquista ${ok ? 'feita' : ''}"><span>${ok ? c.icone : '🔒'}</span><div><b>${c.nome}</b><small>${c.desc}</small></div></div>`; }).join('')}
      </div></div>` + MUNDOS.map((m, w) => `
    <div class="album-mundo"><h2><img src="${sprite(m.id, 60, 0.7)}" alt="">${m.nome}</h2>
      <div class="album-cartas">${m.cartas.map((c, f) => salvo.cartas.includes(w * 5 + f)
        ? cartaHTML(w * 5 + f)
        : `<div class="carta-pk verso"><span>🔒</span><small>Vença a fase ${f + 1}</small></div>`).join('')}
      </div>${m.cartas.some((c, f) => salvo.cartas.includes(w * 5 + f) && !ehDourada(w * 5 + f)) ? '<p class="dica-dourada">✦ Faça 3 estrelas numa fase para a carta virar Dourada</p>' : ''}
    </div>`).join('') + albumNatal();
  document.querySelectorAll('#album .carta-pk[data-carta]').forEach(b => b.onclick = () => verCarta(b.dataset.carta === 'natal' ? 'natal' : Number(b.dataset.carta)));
}
// cartas do Natal: aparecem no evento ou, depois dele, para quem já ganhou alguma
function albumNatal(){
  const w = MUNDOS.length, m = NATAL.mundo;
  const tem = m.cartas.some((c, f) => salvo.cartas.includes(BASE + f)) || temCartaNatal();
  if(!Natal.ativo() && !tem) return '';
  const total = m.cartas.filter((c, f) => salvo.cartas.includes(BASE + f)).length + (temCartaNatal() ? 1 : 0);
  return `<div class="album-mundo album-natal"><h2><span class="foto-mundo"><img src="${fotoMundo(m, 60)}" alt=""></span>🎄 Natal <small>${total} de ${m.cartas.length + 1}</small></h2>
      <div class="album-cartas">${m.cartas.map((c, f) => salvo.cartas.includes(BASE + f)
        ? cartaHTML(BASE + f)
        : `<div class="carta-pk verso natal"><span>🔒</span><small>Polo Norte ${f + 1}</small></div>`).join('')}
        ${temCartaNatal() ? cartaHTML('natal') : '<div class="carta-pk verso natal"><span>🎁</span><small>Calendário: dia 25</small></div>'}
      </div><p class="dica-dourada">✦ A Terra Nevada vira Dourada com 3 estrelas em todas as fases do Polo Norte</p></div>`;
}

// ---------- cartas colecionáveis ----------
// Raridade pela fase: 1–2 comum, 3–4 rara, chefe (5) lendária com brilho holográfico.
const RARIDADE = [['comum', '●', 'Comum'], ['comum', '●', 'Comum'], ['rara', '◆', 'Rara'], ['rara', '◆', 'Rara'], ['lendaria', '★', 'Lendária']];
// Carta Dourada (premium): a mesma carta, com acabamento de ouro, só para quem fez 3 estrelas na fase
// A carta especial do Natal ('natal', Terra Nevada) fica Dourada com as 15 estrelas do Polo Norte.
const ehDourada = i => i === 'natal' ? estrelasPolo() >= 15 : (salvo.estrelas[i] || 0) >= 3;
function cartaHTML(i, grande = false){
  const especial = i === 'natal';
  const m = especial ? NATAL.mundo : TODOS_MUNDOS[Math.floor(i / 5)], f = especial ? 4 : i % 5;
  const c = especial ? NATAL.carta : m.cartas[f], fi = FICHAS[especial ? 'terra' : m.id] || {};
  const [cls0, sim0, nome0] = especial ? ['lendaria natal', '❄', 'Especial de Natal'] : RARIDADE[f];
  const dourada = ehDourada(i);
  const [cls, sim, nome] = dourada ? [cls0 + ' dourada', '✦', 'Dourada · ' + nome0] : [cls0, sim0, nome0];
  const titulo = especial ? NATAL.carta.nome : m.nome;
  const num = especial ? '🎄 Natal especial' : ehNatal(i) ? `🎄 Natal ${i - BASE + 1}/${NATAL.fases.length}` : `Nº ${i + 1}/${BASE}`;
  const stat = (ico, rot, v) => `<div><span>${ico}</span><small>${rot}</small><b>${esc(v || '—')}</b></div>`;
  return `<button type="button" class="carta-pk ${cls} ${grande ? 'grande' : ''} ${ehNatal(i) || especial ? 'natal' : ''}" data-carta="${i}" style="--cor:${m.cor}" aria-label="Carta ${especial ? 'especial de Natal' : i + 1}: ${esc(titulo)}">
    <div class="pk-topo"><b>${esc(titulo)}</b><span>${esc(especial ? 'Evento de Natal' : fi.tipo || '')}</span></div>
    <div class="pk-foto"><img src="${sprite(fotoDe(m), grande ? 256 : 128, 0.7)}" alt=""></div>
    <div class="pk-num">${num} · ${sim} ${nome}</div>
    <p class="pk-fato">${esc(c.fato)}</p>
    <div class="pk-stats">${stat('⌀', 'Diâmetro', fi.diametro)}${stat('🌡️', 'Temperatura', fi.temperatura)}${stat('⚖️', 'Gravidade', fi.gravidade)}
      ${grande ? stat('🕒', 'Dia', fi.dia) + stat('🌙', 'Luas', fi.luas) + stat('☀️', 'Do Sol', fi.distancia) : ''}</div>
  </button>`;
}
// carta em tamanho grande; arrastar o dedo inclina a carta e move o brilho
function verCarta(i){
  Sons.clique();
  document.querySelector('.carta-camada')?.remove();
  const camada = document.createElement('div');
  camada.className = 'carta-camada';
  camada.innerHTML = `<div class="carta-palco">${cartaHTML(i, true)}</div>
    <p class="opcao-ajuda" style="text-align:center">Arraste o dedo na carta para ver o brilho ✨</p>
    <div class="acoes"><button type="button" class="btn primario">Fechar</button></div>`;
  document.body.appendChild(camada);
  // planeta 3D girando dentro da carta (uma cena só, desfeita ao fechar); sem WebGL ou com
  // gráficos leves, fica a foto
  let planeta = null;
  const fechar = () => { if(planeta){ planeta.destruir(); planeta = null; } camada.remove(); };
  camada.querySelector('.acoes .btn').onclick = () => { Sons.clique(); fechar(); };
  camada.addEventListener('click', e => { if(e.target === camada) fechar(); });
  const foto = camada.querySelector('.pk-foto'), tipo = i === 'natal' ? 'terra' : fotoDe(TODOS_MUNDOS[Math.floor(i / 5)]);
  if(window.Galaxy3D && Galaxy3D.suportado() && salvo.efeitos !== 'leve')
    Galaxy3D.criarPlanetaGrande(foto, tipo).then(pl => {
      if(!camada.isConnected){ pl.destruir(); return; }
      planeta = pl; pl.dimensionar(foto.clientWidth, foto.clientHeight); foto.classList.add('tem3d');
    }).catch(e => console.warn('[galaxia] carta sem 3D', e));
  else console.info('[galaxia] carta sem 3D: gráficos leves ou sem WebGL');
  const el = camada.querySelector('.carta-palco .carta-pk');
  const mover = e => { const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--rx', `${(-y * 16).toFixed(1)}deg`); el.style.setProperty('--ry', `${(x * 20).toFixed(1)}deg`);
    el.style.setProperty('--bx', `${(50 + x * 80).toFixed(0)}%`); el.style.setProperty('--by', `${(50 + y * 80).toFixed(0)}%`); };
  el.addEventListener('pointermove', mover);
  el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
}

function alternarEfeitos(){
  salvo.efeitos = salvo.efeitos === 'leve' || leveAutomatico ? 'completo' : 'leve';
  leveAutomatico = false;
  FX.qualidade = salvo.efeitos; Fundo.qualidade = salvo.efeitos; gravar();
  toast(salvo.efeitos === 'leve' ? 'Efeitos leves: tabuleiro 2D (melhor para celular mais simples)' : 'Efeitos completos ✨ tabuleiro 3D');
  Sons.clique();
}

// Botão rápido do mapa: liga/desliga tudo (efeitos sonoros + música).
function alternarSom(){
  const ligar = !(salvo.som || salvo.musica);
  salvo.som = salvo.musica = ligar; Sons.ligado = ligar; Musica.ligada = ligar; gravar();
  document.getElementById('btn-som').textContent = ligar ? '🔊' : '🔇';
  Sons.clique();
}

// ---------- configurações ----------
const OPCOES = [
  { id:'som',     icone:'🔔', nome:'Efeitos sonoros', aplicar: v => { Sons.ligado = v; } },
  { id:'musica',  icone:'🎵', nome:'Música',          aplicar: v => { Musica.ligada = v; } },
  { id:'vibrar',  icone:'📳', nome:'Vibração',        aplicar: v => { vibrar.ligado = v; if(v) vibrar(40); } },
];
function abrirConfig(){
  Sons.clique();
  const chave = (id, on, nome, icone) => `<button type="button" class="opcao" data-opcao="${id}" role="switch" aria-checked="${on}">
      <span>${icone} ${nome}</span><i class="chave ${on ? 'on' : ''}"></i></button>`;
  abrirModal(`<h3>⚙️ Configurações</h3>
    <div class="opcoes">
      ${OPCOES.map(o => chave(o.id, !!salvo[o.id], o.nome, o.icone)).join('')}
      ${chave('efeitos', salvo.efeitos !== 'leve', 'Gráficos 3D', '✨')}
      <p class="opcao-ajuda">Desligue os gráficos 3D se o celular esquentar ou travar (fica o tabuleiro 2D, mais leve).</p>
    </div>
    <div class="acoes" style="flex-direction:column">
      <button type="button" class="btn" id="cfg-tutorial">📘 Ver o tutorial de novo</button>
      <button type="button" class="btn" onclick="abrirDesafio()">🎯 Desafio de amigo</button>
      <button type="button" class="btn" onclick="convidar()">📤 Convidar amigos${podeGanharConvite() ? ' (+1 poder hoje)' : ''}</button>
      <button type="button" class="btn" id="cfg-relato">🐞 Reportar um problema</button>
      <button type="button" class="btn perigo" id="cfg-apagar">🗑️ Apagar progresso</button>
      <button type="button" class="btn primario" onclick="fecharModal(); renderMapa()">Pronto</button>
    </div>
    <p class="creditos">Galáxia Match ${VERSAO_APP} · texturas Solar System Scope (CC BY 4.0) · three.js (MIT)</p>`);
  document.querySelectorAll('.opcao').forEach(b => b.onclick = () => {
    const id = b.dataset.opcao;
    let on;
    if(id === 'efeitos'){ alternarEfeitos(); on = salvo.efeitos !== 'leve'; }
    else { on = salvo[id] = !salvo[id]; OPCOES.find(o => o.id === id).aplicar(on); gravar(); Sons.clique(); }
    b.setAttribute('aria-checked', on); b.querySelector('.chave').classList.toggle('on', on);
  });
  document.getElementById('cfg-relato').onclick = () => abrirRelato();
  document.getElementById('cfg-tutorial').onclick = () => {
    salvo.tutorial = false; salvo.dicas = []; gravar();
    fecharModal(); toast('📘 O tutorial aparece na próxima vez que abrir a fase 1.');
  };
  document.getElementById('cfg-apagar').onclick = () => {
    abrirModal(`<h3>Apagar todo o progresso?</h3><p>Estrelas, cartas, poderes e conquistas voltam para o começo. Não dá para desfazer.</p>
      <div class="acoes"><button type="button" class="btn" onclick="abrirConfig()">Cancelar</button>
      <button type="button" class="btn perigo" id="cfg-apagar-sim">Apagar</button></div>`);
    document.getElementById('cfg-apagar-sim').onclick = () => {
      try { localStorage.removeItem(CHAVE); } catch {}
      salvo = carregar(); gravar();
      Sons.ligado = salvo.som; Musica.ligada = salvo.musica; vibrar.ligado = salvo.vibrar;
      fecharModal(); renderMapa(); toast('Progresso apagado. Boa viagem de novo! 🚀');
    };
  };
}

// ---------- reportar um problema ----------
// Monta um relatório (versão, aparelho, fase e os últimos erros guardados pelo relato.js),
// mostra tudo para o jogador antes e manda pelo app de e-mail do próprio celular.
const EMAIL_SUPORTE = 'venerandodasilvawesley@gmail.com';
// No APK, links de fora (e-mail, WhatsApp, loja) abrem no app certo do celular pelo plugin
// opener (liberado só para esses endereços); no navegador, numa aba nova.
function abrirFora(url){
  const tauri = window.__TAURI_INTERNALS__;
  if(tauri) return tauri.invoke('plugin:opener|open_url', { url }).catch(e => { console.warn('[galaxia] não abriu o link', e); toast('Não consegui abrir. Use o botão Copiar.'); });
  const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
}
function abrirRelato(){
  Sons.clique();
  const onde = F ? `${TODOS_MUNDOS[F.fase.mundo].nome} · fase ${F.fase.numero} (nº ${F.i + 1}), ${F.est.jogadas} jogadas restantes` : 'fora de uma fase (' + (document.querySelector('.tela.ativa') || {}).id + ')';
  const graficos = `${salvo.efeitos}${T ? ' · tabuleiro ' + T.nome : ''} · nível ${Desempenho.nivel} · resolução ${Desempenho.pixelRatio()}`;
  const info = Relato.relatorio({ versao:VERSAO_APP, graficos, onde });
  abrirModal(`<h3>🐞 Reportar um problema</h3>
    <p>Conte o que aconteceu (por exemplo: "travou depois de um buraco negro na fase 7"). As informações técnicas abaixo vão junto e ajudam a achar o erro.</p>
    <textarea id="relato-texto" class="relato-texto" rows="4" maxlength="600" placeholder="O que aconteceu?"></textarea>
    <details class="relato-detalhes"><summary>Ver o que será enviado</summary><pre id="relato-info" class="relato-info"></pre></details>
    <div class="acoes" style="flex-direction:column">
      <button type="button" class="btn primario" id="relato-email">✉️ Enviar por e-mail</button>
      <button type="button" class="btn" id="relato-copiar">📋 Copiar relatório</button>
      <button type="button" class="btn" onclick="abrirConfig()">Voltar</button>
    </div>
    <p class="opcao-ajuda">Se o e-mail não abrir, copie o relatório e mande para ${EMAIL_SUPORTE}.</p>`);
  document.getElementById('relato-info').textContent = info;     // texto puro: nada vira HTML
  const completo = () => {
    const desc = document.getElementById('relato-texto').value.trim() || '(sem descrição)';
    return `O que aconteceu:\n${desc}\n\n--- informações técnicas ---\n${info}`;
  };
  document.getElementById('relato-email').onclick = () => {
    // links mailto têm limite de tamanho: corta os registros mais antigos se precisar
    let corpo = completo();
    if(corpo.length > 1800) corpo = corpo.slice(0, 1800) + '\n[…]';
    abrirFora(`mailto:${EMAIL_SUPORTE}?subject=${encodeURIComponent('Galáxia Match ' + VERSAO_APP + ' — problema')}&body=${encodeURIComponent(corpo)}`);
  };
  document.getElementById('relato-copiar').onclick = async () => {
    const t = completo();
    try { await navigator.clipboard.writeText(t); }
    catch(e){ const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch(e2){} ta.remove(); }
    toast('📋 Relatório copiado. Cole no e-mail ou no WhatsApp.');
  };
}

// ---------- convidar amigos ----------
// Compartilhar o jogo dá 1 poder, no máximo 1 vez por dia (o jogo não tem servidor, então
// não sabe se o amigo instalou: o limite diário evita abuso).
const LINK_LOJA = 'https://play.google.com/store/apps/details?id=com.venerando.galaxiamatch';
const hojeTxt = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const podeGanharConvite = () => salvo.convite !== hojeTxt();
// continuar = true: chamado da tela "Acabaram as jogadas!" — o presente vira +5 jogadas na fase
async function convidar(continuar = false){
  Sons.clique();
  const texto = `🪐 Tô jogando Galáxia Match: combina planetas, faz supernova e buraco negro e aprende sobre o Sistema Solar! Baixa aí: ${LINK_LOJA}`;
  let compartilhou = false;
  if(!window.__TAURI_INTERNALS__ && navigator.share){
    try { await navigator.share({ title:'Galáxia Match', text:texto }); compartilhou = true; } catch(e){ if(e && e.name === 'AbortError') return; }
  }
  if(!compartilhou){ abrirFora(`https://wa.me/?text=${encodeURIComponent(texto)}`); compartilhou = true; }
  if(compartilhou && continuar && podeGanharConvite() && F){
    salvo.convite = hojeTxt(); gravar();
    fecharModal(); F.est.jogadas += 5; renderHud(); F.ocupado = false; agendarDica();
    setTimeout(() => toast('🎁 Valeu por convidar! +5 jogadas. Continue!'), 600);
    return;
  }
  if(compartilhou && podeGanharConvite()){
    const tipos = ['meteoro', 'foguete', 'gravidade', 'jogadas'], t = tipos[Math.floor(Math.random() * tipos.length)];
    salvo.poderes[t]++; salvo.convite = hojeTxt(); gravar();
    setTimeout(() => toast(`🎁 Valeu por convidar! Você ganhou 1 ${PODERES[t].nome}.`), 600);
    if(F) renderPoderes();
  } else if(compartilhou) setTimeout(() => toast('Valeu por convidar! O próximo presente é amanhã. 🎁'), 600);
}

// ---------- desafio de amigo (mesmo tabuleiro, sem servidor) ----------
// O código leva a fase, a semente do sorteio do tabuleiro e os pontos de quem desafiou, mais um
// dígito de conferência contra erro de digitação. Ex.: GM-13-4F7KQ-6KZ-X
let proximoDesafio = null;
const novaSemente = () => 36 ** 4 + Math.floor(Math.random() * (36 ** 5 - 36 ** 4));
const conferencia = txt => [...txt].reduce((a, ch) => (a * 7 + ch.charCodeAt(0)) % 36, 5).toString(36).toUpperCase();
function codigoDesafio(i, seed, pontos){
  const corpo = `${i + 1}-${seed.toString(36)}-${pontos.toString(36)}`.toUpperCase();
  return `GM-${corpo}-${conferencia(corpo)}`;
}
function lerCodigo(txt){
  const t = String(txt || '').toUpperCase().replace(/\s+/g, '').replace(/^GM-?/, '');
  const m = /^(\d{1,2})-([0-9A-Z]{1,7})-([0-9A-Z]{1,6})-([0-9A-Z])$/.exec(t);
  if(!m) return null;
  const corpo = `${m[1]}-${m[2]}-${m[3]}`;
  if(conferencia(corpo) !== m[4]) return null;
  const fase = Number(m[1]) - 1, seed = parseInt(m[2], 36), pontos = parseInt(m[3], 36);
  if(!(fase >= 0 && fase < TODAS.length) || !(pontos >= 0 && pontos < 1e7)) return null;
  return { fase, seed, pontos, codigo:`GM-${corpo}-${m[4]}` };
}
function nomeFase(i){ const f = TODAS[i]; return `${TODOS_MUNDOS[f.mundo].nome} · ${f.numero === 5 ? 'Chefe' : 'fase ' + f.numero}`; }
function desafiar(i, seed, pontos){
  Sons.clique();
  const codigo = codigoDesafio(i, seed, pontos);
  const texto = `🎯 Te desafio no Galáxia Match! Fiz ${pontos.toLocaleString('pt-BR')} pontos em ${nomeFase(i)}. Consegue me vencer?\n` +
    `Abra o jogo, toque em 🎯 Desafio de amigo e digite: ${codigo}\nBaixe: ${LINK_LOJA}`;
  if(!window.__TAURI_INTERNALS__ && navigator.share) navigator.share({ title:'Desafio Galáxia Match', text:texto }).catch(() => {});
  else abrirFora(`https://wa.me/?text=${encodeURIComponent(texto)}`);
}
function abrirDesafio(){
  Sons.clique();
  abrirModal(`<h3>🎯 Desafio de amigo</h3>
    <p>Digite o código que seu amigo mandou. Vocês jogam o <b>mesmo tabuleiro</b>, sem poderes: ganha quem passar da fase com mais pontos.</p>
    <input id="desafio-codigo" class="relato-texto" placeholder="GM-13-4F7KQ-6KZ-X" autocomplete="off" autocapitalize="characters" spellcheck="false">
    <p class="opcao-ajuda" id="desafio-erro" hidden>Código inválido. Confira as letras e os números.</p>
    <div class="acoes"><button type="button" class="btn" onclick="fecharModal()">Voltar</button>
      <button type="button" class="btn primario" id="desafio-ir">Aceitar desafio</button></div>
    <p class="opcao-ajuda">Para desafiar alguém, vença uma fase e toque em "🎯 Desafiar um amigo".</p>`);
  const ir = () => {
    const d = lerCodigo(document.getElementById('desafio-codigo').value);
    if(!d){ document.getElementById('desafio-erro').hidden = false; Sons.invalida(); return; }
    fecharModal(); proximoDesafio = d; abrirFase(d.fase, { comQuiz:false });
  };
  document.getElementById('desafio-ir').onclick = ir;
  document.getElementById('desafio-codigo').addEventListener('keydown', e => { if(e.key === 'Enter') ir(); });
}
let ultimoDesafio = null;
function repetirDesafio(){ if(!ultimoDesafio) return; proximoDesafio = ultimoDesafio; abrirFase(ultimoDesafio.fase, { comQuiz:false }); }
function resultadoDesafio(passou){
  const { i, est, desafio, seed } = F;
  ultimoDesafio = desafio;
  const venceu = passou && est.pontos > desafio.pontos, empate = passou && est.pontos === desafio.pontos;
  if(venceu){ Sons.vitoria(); vibrar(80); } else Sons.derrota();
  abrirModal(`<h3>${venceu ? '🏆 Você venceu o desafio!' : empate ? '🤝 Empate!' : '😅 Não foi dessa vez'}</h3>
    <p>${nomeFase(i)}</p>
    <div class="placar-desafio"><div><small>Você</small><b>${passou ? est.pontos.toLocaleString('pt-BR') : 'não passou'}</b></div>
      <span>×</span><div><small>Seu amigo</small><b>${desafio.pontos.toLocaleString('pt-BR')}</b></div></div>
    <div class="acoes" style="flex-direction:column">
      ${passou ? `<button type="button" class="btn primario" onclick="desafiar(${i}, ${seed}, ${est.pontos})">🎯 Responder ao desafio</button>` : ''}
      <div style="display:flex;gap:10px;justify-content:center">
        <button type="button" class="btn" onclick="fecharModal(); mostrarTela('mapa')">Mapa</button>
        <button type="button" class="btn" onclick="fecharModal(); repetirDesafio()">Tentar de novo</button>
      </div>
    </div>`);
}

// ---------- conquistas ----------
const st = k => salvo.stats[k] || 0;
const estrelasDoMundo = w => [0, 1, 2, 3, 4].reduce((a, f) => a + (salvo.estrelas[w * 5 + f] || 0), 0);
const CONQUISTAS = [
  { id:'primeira',  icone:'🚀', nome:'Decolagem',            desc:'Vença a primeira fase',                 ok: () => st('vitorias') >= 1 },
  { id:'cometas',   icone:'☄️', nome:'Caçador de cometas',   desc:'Solte 10 cometas',                      ok: () => st('cometas') >= 10 },
  { id:'supernova', icone:'💥', nome:'Supernova',            desc:'Exploda 5 supernovas',                  ok: () => st('supernovas') >= 5 },
  { id:'buraco',    icone:'🕳️', nome:'Horizonte de eventos', desc:'Use um buraco negro',                   ok: () => st('buracos') >= 1 },
  { id:'bigbang',   icone:'🌌', nome:'Big Bang',             desc:'Combine dois buracos negros',           ok: () => st('bigbangs') >= 1 },
  { id:'combo',     icone:'🔗', nome:'Reação em cadeia',     desc:'Faça um combo x5',                      ok: () => st('maxCombo') >= 5 },
  { id:'sabio',     icone:'🧠', nome:'Sabe tudo',            desc:'Acerte 10 perguntas do quiz',           ok: () => st('quizCertos') >= 10 },
  { id:'arsenal',   icone:'🧰', nome:'Arsenal',              desc:'Use 10 poderes',                        ok: () => st('poderes') >= 10 },
  { id:'perfeito',  icone:'⭐', nome:'Perfeição',            desc:'Faça 3 estrelas em todas as fases de um mundo', ok: () => MUNDOS.some((m, w) => estrelasDoMundo(w) === 15) },
  { id:'cartas',    icone:'🃏', nome:'Colecionador',         desc:'Junte 25 cartas no álbum',              ok: () => salvo.cartas.length >= 25 },
  { id:'planetas',  icone:'🔭', nome:'Até Netuno',           desc:'Conquiste os 8 planetas',               ok: () => (salvo.estrelas[39] || 0) > 0 },
  { id:'viagem',    icone:'🌞', nome:'Viagem completa',      desc:'Vença o chefe final no Sol',            ok: () => (salvo.estrelas[FASES.length - 1] || 0) > 0 },
  { id:'defensor',  icone:'🛡️', nome:'Defensor da Terra',    desc:'Vença a Defesa da Terra',               ok: () => salvo.defesa.vitorias >= 1 },
];
function contar(k, n = 1){ salvo.stats[k] = st(k) + n; }
function maximo(k, v){ if(v > st(k)) salvo.stats[k] = v; }
function checarConquistas(){
  let nova = false;
  for(const c of CONQUISTAS){
    if(salvo.conquistas.includes(c.id) || !c.ok()) continue;
    salvo.conquistas.push(c.id); nova = true;
    toast(`🏅 Conquista: ${c.nome}!`);
    ganharPoder(null, c.nome);
  }
  if(nova){ Sons.criouEspecial(); vibrar(50); }
  gravar();
}

// ---------- tutorial e dicas ----------
// Balão com seta apontando para um elemento. Com botão, bloqueia o jogo até tocar nele.
function balao({ texto, alvo, botao, lado = 'baixo' }){
  document.getElementById('balao')?.remove();
  const b = document.createElement('div');
  b.className = 'balao ' + lado; b.id = 'balao';
  b.innerHTML = `<p>${texto}</p>${botao ? `<button type="button" class="btn primario">${botao}</button>` : ''}`;
  document.body.appendChild(b);
  const r = alvo.getBoundingClientRect(), w = Math.min(320, innerWidth - 24);
  b.style.width = w + 'px';
  b.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w / 2)) + 'px';
  b.style.setProperty('--seta', Math.max(18, Math.min(w - 18, r.left + r.width / 2 - parseFloat(b.style.left))) + 'px');
  if(lado === 'baixo') b.style.top = (r.bottom + 12 + scrollY) + 'px';
  else b.style.top = (r.top - b.offsetHeight - 12 + scrollY) + 'px';
  return new Promise(ok => { if(botao) b.querySelector('button').onclick = () => { Sons.clique(); fecharBalao(); ok(); }; else ok(); });
}
function fecharBalao(){ document.getElementById('balao')?.remove(); document.querySelector('.tuto-mao')?.remove(); document.querySelector('.tuto-veu')?.remove(); }

// Mãozinha mostrando uma jogada (arrasta de a para b sem parar).
function mostrarMao(a, b){
  document.querySelector('.tuto-mao')?.remove();
  const pa = T.projetar(a.r, a.c), pb = T.projetar(b.r, b.c);
  const m = document.createElement('div');
  m.className = 'tuto-mao'; m.textContent = '👆';
  m.style.setProperty('--x0', pa.x + 'px'); m.style.setProperty('--y0', pa.y + 'px');
  m.style.setProperty('--x1', pb.x + 'px'); m.style.setProperty('--y1', pb.y + 'px');
  document.getElementById('tabuleiro').appendChild(m);
}

function veu(){ const v = document.createElement('div'); v.className = 'tuto-veu'; document.body.appendChild(v); }

async function tutorialInicio(){
  F.tuto = 1;
  const moves = F.board.validMoves();
  // prefere uma jogada no meio do tabuleiro (a mão fica bem à vista)
  moves.sort((x, y) => Math.abs(x[0].r - 3.5) + Math.abs(x[0].c - 3.5) - Math.abs(y[0].r - 3.5) - Math.abs(y[0].c - 3.5));
  if(moves[0]) mostrarMao(...moves[0]);
  await balao({ texto:'👋 Bem-vindo! <b>Arraste um planeta</b> até o vizinho para alinhar <b>3 iguais</b>.<br><small>Ou toque num planeta e depois no vizinho.</small>',
    alvo:document.getElementById('tabuleiro'), lado:'cima' });
}

async function tutorialDepoisDaJogada(){
  F.tuto = 2; F.ocupado = true;
  fecharBalao(); veu();
  await balao({ texto:'🎯 Este é o <b>objetivo</b> da fase. Cumpra antes que as <b>jogadas</b> acabem — sobrar jogadas dá mais estrelas!',
    alvo:document.getElementById('objetivos'), botao:'Entendi' });
  veu();
  await balao({ texto:'🧰 <b>Poderes</b> ajudam quando apertar. Toque para usar. Você ganha mais acertando o quiz, fazendo 3 estrelas e vencendo chefes.',
    alvo:document.getElementById('poderes'), botao:'Vamos jogar!', lado:'cima' });
  salvo.tutorial = true; gravar();
  F.tuto = 0; F.ocupado = false; agendarDica();
}

// Dicas que aparecem uma vez só, na primeira vez que a situação acontece.
const DICAS = {
  coletar: '🪐 <b>Colete os planetas</b> mostrados lá em cima: cada um que estourar conta.',
  poeira:  '🟣 <b>Poeira cósmica:</b> combine planetas em cima das casas roxas para limpar.',
  gelo:    '🧊 <b>Gelo do Polo Norte:</b> combine planetas em cima das casas geladas para derreter.',
  defesa:  '☄️ <b>Meteoros!</b> Combine planetas em cima deles para destruir. A cada jogada eles descem: se passarem da última fileira, atingem a Terra.',
  h:       '☄️ Você criou um <b>cometa</b>! Combine-o e ele limpa a linha (ou coluna) inteira.',
  bomb:    '💥 Você criou uma <b>supernova</b>! Ao combinar, ela explode tudo em volta.',
  hole:    '🕳️ Você criou um <b>buraco negro</b>! Troque-o com um planeta para sugar todos daquela cor.',
  sat:     '🛰️ Você criou um <b>satélite</b>! Com 4 planetas em quadrado: ao combinar, ele limpa em volta e voa até a poeira (ou um meteoro).',
  especial:'✨ Dica: troque <b>dois especiais</b> entre si para uma combinação ainda mais forte!',
};
function dica(id){
  if(salvo.dicas.includes(id) || !salvo.tutorial) return;
  salvo.dicas.push(id); gravar();
  const d = document.createElement('div');
  d.className = 'dica-flutuante'; d.innerHTML = DICAS[id];
  document.body.appendChild(d);
  setTimeout(() => d.classList.add('sai'), 5200);
  setTimeout(() => d.remove(), 5700);
}

// ---------- modal ----------
function abrirModal(html){
  document.getElementById('modal-conteudo').innerHTML = html;
  document.getElementById('modal').hidden = false;
}
function fecharModal(){ document.getElementById('modal').hidden = true; }

// Quiz sobre uma carta já ganha. aoFim(acertou) é chamado ao continuar.
function mostrarQuiz({ titulo, texto, aoFim }){
  const id = salvo.cartas[Math.floor(Math.random() * salvo.cartas.length)];
  const c = cartaDaFase(id);
  const opcoes = [c.certa, ...c.erradas].sort(() => Math.random() - 0.5);
  abrirModal(`<h3>${titulo}</h3><p>${texto}</p>
    <p style="color:var(--texto);font-weight:800;margin-top:12px;font-size:17px">${esc(c.pergunta)}</p>
    <div class="quiz-opcoes">${opcoes.map(o => `<button type="button" class="btn" data-op="${esc(o)}">${esc(o)}</button>`).join('')}</div>
    <div id="quiz-fim"></div>`);
  document.querySelectorAll('.quiz-opcoes .btn').forEach(b => b.onclick = () => {
    const acertou = b.dataset.op === c.certa;
    document.querySelectorAll('.quiz-opcoes .btn').forEach(x => {
      x.disabled = true;
      if(x.dataset.op === c.certa) x.classList.add('certa'); else if(x === b) x.classList.add('errada');
    });
    acertou ? Sons.acerto() : Sons.erro();
    if(acertou){ ganharPoder(null, 'Resposta certa'); contar('quizCertos'); checarConquistas(); }
    document.getElementById('quiz-fim').innerHTML = `<div class="carta"><img src="${sprite(fotoDe(TODOS_MUNDOS[Math.floor(id / 5)]), 96, 0.7)}" alt="">
      <div><small>${acertou ? '✓ Certo!' : 'Quase! A resposta era: ' + esc(c.certa)}</small><p>${esc(c.fato)}</p></div></div>
      <div class="acoes"><button type="button" class="btn primario" id="quiz-ok">Continuar</button></div>`;
    document.getElementById('quiz-ok').onclick = () => { fecharModal(); aoFim(acertou); };
  });
}

// ---------- fase ----------
let F = null; // estado da fase em jogo

function abrirFase(i, { comQuiz = true } = {}){
  const emDesafio = proximoDesafio && proximoDesafio.fase === i;
  if(!liberada(i) && !emDesafio) return;
  if(emDesafio) comQuiz = false;
  Sons.clique();
  const fase = TODAS[i];
  aplicarTema(fase.mundo);
  // nas fases 3 e chefe, pergunta bônus sobre cartas já ganhas
  if(comQuiz && (fase.numero === 3 || fase.numero === 5) && salvo.cartas.length >= 2){
    mostrarQuiz({ titulo:'🚀 Pergunta bônus', texto:'Acerte e comece a fase com +3 jogadas.', aoFim: ok => iniciarFase(i, ok ? 3 : 0) });
  } else iniciarFase(i, 0);
}

async function iniciarFase(i, bonus, especial = null){
  const fase = especial || TODAS[i];
  // semente do tabuleiro: a do desafio aceito (mesmo tabuleiro do amigo) ou uma nova, que vai no código
  const desafio = proximoDesafio && proximoDesafio.fase === i ? proximoDesafio : null;
  proximoDesafio = null;
  const seed = desafio ? desafio.seed : novaSemente();
  const board = new Board({ colors:fase.cores, dust:fase.poeira, seed });
  // Defesa da Terra: a primeira onda de meteoros já começa no alto do tabuleiro
  const defesa = fase.defesa ? Defesa.novaDefesa() : null;
  if(defesa) Defesa.comecar(defesa, board);
  const est = R.novoEstado(fase, board);
  est.jogadas += bonus;
  const poeiraInicial = est.poeira;
  descartarPlaneta();
  Desempenho.reiniciar();
  F = { i, fase, board, est, sel:null, extraUsado:false, dicaTimer:null, poeiraInicial, planeta:null, mira:null, geracao:0, seed, desafio, defesa };
  // "ocupado" guarda desde quando o tabuleiro está travado (a reserva conta o tempo de UMA jogada)
  let ocupado = true, desde = performance.now();
  Object.defineProperty(F, 'ocupado', { get(){ return ocupado; }, set(v){ if(v && !ocupado) desde = performance.now(); ocupado = v; }, enumerable:true });
  Object.defineProperty(F, 'ocupadoDesde', { get(){ return ocupado ? desde : 0; } });
  document.getElementById('fase-titulo').textContent = defesa ? 'Defesa da Terra ☄️' : `${TODOS_MUNDOS[fase.mundo].nome} · ${fase.numero === 5 ? 'Chefe 👑' : 'Fase ' + fase.numero}`;
  document.getElementById('fase-sub').textContent = descreverObjetivo(fase);
  mostrarTela('fase');
  // Polo Norte: a poeira vira gelo (o tabuleiro 3D/2D lê a classe ao montar)
  document.getElementById('tabuleiro').classList.toggle('gelo', !!fase.gelo);
  document.getElementById('tabuleiro').classList.toggle('meteoro', !!defesa);
  document.body.classList.toggle('fase-gelo', !!fase.gelo);
  prepararPalco(TODOS_MUNDOS[fase.mundo]);
  // objetivos e poderes primeiro: o tamanho do tabuleiro é calculado com a altura REAL deles
  renderHud(); renderPoderes();
  calcularCasa();
  await escolherTabuleiro();
  T.montar(board, F.cel);
  await montarPlaneta3D(TODOS_MUNDOS[fase.mundo]);
  F.ocupado = false;
  renderHud();
  renderPoderes();
  if(bonus) toast(`+${bonus} jogadas pela resposta certa!`);
  if(desafio) toast(`🎯 Desafio: passe da fase com mais de ${desafio.pontos.toLocaleString('pt-BR')} pontos (sem poderes)`);
  if(i === 0 && !salvo.tutorial){ tutorialInicio(); return; }
  if(fase.objetivos.coletar && !fase.objetivos.poeira) dica('coletar');
  if(fase.objetivos.poeira) dica(fase.gelo ? 'gelo' : 'poeira');
  if(defesa) dica('defesa');
  agendarDica();
}

// ---------- planeta do mundo ----------
function prepararPalco(m){
  const palco = document.getElementById('palco-planeta');
  palco.classList.remove('tem3d');
  document.getElementById('palco-img').src = fotoMundo(m, 256);
  document.getElementById('palco-nome').textContent = m.nome;
}

async function montarPlaneta3D(m){
  descartarPlaneta();
  const palco = document.getElementById('palco-planeta');
  // aparelho fraco: o planeta grande fica em imagem (um segundo 3D pesaria demais)
  if(salvo.efeitos === 'leve' || leveAutomatico || Desempenho.nivel === 'baixo' || palco.hidden || !window.Galaxy3D || !Galaxy3D.suportado() || !T || T.nome !== '3d') return;
  try {
    F.planeta = await Galaxy3D.criarPlanetaGrande(palco, fotoDe(m), { comGorro:Natal.ativo() });
    F.planeta.dimensionar(palco.clientWidth, palco.clientHeight);
    palco.classList.add('tem3d');
  } catch(e){ console.warn('planeta 3D indisponível', e); }
}

function descartarPlaneta(){
  if(F && F.planeta){ F.planeta.destruir(); F.planeta = null; }
  document.getElementById('palco-planeta').classList.remove('tem3d');
}

// 0 → 1: quanto do objetivo já foi cumprido (média entre as metas da fase)
function progressoObjetivo(){
  if(F.defesa) return 1 - F.defesa.escudo / F.defesa.cfg.escudo;   // a Terra racha conforme leva meteoros
  const { fase, est } = F, o = fase.objetivos, partes = [];
  if(o.pontos) partes.push(Math.min(1, est.pontos / o.pontos));
  if(o.coletar) for(const [cor, n] of Object.entries(o.coletar)) partes.push(Math.min(1, est.coletado[cor] / n));
  if(o.poeira) partes.push(F.poeiraInicial ? 1 - est.poeira / F.poeiraInicial : 1);
  return partes.length ? partes.reduce((a, b) => a + b, 0) / partes.length : 0;
}

// ---------- poderes ----------
const PODERES = {
  meteoro:   { icone:'☄️', nome:'Meteoro',  dica:'Toque no planeta que o meteoro vai destruir.' },
  foguete:   { icone:'🚀', nome:'Foguete',  dica:'Toque numa linha para o foguete limpar.' },
  gravidade: { icone:'🌀', nome:'Gravidade', dica:'' },
  jogadas:   { icone:'⏱️', nome:'+5',       dica:'' },
};

function renderPoderes(){
  document.getElementById('poderes').innerHTML = Object.entries(PODERES).map(([id, p]) => {
    const n = salvo.poderes[id] || 0;
    return `<button type="button" class="poder ${F && F.mira === id ? 'mirando' : ''}" data-poder="${id}" ${n && !(F && F.desafio) ? '' : 'disabled'} aria-label="${p.nome} (${n})">
      ${p.icone}<small>${p.nome}</small>${n ? `<b>${n}</b>` : ''}</button>`;
  }).join('');
  document.querySelectorAll('.poder').forEach(b => b.onclick = () => usarPoder(b.dataset.poder));
}

function ganharPoder(id, motivo){
  const ids = Object.keys(PODERES);
  id = id || ids[Math.floor(Math.random() * ids.length)];
  salvo.poderes[id] = (salvo.poderes[id] || 0) + 1; gravar();
  setTimeout(() => toast(`🎁 ${motivo}: +1 ${PODERES[id].icone} ${PODERES[id].nome}`), 300);
  if(F && document.getElementById('tela-fase').classList.contains('ativa')) renderPoderes();
}

function usarPoder(id){
  if(!F || F.ocupado || F.desafio || !(salvo.poderes[id] > 0)) return;
  Sons.clique(); limparDica(); selecionar(null);
  if(id === 'jogadas'){
    salvo.poderes.jogadas--; contar('poderes'); checarConquistas(); F.est.jogadas += 5; renderHud(); renderPoderes();
    toast('⏱️ +5 jogadas!'); return;
  }
  if(id === 'gravidade'){ salvo.poderes.gravidade--; contar('poderes'); gravar(); executarPoder('gravidade'); return; }
  F.mira = F.mira === id ? null : id;                       // meteoro/foguete: escolher o alvo
  renderPoderes();
  if(F.mira) toast(PODERES[id].dica);
}

const executarPoder = protegido(async function(id, cel){
  if(F.ocupado) return;
  F.ocupado = true; F.mira = null;
  if(id !== 'gravidade'){ salvo.poderes[id]--; contar('poderes'); gravar(); }
  renderPoderes();
  if(id === 'meteoro'){ FX.meteoro(cel.r, cel.c); Sons.cometa(); await espera(300); }
  if(id === 'foguete'){ FX.cometa(cel.r, cel.c, 'h'); Sons.cometa(); }
  const res = F.board.usarPoder(id, cel);
  const fase = F, g = F.geracao;
  for(const ph of res.phases){ await animarFase(ph); if(cancelada(fase, g)) return; }
  if(res.shuffled){ Sons.buraco(); toast('🌀 Gravidade zero!'); T.reposicionar(F.board); await espera(400); }
  F.est.poeira = F.board.dustLeft();
  renderHud(); renderPoderes(); checarConquistas();
  if(faseVencida()) return vitoria();
  F.ocupado = false; agendarDica();
});

function descreverObjetivo(fase){
  if(fase.defesa) return `Destrua ${Defesa.CONFIG.meta} meteoros antes que atinjam a Terra`;
  const o = fase.objetivos, partes = [];
  if(o.pontos) partes.push(`faça ${o.pontos.toLocaleString('pt-BR')} pontos`);
  if(o.coletar) partes.push('colete os planetas');
  if(o.poeira) partes.push(fase.gelo ? 'derreta o gelo' : 'limpe a poeira cósmica');
  return partes.join(' e ').replace(/^./, c => c.toUpperCase());
}

// Tabuleiro de ponta a ponta na largura (celular em pé); em telas largas, limitado pela altura.
function calcularCasa(){
  const larg = Math.min(innerWidth - 8, 720);
  const topo = document.querySelector('#tela-fase .hud').offsetHeight + document.getElementById('objetivos').offsetHeight + 40 + areaSegura().topo;
  // espaço de baixo medido de verdade (barra de poderes + placar + margens + área segura do aparelho);
  // o valor fixo antigo (92 px) deixava a barra 8 px para fora da tela em quase todos os tamanhos
  const pod = document.getElementById('poderes'), plac = document.getElementById('placar');
  const seg = areaSegura();
  const ALTURA_PODERES = (pod.offsetHeight || 62) + (plac ? plac.offsetHeight : 0) + 30 + seg.baixo;
  const alt = innerHeight - topo - ALTURA_PODERES;
  const cel = Math.max(34, Math.floor(Math.min(larg, Math.max(alt, 300)) / 8));
  F.cel = cel;
  document.documentElement.style.setProperty('--cel', cel + 'px');
  FX.dimensionar(cel);
  if(T) T.redimensionar(cel);
  // planeta do mundo: a altura que sobra entre os objetivos e o tabuleiro
  const palco = document.getElementById('palco-planeta');
  const sobra = alt - cel * 8 - 8;
  palco.hidden = sobra < 90;
  palco.style.height = Math.max(0, sobra) + 'px';
  if(F.planeta && !palco.hidden) F.planeta.dimensionar(palco.clientWidth, sobra);
}

function tipoPeca(p){ return p.special === 'hole' ? 'buraco' : PECAS[p.color].id; }

// ---------- tabuleiro: 3D (render3d.js) ou 2D (tab2d.js), mesma interface ----------
let tab2d = null, tab3d = null, tab3dFalhou = false;
let T = null; // tabuleiro em uso

async function prepararTab3D(){
  if(tab3d || tab3dFalhou || !window.Galaxy3D || !Galaxy3D.suportado()) return tab3d;
  try { tab3d = await Galaxy3D.criarTab3D({ tabuleiro:document.getElementById('tabuleiro'), tipoPeca }); }
  catch(e){ tab3dFalhou = true; console.warn('3D indisponível, usando 2D', e); }
  return tab3d;
}

// O Android pode derrubar o WebGL (memória da GPU): troca para o tabuleiro 2D e segue o jogo.
addEventListener('galaxy3d-perdido', () => {
  tab3dFalhou = true; tab3d = null;
  descartarPlaneta();
  if(!F || !T || T.nome !== '3d') return;
  T = tab2d; FX.projetar = (r, c) => T.projetar(r, c);
  T.montar(F.board, F.cel); aplicarTamanho2D();
  toast('Modo 3D indisponível agora — seguindo em 2D.');
});
function aplicarTamanho2D(){ FX.dimensionar(F.cel); }

// Mesmo na menor resolução o 3D ficou lento: passa para os efeitos leves (2D), entre uma
// jogada e outra, SÓ nesta sessão (não grava: um aparelho quente ou ocupado melhora depois;
// quem quiser fixo escolhe em ⚙️ Configurações).
let pedirLeve = false, leveAutomatico = false;
Desempenho.aoFicarLento(qps => { console.warn('[galaxia] 3D lento (' + qps.toFixed(0) + ' qps): gráficos leves nesta sessão'); pedirLeve = true; });
setInterval(() => {
  if(!pedirLeve || !F || F.ocupado || !T || T.nome !== '3d' || salvo.efeitos === 'leve') return;
  pedirLeve = false; leveAutomatico = true;
  FX.qualidade = 'leve'; Fundo.qualidade = 'leve';
  descartarPlaneta();
  T.pausar(); T.limpar();
  T = tab2d; FX.projetar = (r, c) => T.projetar(r, c);
  T.montar(F.board, F.cel); aplicarTamanho2D();
  toast('Gráficos leves por enquanto, para o jogo rodar liso');
}, 1000);

async function escolherTabuleiro(){
  const quer3d = salvo.efeitos !== 'leve' && !leveAutomatico;
  const novo = quer3d && await prepararTab3D() ? tab3d : tab2d;
  if(T && T !== novo){ T.pausar(); T.limpar(); }
  T = novo;
  FX.projetar = (r, c) => T.projetar(r, c);
  return T;
}

function renderHud(){
  const { fase, est } = F, o = fase.objetivos;
  const jb = document.getElementById('jogadas-box');
  document.getElementById('jogadas').textContent = est.jogadas;
  jb.classList.toggle('pouco', est.jogadas <= 5);
  let html = '';
  if(F.defesa){
    const d = F.defesa;
    html += `<div class="obj obj-escudo ${d.escudo <= 1 ? 'pouco' : ''}" title="Escudo da Terra">${'❤️'.repeat(d.escudo)}${'🖤'.repeat(d.cfg.escudo - d.escudo)}</div>`;
    html += `<div class="obj ${Defesa.venceu(d) ? 'feito' : ''}" title="Meteoros destruídos"><span class="meteoro-ico"></span>${Math.min(d.destruidos, d.cfg.meta)}/${d.cfg.meta}</div>`;
  }
  if(o.coletar) for(const [cor, n] of Object.entries(o.coletar)){
    const falta = Math.max(0, n - est.coletado[cor]), id = PECAS[cor].id;
    html += `<div class="obj ${falta ? '' : 'feito'}" title="Colete ${PECAS[cor].nome}"><img src="${sprite(id, 64, ROTACAO[id])}" alt="${PECAS[cor].nome}">${falta ? falta : '✓'}</div>`;
  }
  if(o.poeira) html += `<div class="obj ${est.poeira ? '' : 'feito'}" title="${fase.gelo ? 'Gelo' : 'Poeira cósmica'}"><span class="poeira-ico"></span>${est.poeira ? est.poeira : '✓'}</div>`;
  if(o.pontos){
    const pct = Math.min(100, 100 * est.pontos / o.pontos);
    html += `<div class="obj obj-pontos ${pct >= 100 ? 'feito' : ''}"><div style="flex:1">⭐ ${est.pontos.toLocaleString('pt-BR')} / ${o.pontos.toLocaleString('pt-BR')}<div class="barra"><i style="width:${pct}%"></i></div></div></div>`;
  }
  document.getElementById('objetivos').innerHTML = html;
  document.getElementById('placar').textContent = `${est.pontos.toLocaleString('pt-BR')} pontos` + (F.desafio ? ` · 🎯 vencer ${F.desafio.pontos.toLocaleString('pt-BR')}` : '');
  if(F.planeta) F.planeta.progresso(progressoObjetivo());
}

// ---------- entrada (arrastar ou tocar dois planetas) ----------
function celulaDoEvento(e){ return T.celula(e); }
const dentro = p => p.r >= 0 && p.r < ROWS && p.c >= 0 && p.c < COLS;
let toque = null;

function prepararEntrada(){
  const tab = document.getElementById('tabuleiro');
  tab.addEventListener('pointerdown', e => {
    if(!F || F.ocupado) return;
    const cel = celulaDoEvento(e);
    if(!dentro(cel)) return;
    toque = { ...cel, x:e.clientX, y:e.clientY };
    tab.setPointerCapture(e.pointerId);
  });
  tab.addEventListener('pointermove', e => {
    if(!toque || F.ocupado || F.mira) return;
    const dx = e.clientX - toque.x, dy = e.clientY - toque.y;
    if(Math.max(Math.abs(dx), Math.abs(dy)) < F.cel * 0.35) return;
    const alvo = Math.abs(dx) > Math.abs(dy) ? { r:toque.r, c:toque.c + Math.sign(dx) } : { r:toque.r + Math.sign(dy), c:toque.c };
    const origem = { r:toque.r, c:toque.c };
    toque = null;
    selecionar(null);
    if(dentro(alvo)) tentar(origem, alvo);
  });
  tab.addEventListener('pointerup', () => {
    if(!toque) return;
    const cel = { r:toque.r, c:toque.c };
    toque = null;
    if(F.mira){ executarPoder(F.mira, cel); return; }
    if(F.sel && Math.abs(F.sel.r - cel.r) + Math.abs(F.sel.c - cel.c) === 1){ const a = F.sel; selecionar(null); tentar(a, cel); }
    else if(F.sel && F.sel.r === cel.r && F.sel.c === cel.c) selecionar(null);
    else { selecionar(cel); Sons.clique(); }
  });
}

function selecionar(cel){
  if(F.sel) T.marcar(F.board.grid[F.sel.r][F.sel.c].id, 'sel', false);
  F.sel = cel;
  if(cel) T.marcar(F.board.grid[cel.r][cel.c].id, 'sel', true);
}

// ---------- jogada e animação ----------
// Se der erro no meio de uma jogada (animação, 3D, efeito), o tabuleiro não pode ficar
// travado como "ocupado": redesenha a partir do estado do jogo e devolve o controle.
function protegido(acao){
  return async (...args) => {
    const fase = F;
    try { await acao(...args); }
    catch(e){ console.error('[galaxia] erro durante a jogada', e); if(F && F === fase) recuperar(); }
  };
}
function recuperar(){
  F.geracao++;                                   // a animação que estava em andamento para aqui
  limparDica();
  try { T.montar(F.board, F.cel); } catch(e){ console.error('[galaxia] não foi possível redesenhar', e); }
  F.sel = null; F.mira = null; F.tuto = 0;
  F.est.poeira = F.board.dustLeft();
  renderHud(); renderPoderes();
  if(faseVencida()) return vitoria();
  if(F.est.jogadas <= 0 || (F.defesa && F.defesa.escudo <= 0)) return derrota();
  F.ocupado = false; agendarDica();
}
// Reserva: se UMA jogada deixar o tabuleiro "ocupado" por muito tempo sem nenhuma janela aberta
// (fim de fase, quiz, tutorial), alguma promessa ficou presa — destrava. (Antes o tempo era somado
// entre jogadas seguidas e a reserva disparava no meio de uma cascata, duplicando planetas.)
setInterval(() => {
  const preso = F && F.ocupado && !F.tuto && document.getElementById('modal').hidden &&
    document.getElementById('tela-fase').classList.contains('ativa') && !document.hidden;
  if(preso && performance.now() - F.ocupadoDesde > 15000){ console.warn('[galaxia] tabuleiro destravado pela reserva'); recuperar(); }
}, 1500);
// cascata cancelada por recuperar(): a jogada antiga não pode continuar desenhando
const cancelada = (fase, g) => F !== fase || F.geracao !== g;
// fim de fase: a Defesa da Terra tem regras próprias (meteoros e escudo)
const faseVencida = () => F.defesa ? Defesa.venceu(F.defesa) : R.venceu(F.fase, F.est);

const tentar = protegido(async function(a, b){
  if(F.ocupado) return;
  limparDica();
  F.ocupado = true;
  const pa = F.board.grid[a.r][a.c], pb = F.board.grid[b.r][b.c];
  T.mover(pa.id, b.r, b.c); T.mover(pb.id, a.r, a.c);
  Sons.troca();
  await espera(170);
  const res = F.board.play(a, b);
  if(!res.valid){
    T.mover(pa.id, a.r, a.c); T.mover(pb.id, b.r, b.c);
    Sons.invalida(); vibrar(30);
    await espera(180);
    F.ocupado = false; agendarDica();
    return;
  }
  F.est.jogadas--;
  renderHud();
  if(F.tuto === 1) fecharBalao();
  const fase = F, g = F.geracao;
  for(const ph of res.phases){ await animarFase(ph); if(cancelada(fase, g)) return; }
  if(res.shuffled){ toast('Sem jogadas possíveis — embaralhando!'); T.reposicionar(F.board); await espera(380); }
  F.est.poeira = F.board.dustLeft();
  renderHud();
  checarConquistas();
  if(faseVencida()) return vitoria();
  if(F.defesa){ await passoDefesa(); if(cancelada(fase, g)) return; if(F.defesa.escudo <= 0 || F.est.jogadas <= 0) return derrota(); }
  else if(F.est.jogadas <= 0) return derrota();
  if(F.tuto === 1) return tutorialDepoisDaJogada();
  F.ocupado = false;
  agendarDica();
});

// Defesa da Terra: depois de cada jogada os meteoros descem; os que passam da última fileira
// atingem a Terra (escudo -1, tremor, a Terra grande racha) e chega uma onda nova a cada 2 jogadas
async function passoDefesa(){
  const r = Defesa.passo(F.defesa, F.board);
  for(const c of r.colunas){ FX.supernova(7, c, false); T.flash(7, c, '#ff7a2a'); }
  T.sincronizarPoeira(F.board);
  F.est.poeira = F.board.dustLeft();
  if(r.impactos){
    Sons.supernova(); vibrar(180); tremer(); if(F.planeta) F.planeta.tremer();
    toast(F.defesa.escudo > 0 ? `💥 ${r.impactos > 1 ? r.impactos + ' meteoros atingiram' : 'Um meteoro atingiu'} a Terra! Escudo: ${'❤️'.repeat(F.defesa.escudo)}` : '💥 O escudo da Terra acabou!');
  } else if(r.novos.length) Sons.cometa();
  renderHud();
  await espera(r.impactos ? 420 : 160);
}

function centroCasa(r, c){ return T.projetar(r, c); }

function efeito(classe, estilo){
  const el = document.createElement('div');
  el.className = classe; Object.assign(el.style, estilo);
  document.getElementById('fx').appendChild(el);
  setTimeout(() => el.remove(), 1000);
  return el;
}

function efeitosEspeciais(ph){
  for(const f of ph.fx){
    if(f.tipo === 'h' || f.tipo === 'v') contar('cometas');
    if(f.tipo === 'cruz') contar('cometas', 2);
    if(f.tipo === 'bomb') contar('supernovas');
    if(f.tipo === 'hole') contar('buracos');
    if(f.tipo === 'sat') contar('satelites');
    if(f.tipo === 'bigbang') contar('bigbangs');
    if(f.tipo === 'h' || f.tipo === 'v'){ FX.cometa(f.r, f.c, f.tipo); Sons.cometa(); vibrar(40); }
    if(f.tipo === 'cruz'){
      const faixas = f.largo ? [-1, 0, 1] : [0];
      faixas.forEach(d => { if(f.r + d >= 0 && f.r + d < ROWS) FX.cometa(f.r + d, f.c, 'h'); if(f.c + d >= 0 && f.c + d < COLS) FX.cometa(f.r, f.c + d, 'v'); });
      Sons.cometa(); vibrar(60); tremer();
    }
    if(f.tipo === 'bomb'){ FX.supernova(f.r, f.c, !!f.grande); T.flash(f.r, f.c, '#ffb347'); Sons.supernova(); vibrar(80); tremer(); }
    if(f.tipo === 'hole'){ T.flash(f.r, f.c, '#b07bff'); Sons.buraco(); vibrar(120); tremer(); }
    if(f.tipo === 'sat'){ FX.satelite(f.r, f.c, f.alvo); T.flash(f.r, f.c, '#8fd3ff'); if(f.alvo) T.flash(f.alvo[0], f.alvo[1], '#8fd3ff'); Sons.cometa(); vibrar(40); }
    if(f.tipo === 'bigbang'){ Sons.buraco(); setTimeout(() => Sons.supernova(), 650); vibrar(200); tremer(); }
  }
}

function tremer(){
  const t = document.getElementById('tabuleiro');
  t.classList.remove('treme'); void t.offsetWidth; t.classList.add('treme');
}

function zoomCamera(){
  const w = document.querySelector('.tabuleiro-wrap');
  w.classList.remove('zoom'); void w.offsetWidth; w.classList.add('zoom');
}

async function animarFase(ph){
  efeitosEspeciais(ph);
  const coletar = F.fase.objetivos.coletar || {};
  const buraco = ph.fx.find(f => f.tipo === 'hole'), bigbang = ph.fx.some(f => f.tipo === 'bigbang');
  const sugados = [];
  let sx = 0, sy = 0;
  for(const p of ph.cleared){
    const tipo = tipoPeca(p);
    // puxados pelo buraco negro (ou por todos, no Big Bang): o canvas anima a espiral
    if(bigbang || (buraco && p.color === buraco.cor)){ sugados.push({ tipo, r:p.r, c:p.c }); T.esconder(p.id); }
    else if(FX.qualidade === 'leve'){ T.estourar(p.id); FX.explodir(tipo, p.r, p.c); }
    else if(T.explodir){ T.esconder(p.id); T.explodir(tipo, p.r, p.c, p.special ? 1.5 : 1); }   // 3D: fragmentos de verdade
    else { T.esconder(p.id); FX.explodir(tipo, p.r, p.c, p.special ? 1.6 : 1); }
    if(p.color in coletar) F.est.coletado[p.color]++;
    const cc = centroCasa(p.r, p.c); sx += cc.x; sy += cc.y;
  }
  if(buraco) FX.buracoNegro(buraco.r, buraco.c, sugados);
  if(bigbang) FX.bigBang(sugados);
  if(ph.cleared.length && !buraco && !bigbang){            // luz da explosão iluminando os vizinhos (3D)
    const m = ph.cleared[Math.floor(ph.cleared.length / 2)];
    T.flash(m.r, m.c, COR_LUZ[tipoPeca(m)] || '#ffd27a');
  }
  if(ph.combo >= 3 || ph.fx.some(f => ['bomb', 'hole', 'bigbang'].includes(f.tipo))){ zoomCamera(); if(F.planeta) F.planeta.tremer(); }
  for(const [r, c] of ph.dustCleared){ T.poeira(r, c); F.est.poeira--; if(F.defesa) F.defesa.destruidos++; }
  F.est.pontos += ph.score;
  if(ph.cleared.length){
    Sons.estouro(ph.combo);
    vibrar(ph.combo > 1 ? 25 : 12);
    efeito('flutua', { left:`${sx / ph.cleared.length}px`, top:`${sy / ph.cleared.length}px` }).textContent = `+${ph.score}`;
  }
  if(ph.combo >= 2){
    const t = efeito('combo', {});
    t.textContent = ph.combo >= 4 ? `Incrível! x${ph.combo}` : `Combo x${ph.combo}!`;
  }
  renderHud();
  // dá tempo para a espiral do buraco negro / supernova antes de os planetas caírem
  await espera(buraco || bigbang ? 720 : ph.fx.some(f => f.tipo === 'bomb') ? 330 : 230);
  for(const p of ph.cleared) T.remover(p.id);
  if(ph.created.length) Sons.criouEspecial();
  maximo('maxCombo', ph.combo);
  for(const p of ph.created) dica(p.special === 'v' ? 'h' : p.special);
  if(ph.created.length && F.board.grid.flat().filter(p => p && p.special).length >= 2) dica('especial');
  for(const p of ph.created) T.criar(p, p.r, p.c, { nasce:true });
  for(const m of ph.falls) T.mover(m.id, m.r, m.c);
  for(const p of ph.spawns) T.criar(p, p.r, p.c, { deR:p.fromR });
  await espera(290);
}

// ---------- dica depois de alguns segundos parado ----------
function agendarDica(){
  limparDica();
  F.dicaTimer = setTimeout(() => {
    if(!F || F.ocupado) return;
    const moves = F.board.validMoves();
    if(!moves.length) return;
    const [a, b] = moves[Math.floor(Math.random() * moves.length)];
    F.dica = [F.board.grid[a.r][a.c].id, F.board.grid[b.r][b.c].id];
    F.dica.forEach(id => T.marcar(id, 'dica', true));
  }, 7000);
}
function limparDica(){
  if(!F) return;
  clearTimeout(F.dicaTimer);
  if(T) (F.dica || []).forEach(id => T.marcar(id, 'dica', false));
  F.dica = null;
}

// ---------- fim de fase ----------
async function vitoria(){
  F.ocupado = true;
  if(F.defesa) return vitoriaDefesa();
  const { i, fase, est } = F;
  if(F.planeta){ F.planeta.progresso(1); F.planeta.explodir(); Sons.supernova(); vibrar(150); await espera(1500); }
  if(F.desafio){ est.pontos += est.jogadas * 250; return resultadoDesafio(true); }
  const estrelas = R.estrelas(fase, est);
  const bonus = est.jogadas * 250;
  est.pontos += bonus;
  const nova = !salvo.cartas.includes(i), eraDourada = ehDourada(i), natalEraDourada = ehDourada('natal');
  salvo.estrelas[i] = Math.max(salvo.estrelas[i] || 0, estrelas);
  const virouDourada = !eraDourada && ehDourada(i);
  if(ehNatal(i) && !natalEraDourada && ehDourada('natal')) setTimeout(() => toast(temCartaNatal() ? '✦ Sua carta Terra Nevada virou DOURADA!' : '✦ 15 estrelas no Polo Norte: a Terra Nevada do dia 25 já vem Dourada!'), 900);
  if(nova) salvo.cartas.push(i);
  contar('vitorias');
  gravar();
  checarConquistas();
  if(estrelas === 3) ganharPoder(null, '3 estrelas');
  if(fase.numero === 5){ ganharPoder(null, 'Chefe derrotado'); ganharPoder(null, 'Chefe derrotado'); }
  Sons.vitoria(); vibrar(60);
  const c = cartaDaFase(i), m = TODOS_MUNDOS[fase.mundo];
  const fimDoMundo = fase.numero === 5, fimDoJogo = i === BASE - 1;
  // "Próxima" só dentro do mesmo trecho: a viagem termina no Sol e o Polo Norte na 5ª fase dele
  const temProxima = i + 1 < TODAS.length && i !== BASE - 1;
  abrirModal(`<h3>${fimDoJogo ? 'Viagem completa! 🌞' : fimDoMundo ? `${m.nome} conquistado! ${m.evento ? '🎄' : '🏆'}` : 'Fase concluída!'}</h3>
    ${fimDoJogo ? '<p class="final">Você atravessou o Sistema Solar inteiro, de Mercúrio a Plutão, e voltou ao Sol. Parabéns, astronauta!</p>' : ''}
    <div class="estrelas-grandes">${[0, 1, 2].map(k => `<span class="${k < estrelas ? 'on' : ''}" style="animation-delay:${0.2 + k * 0.25}s">★</span>`).join('')}</div>
    <p>${est.pontos.toLocaleString('pt-BR')} pontos${bonus ? ` · bônus de ${est.jogadas} jogada(s) sobrando: +${bonus.toLocaleString('pt-BR')}` : ''}</p>
    <p class="carta-titulo">${nova ? '🃏 Nova carta para o álbum!' + (virouDourada ? ' ✦ E já veio Dourada!' : '') : virouDourada ? '✦ Carta DOURADA desbloqueada!' : '🃏 Carta do álbum'} <small>(toque para ampliar)</small></p>
    <div class="carta-vitoria">${cartaHTML(i)}</div>
    <button type="button" class="btn desafiar" onclick="desafiar(${i}, ${F.seed}, ${est.pontos})">🎯 Desafiar um amigo</button>
    <div class="acoes">
      <button type="button" class="btn" onclick="fecharModal(); mostrarTela('mapa')">Mapa</button>
      ${temProxima ? `<button type="button" class="btn primario" onclick="fecharModal(); abrirFase(${i + 1})">Próxima →</button>`
        : `<button type="button" class="btn primario" onclick="fecharModal(); mostrarTela('album')">Ver álbum completo</button>`}
    </div>`);
  document.querySelector('.carta-vitoria .carta-pk').onclick = () => verCarta(i);
  for(let k = 0; k < estrelas; k++) setTimeout(() => Sons.estrela(k), 250 + k * 250);
}

function derrota(){
  F.ocupado = true;
  if(F.defesa) return derrotaDefesa();
  if(F.desafio) return resultadoDesafio(false);
  const { fase, est } = F, o = fase.objetivos;
  Sons.derrota();
  const falta = [];
  if(o.coletar) for(const [cor, n] of Object.entries(o.coletar)){
    const f = n - est.coletado[cor]; if(f > 0) falta.push(`<div class="obj"><img src="${sprite(PECAS[cor].id, 64, ROTACAO[PECAS[cor].id])}" alt="">${f}</div>`);
  }
  if(o.poeira && est.poeira) falta.push(`<div class="obj"><span class="poeira-ico"></span>${est.poeira}</div>`);
  if(o.pontos && est.pontos < o.pontos) falta.push(`<div class="obj">⭐ faltam ${(o.pontos - est.pontos).toLocaleString('pt-BR')}</div>`);
  const podeExtra = !F.extraUsado && salvo.cartas.length >= 1;
  abrirModal(`<h3>Acabaram as jogadas!</h3><p>Faltou pouco:</p><div class="falta">${falta.join('')}</div>
    <div class="acoes" style="flex-direction:column">
      ${podeExtra ? '<button type="button" class="btn primario" onclick="jogadasExtras()">🧠 Responder e ganhar +5 jogadas</button>' : ''}
      ${podeGanharConvite() ? '<button type="button" class="btn primario" onclick="convidar(true)">📤 Convidar um amigo e ganhar +5 jogadas</button>' : ''}
      <div style="display:flex;gap:10px;justify-content:center">
        <button type="button" class="btn" onclick="fecharModal(); mostrarTela('mapa')">Mapa</button>
        <button type="button" class="btn" onclick="fecharModal(); abrirFase(${F.i}, { comQuiz:false })">Tentar de novo</button>
      </div>
    </div>`);
}

// ---------- Defesa da Terra (modo especial) ----------
const FASE_DEFESA = { id:'defesa', mundo:2, numero:0, cores:Defesa.CONFIG.cores, jogadas:Defesa.CONFIG.jogadas, objetivos:{}, poeira:null, defesa:true };
function abrirDefesa(){
  if(!liberada(10)) return;
  Sons.clique();
  const d = salvo.defesa;
  abrirModal(`<h3>☄️ Defesa da Terra</h3>
    <p>Uma chuva de meteoros vem em direção à Terra! Combine planetas <b>em cima dos meteoros</b> para destruí-los. A cada jogada eles descem uma fileira — se passarem da última, atingem a Terra.</p>
    <div class="defesa-regras"><div>☄️ Destrua <b>${Defesa.CONFIG.meta}</b></div><div>❤️ Escudo: <b>${Defesa.CONFIG.escudo}</b></div><div>⏱️ <b>${Defesa.CONFIG.jogadas}</b> jogadas</div></div>
    <div class="carta"><div><small>Você sabia?</small><p>Há 66 milhões de anos, um asteroide de uns 10 km caiu onde hoje é o México e ajudou a extinguir os dinossauros. Em 2022, a missão DART da NASA bateu de propósito no asteroide Dimorfo e mudou a órbita dele: foi o primeiro teste de defesa planetária.</p></div></div>
    ${d.vitorias ? `<p class="opcao-ajuda">Suas vitórias: ${d.vitorias} · recorde: ${d.melhor} jogada${d.melhor === 1 ? '' : 's'} sobrando</p>` : ''}
    <div class="acoes"><button type="button" class="btn" onclick="fecharModal()">Voltar</button>
      <button type="button" class="btn primario" onclick="fecharModal(); iniciarDefesa()">Defender a Terra!</button></div>`);
}
function iniciarDefesa(){
  salvo.defesa.partidas++; gravar();
  aplicarTema(2);
  iniciarFase(-1, 0, FASE_DEFESA);
}
async function vitoriaDefesa(){
  const { est, defesa:d } = F;
  const recorde = est.jogadas > salvo.defesa.melhor;
  salvo.defesa.vitorias++; salvo.defesa.melhor = Math.max(salvo.defesa.melhor, est.jogadas);
  contar('vitorias'); gravar(); checarConquistas();
  ganharPoder(null, 'Terra salva');
  Sons.vitoria(); vibrar(80);
  abrirModal(`<h3>🌍 Terra salva!</h3>
    <div class="estrelas-grandes"><span class="on">🛡️</span></div>
    <p>${d.destruidos} meteoros destruídos · escudo ${'❤️'.repeat(d.escudo)}${'🖤'.repeat(d.cfg.escudo - d.escudo)} · ${est.jogadas} jogada${est.jogadas === 1 ? '' : 's'} sobrando</p>
    ${recorde ? '<p class="carta-titulo">🏆 Novo recorde!</p>' : ''}
    <div class="acoes"><button type="button" class="btn" onclick="fecharModal(); mostrarTela('mapa')">Mapa</button>
      <button type="button" class="btn primario" onclick="fecharModal(); iniciarDefesa()">Jogar de novo</button></div>`);
}
function derrotaDefesa(){
  const d = F.defesa;
  Sons.derrota();
  abrirModal(`<h3>${d.escudo <= 0 ? '💥 A Terra foi atingida!' : '⏱️ Acabaram as jogadas!'}</h3>
    <p>Você destruiu <b>${d.destruidos}</b> de ${d.cfg.meta} meteoros.</p>
    <p class="opcao-ajuda">Dica: destrua primeiro os meteoros mais baixos — são os que estão quase chegando.</p>
    <div class="acoes"><button type="button" class="btn" onclick="fecharModal(); mostrarTela('mapa')">Mapa</button>
      <button type="button" class="btn primario" onclick="fecharModal(); iniciarDefesa()">Tentar de novo</button></div>`);
}

// Uma vez por tentativa: acertar a pergunta devolve 5 jogadas.
function jogadasExtras(){
  F.extraUsado = true;
  mostrarQuiz({ titulo:'🧠 Valendo +5 jogadas', texto:'Sobre uma das suas cartas:', aoFim: ok => {
    if(ok){ F.est.jogadas += 5; renderHud(); F.ocupado = false; agendarDica(); toast('+5 jogadas! Continue.'); }
    else derrota();
  } });
}

function sairDaFase(){
  abrirModal(`<h3>Sair da fase?</h3><p>O progresso desta tentativa será perdido.</p>
    <div class="acoes"><button type="button" class="btn" onclick="fecharModal()">Continuar jogando</button>
    <button type="button" class="btn primario" onclick="fecharModal(); limparDica(); F = null; mostrarTela('mapa')">Sair</button></div>`);
}

// ---------- área segura (barra de status e de navegação do celular) ----------
// Mede em pixels o espaço que as barras do sistema ocupam (via CSS env()). No app Android que
// desenha por trás das barras e cujo WebView não informa o env(), usa um reforço: 28 px em cima
// (barra de status) e 44 px embaixo (barra de navegação).
function areaSegura(){
  const sonda = document.createElement('div');
  sonda.style.cssText = 'position:fixed;visibility:hidden;padding-top:var(--seguro-topo);padding-bottom:var(--seguro-baixo)';
  document.body.appendChild(sonda);
  const cs = getComputedStyle(sonda), r = { topo:parseFloat(cs.paddingTop) || 0, baixo:parseFloat(cs.paddingBottom) || 0 };
  sonda.remove();
  return r;
}
function ajustarAreaSegura(){
  const raiz = document.documentElement.style;
  raiz.removeProperty('--topo-extra'); raiz.removeProperty('--baixo-extra');
  const app = !!window.__TAURI_INTERNALS__ && /Android/i.test(navigator.userAgent);
  const telaCheia = innerHeight >= screen.height - 8;          // o app ocupa a tela inteira, por trás das barras
  const s = areaSegura();
  if(app && telaCheia && s.topo === 0) raiz.setProperty('--topo-extra', '28px');
  if(app && telaCheia && s.baixo === 0) raiz.setProperty('--baixo-extra', '44px');
}

// ---------- início ----------
function iniciarApp(){
  ajustarAreaSegura();
  document.getElementById('logo-img').src = sprite('saturno', 96, 0.3);
  // o fundo é enfeite: um erro nele nunca pode impedir o mapa de aparecer
  try { Fundo.redimensionar(); } catch(e){ console.warn('[galaxia] fundo', e); }
  FX.init(document.getElementById('tabuleiro'), sprite, ROTACAO);
  FX.preCarregar([...PECAS.map(p => p.id), 'buraco']);
  document.getElementById('versao').textContent = 'v' + VERSAO_APP;
  tab2d = criarTab2D({ tabuleiro:document.getElementById('tabuleiro'), sprite, rotacoes:ROTACAO, tipoPeca });
  prepararEntrada();
  try {
    Sistema = GalaxySistema.criar(document.getElementById('sistema'), { mundos:MUNDOS, aoTocar:tocarPlaneta,
      sprite:(id, tam) => (Natal.ativo() && spritesGorro[id]) || sprite(id, tam, 0.7) });
  } catch(e){ console.warn('[galaxia] sistema solar', e); Sistema = null; }
  renderMapa();
  // fotos dos planetas com textura real (mapa, objetivos, álbum, estilhaços)
  if(window.Galaxy3D && Galaxy3D.suportado()) Galaxy3D.gerarSprites(256).then(fotos => {
    Object.assign(spritesReais, fotos);
    FX.recarregar([...PECAS.map(p => p.id), 'buraco']);
    document.getElementById('logo-img').src = sprite('saturno');
    if(document.getElementById('tela-mapa').classList.contains('ativa')) renderMapa();
    // fotos com gorro 3D só no evento (render à parte, depois das normais)
    if(!Natal.ativo()) return;
    return Galaxy3D.gerarSprites(256, { comGorro:true }).then(f => {
      Object.assign(spritesGorro, f); document.body.classList.add('gorro3d');
      if(document.getElementById('tela-mapa').classList.contains('ativa')) renderMapa();
    });
  }).catch(e => console.warn('fotos 3D indisponíveis', e));
}
// render3d.js é um módulo (carrega depois dos scripts comuns, antes do DOMContentLoaded)
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciarApp); else iniciarApp();
let redimensionar;
addEventListener('resize', () => {
  ajustarAreaSegura();
  clearTimeout(redimensionar);
  redimensionar = setTimeout(() => {
    try { Fundo.redimensionar(); } catch(e){ console.warn('[galaxia] fundo', e); }
    if(Sistema) Sistema.redimensionar();
    if(F && T && document.getElementById('tela-fase').classList.contains('ativa')){ calcularCasa(); T.reposicionar(F.board, F.cel); }
  }, 150);
});
// reforço contra zoom (navegadores que ignoram o user-scalable=no): pinça e toque duplo
addEventListener('gesturestart', e => e.preventDefault());
let ultimoToque = 0;
addEventListener('touchend', e => { const t = Date.now(); if(t - ultimoToque < 320 && !e.target.closest('input,textarea')) e.preventDefault(); ultimoToque = t; }, { passive:false });
if('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
window.__galaxia = { get Sistema(){ return Sistema; }, tocarPlaneta, abrirDefesa, iniciarDefesa, FASE_DEFESA, get F(){ return F; }, get T(){ return T; }, get salvo(){ return salvo; }, abrirFase, FASES, TODAS, CONQUISTAS, abrirCalendario, abrirPorta, estadoNatal };
