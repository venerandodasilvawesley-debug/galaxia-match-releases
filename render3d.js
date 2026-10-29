/* =========================================================
   GALÁXIA MATCH — TABULEIRO 3D (three.js / WebGL)
   Esferas com texturas reais (texturas/, CC BY 4.0 — ver
   texturas/CREDITOS.txt), girando no eixo com a inclinação
   real de cada planeta, luz do "Sol", atmosfera, anel de
   Saturno, especiais em 3D e luz das explosões. Câmera
   levemente inclinada; toque convertido em casa por raycast.
   Mesma interface do tabuleiro 2D (tab2d.js).
   ========================================================= */
import * as THREE from './vendor/three.module.min.js';

const TIPOS = ['marte', 'jupiter', 'saturno', 'terra', 'netuno', 'lua', 'mercurio', 'venus', 'urano', 'plutao', 'sol'];
const INCLINACAO = { terra:23.4, marte:25.2, jupiter:3.1, saturno:26.7, netuno:28.3, lua:6.7, mercurio:0.1, venus:177.4, urano:97.8, plutao:122.5, sol:7.25 };
const GIRO = { terra:0.55, marte:0.5, jupiter:1.0, saturno:0.9, netuno:0.7, lua:0.2, mercurio:0.15, venus:0.12, urano:0.6, plutao:0.15, sol:0.08 }; // rad/s (estilizado)
const ATMOS = { sol:'#ffb347', terra:'#7fb6ff', netuno:'#7d9cff', urano:'#a8f0f2', venus:'#ffe2a0', jupiter:'#ffd9b0', saturno:'#ffe6b0', marte:'#ff9a70' };
const RAIO = 0.42, RAIO_SATURNO = 0.31;

// ---------- texturas desenhadas em canvas (brilho, rastro, disco, poeira, painel) ----------
function canvasTex(tam, desenhar){
  const cv = document.createElement('canvas'); cv.width = cv.height = tam;
  desenhar(cv.getContext('2d'), tam);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const texBrilho = () => canvasTex(128, (c, s) => {
  const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, s, s);
});
const texAtmosfera = () => canvasTex(128, (c, s) => {
  // anel suave: transparente no meio (onde fica o planeta), brilho na borda
  const g = c.createRadialGradient(s / 2, s / 2, s * 0.30, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.35, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, s, s);
});
const texRastro = () => canvasTex(128, (c, s) => {
  const g = c.createLinearGradient(0, 0, s, 0);
  g.addColorStop(0, 'rgba(160,210,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(160,210,255,0)');
  c.fillStyle = g; c.fillRect(0, s * 0.42, s, s * 0.16);
  const v = c.createLinearGradient(0, s * 0.3, 0, s * 0.7);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.5, 'rgba(255,255,255,.35)'); v.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = v; c.fillRect(s * 0.15, s * 0.3, s * 0.7, s * 0.4);
});
const texDisco = () => canvasTex(256, (c, s) => {
  const g = c.createRadialGradient(s / 2, s / 2, s * 0.2, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,250,220,0)'); g.addColorStop(0.12, 'rgba(255,245,200,1)'); g.addColorStop(0.35, 'rgba(255,170,60,.9)');
  g.addColorStop(0.7, 'rgba(210,70,20,.5)'); g.addColorStop(1, 'rgba(120,20,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, s, s);
});
const texPoeira = () => canvasTex(128, (c, s) => {
  const g = c.createRadialGradient(s * 0.4, s * 0.4, 0, s / 2, s / 2, s * 0.6);
  g.addColorStop(0, 'rgba(210,170,255,.9)'); g.addColorStop(0.5, 'rgba(120,70,200,.6)'); g.addColorStop(1, 'rgba(40,20,80,0)');
  c.fillStyle = g; c.fillRect(0, 0, s, s);
});
// moldura da poeira cósmica: fica NA FRENTE, em volta do planeta (o fundo roxo sozinho
// ficava escondido atrás das esferas e quase não aparecia no 3D)
const texMolduraPoeira = () => canvasTex(128, (c, s) => {
  const m = 7, r = 22;
  c.shadowColor = 'rgba(190,120,255,1)'; c.shadowBlur = 10;
  c.strokeStyle = 'rgba(215,170,255,.95)'; c.lineWidth = 6;
  c.beginPath(); c.roundRect(m, m, s - 2 * m, s - 2 * m, r); c.stroke();
  c.shadowBlur = 0; c.fillStyle = 'rgba(255,235,255,.95)';
  [[0.18, 0.2], [0.8, 0.16], [0.86, 0.78], [0.2, 0.84], [0.5, 0.1]].forEach(([x, y]) => { c.beginPath(); c.arc(x * s, y * s, 2.6, 0, 7); c.fill(); });
});
// gelo do Polo Norte (evento de Natal): mesma mecânica da poeira, com cara de gelo
const texGelo = () => canvasTex(128, (c, s) => {
  const g = c.createRadialGradient(s * 0.4, s * 0.4, 0, s / 2, s / 2, s * 0.6);
  g.addColorStop(0, 'rgba(235,250,255,.95)'); g.addColorStop(0.5, 'rgba(130,200,240,.6)'); g.addColorStop(1, 'rgba(30,80,120,0)');
  c.fillStyle = g; c.fillRect(0, 0, s, s);
});
const texMolduraGelo = () => canvasTex(128, (c, s) => {
  const m = 7, r = 22;
  c.shadowColor = 'rgba(150,220,255,1)'; c.shadowBlur = 10;
  c.strokeStyle = 'rgba(210,240,255,.95)'; c.lineWidth = 6;
  c.beginPath(); c.roundRect(m, m, s - 2 * m, s - 2 * m, r); c.stroke();
  c.shadowBlur = 0; c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2.5; c.lineCap = 'round';
  // trincas do gelo nos cantos
  [[[0.12, 0.3], [0.24, 0.22], [0.3, 0.12]], [[0.88, 0.7], [0.78, 0.8], [0.7, 0.9]], [[0.86, 0.14], [0.8, 0.26]]].forEach(l => {
    c.beginPath(); l.forEach(([x, y], k) => k ? c.lineTo(x * s, y * s) : c.moveTo(x * s, y * s)); c.stroke(); });
});
// meteoro (Defesa da Terra): rocha com rastro de fogo para cima (ele está caindo)
const texMeteoro = () => canvasTex(128, (c, s) => {
  const fogo = c.createLinearGradient(0, 0, 0, s * 0.62);
  fogo.addColorStop(0, 'rgba(255,120,20,0)'); fogo.addColorStop(1, 'rgba(255,170,60,.85)');
  c.fillStyle = fogo; c.beginPath(); c.moveTo(s * 0.32, 0); c.lineTo(s * 0.68, 0); c.lineTo(s * 0.74, s * 0.6); c.lineTo(s * 0.26, s * 0.6); c.fill();
  const g = c.createRadialGradient(s * 0.44, s * 0.6, 2, s / 2, s * 0.66, s * 0.3);
  g.addColorStop(0, '#b98b63'); g.addColorStop(0.55, '#6b4a33'); g.addColorStop(1, '#2b1d14');
  c.fillStyle = g; c.beginPath(); c.ellipse(s / 2, s * 0.66, s * 0.3, s * 0.27, 0.3, 0, 7); c.fill();
  c.fillStyle = 'rgba(30,18,10,.6)';
  [[0.42, 0.6, 0.06], [0.58, 0.72, 0.05], [0.5, 0.78, 0.035]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x * s, y * s, r * s, 0, 7); c.fill(); });
});
// moldura do meteoro: fica NA FRENTE do planeta — borda de fogo + rocha em chamas no canto
const texMolduraMeteoro = () => canvasTex(128, (c, s) => {
  const m = 6, r = 22;
  c.shadowColor = 'rgba(255,120,30,1)'; c.shadowBlur = 14;
  c.strokeStyle = 'rgba(255,170,70,1)'; c.lineWidth = 8;
  c.beginPath(); c.roundRect(m, m, s - 2 * m, s - 2 * m, r); c.stroke();
  c.shadowBlur = 0;
  const fogo = c.createRadialGradient(s * 0.16, s * 0.14, 1, s * 0.16, s * 0.14, s * 0.2);
  fogo.addColorStop(0, 'rgba(255,230,140,1)'); fogo.addColorStop(0.5, 'rgba(255,130,30,.85)'); fogo.addColorStop(1, 'rgba(255,80,0,0)');
  c.fillStyle = fogo; c.beginPath(); c.ellipse(s * 0.17, s * 0.15, s * 0.15, s * 0.21, -0.7, 0, 7); c.fill();
  const g = c.createRadialGradient(s * 0.21, s * 0.24, 1, s * 0.24, s * 0.27, s * 0.13);
  g.addColorStop(0, '#c49a70'); g.addColorStop(0.6, '#6b4a33'); g.addColorStop(1, '#2b1d14');
  c.fillStyle = g; c.beginPath(); c.arc(s * 0.25, s * 0.27, s * 0.12, 0, 7); c.fill();
});
const texPainel = () => canvasTex(512, (c, s) => {
  const r = 28;
  c.fillStyle = 'rgba(8,10,24,.78)';
  c.beginPath(); c.roundRect(4, 4, s - 8, s - 8, r); c.fill();
  const casa = (s - 8) / 8;
  for(let y = 0; y < 8; y++) for(let x = 0; x < 8; x++) if((x + y) % 2){ c.fillStyle = 'rgba(255,255,255,.035)'; c.fillRect(4 + x * casa, 4 + y * casa, casa, casa); }
  c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 3; c.beginPath(); c.roundRect(4, 4, s - 8, s - 8, r); c.stroke();
});

const texFogo = () => canvasTex(128, (c, s) => {
  const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(255,244,190,1)'); g.addColorStop(0.42, 'rgba(255,150,50,.9)');
  g.addColorStop(0.7, 'rgba(170,40,15,.45)'); g.addColorStop(1, 'rgba(60,10,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, s, s);
});
const texFumaca = () => canvasTex(128, (c, s) => {
  // fumaça irregular: várias manchas sobrepostas
  let semente = 7; const rnd = () => (semente = (semente * 16807) % 2147483647) / 2147483647;
  for(let i = 0; i < 9; i++){
    const x = s * (0.3 + rnd() * 0.4), y = s * (0.3 + rnd() * 0.4), r = s * (0.18 + rnd() * 0.18);
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, s, s);
  }
});

// Fragmentos da esfera: os triângulos são agrupados pela direção mais próxima entre
// N pontos espalhados na esfera (como células de Voronoi). Cada fragmento tem a casca
// externa (textura do planeta, grupo 0) e uma casca interna (rocha incandescente, grupo 1),
// com o centro deslocado para o próprio fragmento girar em torno de si.
function gerarFragmentos(raio, n = 10){
  const esfera = new THREE.SphereGeometry(raio, 24, 16).toNonIndexed();
  const pos = esfera.attributes.position, uv = esfera.attributes.uv, nor = esfera.attributes.normal;
  const dirs = Array.from({ length:n }, (_, i) => {                 // pontos de Fibonacci
    const y = 1 - (i + 0.5) * 2 / n, r = Math.sqrt(1 - y * y), a = i * 2.39996;
    return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
  });
  const grupos = dirs.map(() => []);
  const v = new THREE.Vector3();
  for(let t = 0; t < pos.count; t += 3){
    v.set(0, 0, 0); for(let k = 0; k < 3; k++) v.add(new THREE.Vector3().fromBufferAttribute(pos, t + k));
    v.normalize();
    let melhor = 0, d = -2;
    dirs.forEach((dir, i) => { const x = dir.dot(v); if(x > d){ d = x; melhor = i; } });
    grupos[melhor].push(t);
  }
  return grupos.map((tris, i) => {
    const P = [], U = [], N = [];
    const centro = dirs[i].clone().multiplyScalar(raio * 0.75);
    const empurra = (arr, j, escala) => { arr.push(pos.getX(j) * escala - centro.x, pos.getY(j) * escala - centro.y, pos.getZ(j) * escala - centro.z); };
    for(const t of tris) for(let k = 0; k < 3; k++){ const j = t + k; empurra(P, j, 1); U.push(uv.getX(j), uv.getY(j)); N.push(nor.getX(j), nor.getY(j), nor.getZ(j)); }
    const externos = P.length / 3;
    for(const t of tris) for(const k of [0, 2, 1]){ const j = t + k; empurra(P, j, 0.55); U.push(uv.getX(j), uv.getY(j)); N.push(-nor.getX(j), -nor.getY(j), -nor.getZ(j)); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    g.addGroup(0, externos, 0); g.addGroup(externos, P.length / 3 - externos, 1);
    return { geo:g, dir:dirs[i], centro };
  });
}

// Anel com UV radial: u vai da borda interna (0) à externa (1).
function geometriaAnel(rIn, rOut){
  const g = new THREE.RingGeometry(rIn, rOut, 96, 1);
  const p = g.attributes.position, uv = g.attributes.uv;
  for(let i = 0; i < p.count; i++){ const d = Math.hypot(p.getX(i), p.getY(i)); uv.setXY(i, (d - rIn) / (rOut - rIn), 0.5); }
  return g;
}

// ---------- recursos compartilhados ----------
let R = null; // { tex, geo, mat, ... }
async function carregarRecursos(renderer){
  if(R) return R;
  const loader = new THREE.TextureLoader();
  const aniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const carrega = async nome => { const t = await loader.loadAsync(`texturas/${nome}`); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; };
  const tex = {};
  await Promise.all([...TIPOS.map(async t => { tex[t] = await carrega(t + '.jpg'); }),
    (async () => { tex.nuvens = await carrega('terra-nuvens.jpg'); tex.nuvens.colorSpace = THREE.NoColorSpace; })(),
    (async () => { tex.anel = await carrega('saturno-anel.png'); })()]);
  R = {
    tex,
    geo: new THREE.SphereGeometry(RAIO, 36, 24),
    geoSaturno: new THREE.SphereGeometry(RAIO_SATURNO, 36, 24),
    geoNuvens: new THREE.SphereGeometry(RAIO * 1.015, 36, 24),
    geoAnel: geometriaAnel(RAIO_SATURNO * 1.24, RAIO_SATURNO * 2.15),
    geoDisco: new THREE.RingGeometry(0.2, 0.62, 64, 1),
    geoBuraco: new THREE.SphereGeometry(0.2, 32, 16),
    geoPoeira: new THREE.PlaneGeometry(0.96, 0.96),
    mat: Object.fromEntries(TIPOS.map(t => [t, new THREE.MeshStandardMaterial({ map:tex[t], roughness:0.92, metalness:0 })])),
    // o Sol brilha por conta própria (não depende da luz da cena)
    matSol: new THREE.MeshStandardMaterial({ map:tex.sol, emissive:0xffffff, emissiveMap:tex.sol, emissiveIntensity:1.1, roughness:1 }),
    matNuvens: new THREE.MeshStandardMaterial({ color:0xffffff, alphaMap:tex.nuvens, transparent:true, depthWrite:false, roughness:1 }),
    // anel sem depender do ângulo da luz: inclinado para a câmera ele ficaria quase de lado para o Sol (escuro);
    // os anéis reais aparecem claros porque espalham a luz
    // toneMapped:false: o ajuste de tons (ACES) escurecia o anel; alphaMap reforçado deixa o anel
    // firme mesmo em resolução baixa (antes ficava "apagado", quase transparente)
    matAnel: new THREE.MeshBasicMaterial({ map:tex.anel, color:0xfff3dc, transparent:true, side:THREE.DoubleSide, depthWrite:false, toneMapped:false, opacity:1 }),
    matBuraco: new THREE.MeshBasicMaterial({ color:0x000000 }),
    texBrilho: texBrilho(), texAtmos: texAtmosfera(), texRastro: texRastro(), texDisco: texDisco(), texPoeira: texPoeira(), texMoldura: texMolduraPoeira(), texGelo: texGelo(), texMolduraGelo: texMolduraGelo(), texMeteoro: texMeteoro(), texMolduraMeteoro: texMolduraMeteoro(), texPainel: texPainel(),
  };
  R.mat.sol = R.matSol;
  R.matDisco = new THREE.MeshBasicMaterial({ map:R.texDisco, transparent:true, side:THREE.DoubleSide, blending:THREE.AdditiveBlending, depthWrite:false });
  R.matPoeira = new THREE.MeshBasicMaterial({ map:R.texPoeira, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false });
  R.matGelo = new THREE.MeshBasicMaterial({ map:R.texGelo, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false });
  // o meteoro é rocha escura: mistura normal (aditiva sumiria no fundo)
  R.matMeteoro = new THREE.MeshBasicMaterial({ map:R.texMeteoro, transparent:true, depthWrite:false });
  R.matMoldura = new THREE.MeshBasicMaterial({ map:R.texMoldura, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false });
  // explosão 3D
  R.frags = gerarFragmentos(RAIO);
  R.matLava = new THREE.MeshStandardMaterial({ color:0x2a0800, emissive:0xff5a1a, emissiveIntensity:2.2, roughness:1, side:THREE.DoubleSide });
  R.texFogo = texFogo(); R.texFumaca = texFumaca();
  R.geoOnda = new THREE.RingGeometry(0.86, 1, 48, 1);
  return R;
}

function sprite(textura, cor, escala, opacidade = 1, rotacao = 0){
  const m = new THREE.SpriteMaterial({ map:textura, color:new THREE.Color(cor), transparent:true, opacity:opacidade, blending:THREE.AdditiveBlending, depthWrite:false, rotation:rotacao });
  const s = new THREE.Sprite(m); s.scale.set(escala[0], escala[1], 1);
  return s;
}

// Monta um planeta (ou especial) como grupo: inclinação → corpo que gira.
function montarPlaneta(tipo, especial, { comAtmosfera = true } = {}){
  const g = new THREE.Group(), eixo = new THREE.Group();
  g.add(eixo);
  const ud = g.userData = { tipo, especial, eixo, corpo:null, giro:GIRO[tipo] || 0.5, fase:Math.random() * 10 };
  if(especial === 'hole'){
    const buraco = new THREE.Mesh(R.geoBuraco, R.matBuraco);
    const disco = new THREE.Mesh(R.geoDisco, R.matDisco);
    disco.rotation.x = -1.15;
    const halo = sprite(R.texBrilho, '#b07bff', [1.5, 1.5], 0.7);
    g.add(halo, disco, buraco);
    ud.disco = disco; ud.halo = halo;
    // o buraco negro também precisa do brilho de seleção/dica: sem ele, o quadro 3D dava erro
    // a cada desenho e a tela congelava enquanto houvesse um buraco negro no tabuleiro
    const sel = sprite(R.texBrilho, '#ffffff', [1.25, 1.25], 0.0); g.add(sel); ud.brilhoSel = sel;
    return g;
  }
  eixo.rotation.z = THREE.MathUtils.degToRad(INCLINACAO[tipo] || 0);
  const saturno = tipo === 'saturno';
  const mat = especial === 'bomb' ? R.mat[tipo].clone() : R.mat[tipo];
  const corpo = new THREE.Mesh(saturno ? R.geoSaturno : R.geo, mat);
  corpo.rotation.y = ud.fase;
  eixo.add(corpo); ud.corpo = corpo;
  if(tipo === 'terra'){ const n = new THREE.Mesh(R.geoNuvens, R.matNuvens); eixo.add(n); ud.nuvens = n; }
  // anel inclinado para a câmera (de perfil ele viraria uma linha)
  if(saturno){ const a = new THREE.Mesh(R.geoAnel, R.matAnel); a.rotation.x = Math.PI / 2 - 0.62; eixo.add(a); }
  if(comAtmosfera && ATMOS[tipo]){
    const r = (saturno ? RAIO_SATURNO : RAIO) * 2.9;
    const atm = sprite(R.texAtmos, ATMOS[tipo], [r, r], tipo === 'sol' ? 1 : tipo === 'terra' || tipo === 'netuno' ? 0.75 : 0.45);
    atm.renderOrder = -1; g.add(atm);
  }
  if(especial === 'h' || especial === 'v'){
    const rastro = sprite(R.texRastro, '#cfe9ff', [1.55, 1.55], 0.95, especial === 'v' ? Math.PI / 2 : 0);
    g.add(rastro); ud.rastro = rastro;
  }
  if(especial === 'sat'){
    // satélite artificial em órbita: corpo dourado e dois painéis solares azuis
    const orbita = new THREE.Group(), sat = new THREE.Group();
    const corpoSat = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.2), new THREE.MeshStandardMaterial({ color:'#e8c25a', metalness:0.6, roughness:0.35, emissive:'#5a4210', emissiveIntensity:0.5 }));
    const painelMat = new THREE.MeshStandardMaterial({ color:'#2f6fd6', metalness:0.3, roughness:0.4, emissive:'#123a80', emissiveIntensity:0.6 });
    for(const lado of [-1, 1]){ const pn = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.016, 0.12), painelMat); pn.position.x = lado * 0.21; sat.add(pn); }
    sat.add(corpoSat); sat.position.x = 0.56; sat.scale.setScalar(1.1);
    orbita.add(sat); orbita.rotation.x = 0.9; orbita.rotation.z = 0.25; g.add(orbita);
    const halo = sprite(R.texBrilho, '#8fd3ff', [1.35, 1.35], 0.55); g.add(halo);
    ud.orbita = orbita; ud.satelite = sat; ud.halo = halo;
  }
  if(especial === 'bomb'){
    mat.emissive = new THREE.Color('#ff8a2a'); mat.emissiveIntensity = 0.6;
    const halo = sprite(R.texBrilho, '#ffb347', [1.5, 1.5], 0.8); g.add(halo); ud.halo = halo; ud.matBomba = mat;
  }
  const sel = sprite(R.texBrilho, '#ffffff', [1.25, 1.25], 0.0); g.add(sel); ud.brilhoSel = sel;
  return g;
}

const easeOutBack = t => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

// ---------- o tabuleiro ----------
async function criarTab3D({ tabuleiro, tipoPeca }){
  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, powerPreference:'high-performance' });
  const Q = window.Desempenho;
  renderer.setPixelRatio(Q ? Q.pixelRatio() : Math.min(2, devicePixelRatio || 1));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.domElement.className = 'canvas3d';
  renderer.domElement.addEventListener('webglcontextlost', e => {
    e.preventDefault(); ativo = false;
    window.dispatchEvent(new CustomEvent('galaxy3d-perdido'));
  });
  await carregarRecursos(renderer);

  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const INCL = THREE.MathUtils.degToRad(15), DIST = 15.75;
  camera.position.set(0, -Math.sin(INCL) * DIST, Math.cos(INCL) * DIST);
  camera.lookAt(0, -0.08, 0);

  const sol = new THREE.DirectionalLight(0xfff4e6, 3.0); sol.position.set(-4, 5, 8); cena.add(sol);
  cena.add(new THREE.AmbientLight(0x6a7ab0, 0.65));
  const luzes = Array.from({ length:4 }, () => { const l = new THREE.PointLight(0xffffff, 0, 2.6, 1.6); cena.add(l); return { l, t:1 }; });

  const painel = new THREE.Mesh(new THREE.PlaneGeometry(8.35, 8.35), new THREE.MeshBasicMaterial({ map:R.texPainel, transparent:true, depthWrite:false }));
  // renderOrder negativo: o painel (semitransparente, escuro) é desenhado ANTES de tudo. Pela ordem
  // automática (distância do centro), ele ficava "na frente" das fileiras de cima e escurecia os anéis
  // de Saturno dessas fileiras — os de baixo apareciam normais.
  painel.renderOrder = -10;
  painel.position.z = -0.55; cena.add(painel);

  const pecas = new Map();   // id → { g, de, para, t, dur, estado, tEstado, sel, dica }
  const poeiras = new Map(); // "r,c" → { m, some, t }
  const explosoes = [];      // { objs, t, frags, fogo, fumacas, faiscas, onda }
  const xy = (r, c) => ({ x: c - 3.5, y: 3.5 - r });
  let ativo = false, ultimo = 0, relogio = 0;

  let celAtual = 0;
  // resolução automática: o módulo de desempenho baixa (ou sobe) a densidade de pixels
  if(Q) Q.aoMudar(pr => { renderer.setPixelRatio(pr); if(celAtual) tamanho(celAtual); });
  function tamanho(cel){
    celAtual = cel;
    const lado = cel * 8;
    renderer.setSize(lado, lado, false);
    Object.assign(renderer.domElement.style, { width:lado + 'px', height:lado + 'px' });
    camera.aspect = 1; camera.updateProjectionMatrix();
  }

  function quadro(agora){
    if(!ativo) return;
    // um erro num quadro nunca pode parar o laço (antes, tudo congelava na tela)
    if(Q) Q.amostra((agora - ultimo) / 1000);
    try { passo(Math.max(0, Math.min(0.1, (agora - ultimo) / 1000))); }
    catch(e){ console.warn('quadro 3D com erro', e); }
    ultimo = agora;
    requestAnimationFrame(quadro);
  }

  // um passo da animação + desenho (separado do laço para os testes avançarem quadro a quadro)
  function passo(dt){
    relogio += dt;
    for(const [id, p] of pecas){
      try { animarPeca(p, dt); }
      catch(e){ if(!p.avisada){ p.avisada = true; console.warn('[galaxia] peça 3D com erro', id, p.g.userData.tipo, p.g.userData.especial, e); } }
    }
    passoResto(dt);
  }
  function animarPeca(p, dt){
    {
      const ud = p.g.userData;
      if(p.t < p.dur){
        p.t = Math.min(p.dur, p.t + dt);
        const e = easeOutBack(p.t / p.dur);
        p.g.position.x = p.de.x + (p.para.x - p.de.x) * e;
        p.g.position.y = p.de.y + (p.para.y - p.de.y) * e;
      }
      let s = 1;
      if(p.estado === 'nasce'){ p.tEstado += dt; const k = Math.min(1, p.tEstado / 0.3); s = easeOutBack(k); if(k >= 1) p.estado = 'normal'; }
      if(p.estado === 'some'){ p.tEstado += dt; s = Math.max(0, 1 - p.tEstado / 0.09); if(s === 0) p.g.visible = false; }
      // (não altera o material: ele é compartilhado por todos os planetas do mesmo tipo)
      if(p.estado === 'estoura'){ p.tEstado += dt; s = Math.max(0, 1 - p.tEstado / 0.24) * (1 + p.tEstado * 2); if(p.tEstado > 0.24) p.g.visible = false; }
      if(p.sel || p.dica) s *= 1 + 0.09 * Math.sin(relogio * (p.dica ? 6 : 9));
      p.g.scale.setScalar(s);
      if(ud.corpo) ud.corpo.rotation.y += ud.giro * dt;
      if(ud.nuvens) ud.nuvens.rotation.y += ud.giro * 1.25 * dt;
      if(ud.disco) ud.disco.rotation.z += 2.2 * dt;
      if(ud.orbita){ ud.orbita.rotation.y += 2.6 * dt; ud.satelite.rotation.y = -ud.orbita.rotation.y; ud.halo.material.opacity = 0.4 + 0.2 * Math.sin(relogio * 4 + ud.fase); }
      if(ud.rastro) ud.rastro.material.opacity = 0.65 + 0.3 * Math.sin(relogio * 7 + ud.fase);
      if(ud.matBomba){ ud.matBomba.emissiveIntensity = 0.55 + 0.45 * Math.sin(relogio * 6); ud.halo.material.opacity = 0.55 + 0.3 * Math.sin(relogio * 6); }
      if(ud.brilhoSel) ud.brilhoSel.material.opacity = p.sel ? 0.55 : p.dica ? 0.35 + 0.25 * Math.sin(relogio * 6) : 0;
    }
  }
  function passoResto(dt){
    for(const [k, d] of poeiras){
      if(d.some){ d.t += dt; const o = Math.max(0, 1 - d.t / 0.5); d.m.material.opacity = o; d.moldura.material.opacity = o; d.m.scale.setScalar(1 + d.t); d.moldura.scale.setScalar(1 + d.t * 0.6);
        if(d.t >= 0.5){ cena.remove(d.m, d.moldura); d.m.material.dispose(); d.moldura.material.dispose(); poeiras.delete(k); } }
      else { d.m.material.opacity = 0.75 + 0.2 * Math.sin(relogio * 1.6 + d.fase); d.moldura.material.opacity = 0.7 + 0.3 * Math.sin(relogio * 2.2 + d.fase);
        // meteoro chegando na casa: cresce com um pulinho
        if(d.chega >= 0){ d.chega += dt; const e = d.chega >= 0.3 ? 1 : easeOutBack(d.chega / 0.3); d.m.scale.setScalar(Math.max(0.01, e)); d.moldura.scale.setScalar(Math.max(0.01, e)); if(d.chega >= 0.3) d.chega = -1; } }
    }
    for(const z of luzes){ if(z.t < 1){ z.t += dt / 0.4; z.l.intensity = Math.max(0, 7 * (1 - z.t)); } }
    for(let i = explosoes.length - 1; i >= 0; i--){
      let fim;
      try { fim = atualizarExplosao(explosoes[i], dt); }
      catch(e){ console.warn('explosão descartada', e); removerExplosao(explosoes[i]); fim = true; }
      if(fim) explosoes.splice(i, 1);
    }
    renderer.render(cena, camera);
  }

  // ---------- explosão 3D: fragmentos + bola de fogo + fumaça + faíscas + onda ----------
  const VIDA_EXPLOSAO = 1.1;
  // Numa cascata grande, dezenas de explosões completas (10 pedaços 3D cada) pesam demais
  // na GPU do celular; acima do limite, as novas são leves (só fogo, fumaça e faíscas).
  const MAX_EXPLOSOES_COMPLETAS = 10;
  function criarExplosao(tipo, r, c, forca = 1){
    const { x, y } = xy(r, c), objs = [];
    const add = o => { cena.add(o); objs.push(o); return o; };
    const escala = tipo === 'saturno' ? RAIO_SATURNO / RAIO : 1;
    const completas = explosoes.filter(e => e.frags.length).length;
    const leve = tipo === 'buraco' || completas >= MAX_EXPLOSOES_COMPLETAS;
    const frags = leve ? [] : R.frags.map(f => {
      const m = add(new THREE.Mesh(f.geo, [R.mat[tipo] || R.mat.lua, R.matLava]));
      m.scale.setScalar(escala);
      m.position.set(x + f.centro.x * escala, y + f.centro.y * escala, f.centro.z * escala);
      const vel = f.dir.clone().multiplyScalar((2.0 + Math.random() * 1.8) * forca);
      vel.z += 1.2 + Math.random();                         // salta na direção da câmera
      return { m, vel, giro:new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(14), escala };
    });
    const fogo = add(new THREE.Sprite(new THREE.SpriteMaterial({ map:R.texFogo, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false,
      color: tipo === 'buraco' ? 0xc48bff : 0xffffff })));
    fogo.position.set(x, y, 0.35);
    const fumacas = Array.from({ length:3 }, () => {
      const f = add(new THREE.Sprite(new THREE.SpriteMaterial({ map:R.texFumaca, color:0x3a3a44, transparent:true, opacity:0, depthWrite:false })));
      f.position.set(x + (Math.random() - 0.5) * 0.3, y + (Math.random() - 0.5) * 0.3, 0.2 + Math.random() * 0.2);
      f.userData = { deriva:new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.25 + Math.random() * 0.3, 0.1), rot:(Math.random() - 0.5) * 1.5 };
      return f;
    });
    const n = Math.round(26 * forca), pos = new Float32Array(n * 3), vels = [];
    for(let i = 0; i < n; i++){
      pos.set([x, y, 0.3], i * 3);
      const a = Math.random() * Math.PI * 2, el = (Math.random() - 0.3) * 1.4, sp = 2.5 + Math.random() * 3.5;
      vels.push(new THREE.Vector3(Math.cos(a) * Math.cos(el) * sp, Math.sin(a) * Math.cos(el) * sp, Math.abs(Math.sin(el)) * sp + 1));
    }
    const geoF = new THREE.BufferGeometry(); geoF.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const faiscas = add(new THREE.Points(geoF, new THREE.PointsMaterial({ size:0.11, map:R.texBrilho, color:0xffc070, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false })));
    faiscas.userData.vels = vels;
    const onda = add(new THREE.Mesh(R.geoOnda, new THREE.MeshBasicMaterial({ color:0xffd8a0, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide })));
    onda.position.set(x, y, 0.1);
    explosoes.push({ objs, t:0, frags, fogo, fumacas, faiscas, onda, forca });
  }

  function atualizarExplosao(e, dt){
    e.t += dt;
    const k = e.t / VIDA_EXPLOSAO;
    for(const f of e.frags){
      f.vel.y -= 5.5 * dt; f.vel.multiplyScalar(1 - 0.8 * dt);   // gravidade "para baixo da tela" e arrasto
      f.m.position.addScaledVector(f.vel, dt);
      f.m.rotation.x += f.giro.x * dt; f.m.rotation.y += f.giro.y * dt; f.m.rotation.z += f.giro.z * dt;
      f.m.scale.setScalar(f.escala * (k < 0.6 ? 1 : Math.max(0, 1 - (k - 0.6) / 0.4)));
    }
    const kf = Math.min(1, e.t / 0.45);                                // bola de fogo: cresce e apaga
    e.fogo.scale.setScalar((0.4 + 1.5 * Math.sqrt(kf)) * e.forca);
    e.fogo.material.opacity = Math.max(0, 1 - kf);
    e.fogo.material.color.setRGB(1, 1 - kf * 0.35, 1 - kf * 0.75);
    for(const f of e.fumacas){
      const kk = Math.min(1, e.t / VIDA_EXPLOSAO);
      f.position.addScaledVector(f.userData.deriva, dt);
      f.material.rotation += f.userData.rot * dt;
      f.scale.setScalar(0.6 + kk * 1.4);
      f.material.opacity = kk < 0.2 ? kk / 0.2 * 0.55 : 0.55 * (1 - (kk - 0.2) / 0.8);
    }
    const p = e.faiscas.geometry.attributes.position, vs = e.faiscas.userData.vels;
    for(let i = 0; i < vs.length; i++){
      vs[i].y -= 6 * dt; vs[i].multiplyScalar(1 - 1.2 * dt);
      p.setXYZ(i, p.getX(i) + vs[i].x * dt, p.getY(i) + vs[i].y * dt, p.getZ(i) + vs[i].z * dt);
    }
    p.needsUpdate = true;
    e.faiscas.material.opacity = Math.max(0, 1 - k);
    const ko = Math.min(1, e.t / 0.4);
    e.onda.quaternion.copy(camera.quaternion);                       // sempre de frente para a câmera
    e.onda.scale.setScalar((0.25 + ko * 1.1) * e.forca);
    e.onda.material.opacity = Math.max(0, 0.9 * (1 - ko));
    if(k < 1) return false;
    removerExplosao(e);
    return true;
  }

  function removerExplosao(e){
    for(const o of e.objs){
      cena.remove(o);
      if(o.isPoints) o.geometry.dispose();
      if(o.material && !Array.isArray(o.material) && o.material !== R.matLava) o.material.dispose();
    }
  }

  const raycaster = new THREE.Raycaster(), plano = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), ponto = new THREE.Vector3();

  // uma casa de poeira (ou gelo, no Polo Norte, ou meteoro, na Defesa da Terra — jogo.js marca o tabuleiro)
  function novaPoeira(r, c, chega = false){
    const gelo = tabuleiro.classList.contains('gelo'), meteoro = tabuleiro.classList.contains('meteoro');
    const m = new THREE.Mesh(R.geoPoeira, (meteoro ? R.matMeteoro : gelo ? R.matGelo : R.matPoeira).clone());
    const { x, y } = xy(r, c); m.position.set(x, y, -0.48); m.renderOrder = -9;   // fundo da poeira, logo após o painel
    const moldura = new THREE.Mesh(R.geoPoeira, R.matMoldura.clone()); moldura.position.set(x, y, 0.02);
    if(gelo) moldura.material.map = R.texMolduraGelo;
    // à frente da esfera do planeta (raio 0.42), senão o planeta cobre a rocha do canto
    if(meteoro){ moldura.material.map = R.texMolduraMeteoro; moldura.material.blending = THREE.NormalBlending; moldura.renderOrder = 5; moldura.position.z = 0.5; }
    if(chega){ m.scale.setScalar(0.01); moldura.scale.setScalar(0.01); }
    cena.add(m, moldura); poeiras.set(`${r},${c}`, { m, moldura, some:false, t:0, fase:Math.random() * 6, chega:chega ? 0 : -1 });
  }
  const T = {
    nome: '3d',
    montar(board, cel){
      tabuleiro.classList.add('modo3d');
      tabuleiro.querySelectorAll('.casa, .peca').forEach(e => e.remove());
      if(!renderer.domElement.parentNode) tabuleiro.insertBefore(renderer.domElement, tabuleiro.firstChild);
      tamanho(cel);
      for(const p of pecas.values()) cena.remove(p.g);
      pecas.clear();
      for(const d of poeiras.values()) cena.remove(d.m, d.moldura);
      poeiras.clear();
      board.dust.forEach((row, r) => row.forEach((tem, c) => { if(tem) novaPoeira(r, c); }));
      board.grid.forEach((row, r) => row.forEach((p, c) => T.criar(p, r, c)));
      T.ativar();
    },
    criar(p, r, c, { nasce = false, deR } = {}){
      const g = montarPlaneta(tipoPeca(p), p.special);
      const alvo = xy(r, c), ini = deR !== undefined ? xy(deR, c) : alvo;
      g.position.set(ini.x, ini.y, 0);
      cena.add(g);
      pecas.set(p.id, { g, de:ini, para:alvo, t: deR !== undefined ? 0 : 1, dur: deR !== undefined ? 0.24 : 1, estado: nasce ? 'nasce' : 'normal', tEstado:0, sel:false, dica:false });
    },
    mover(id, r, c){
      const p = pecas.get(id); if(!p) return;
      p.de = { x:p.g.position.x, y:p.g.position.y }; p.para = xy(r, c); p.t = 0; p.dur = 0.2;
    },
    esconder(id){ const p = pecas.get(id); if(p){ p.estado = 'some'; p.tEstado = 0; } },
    estourar(id){ const p = pecas.get(id); if(p){ p.estado = 'estoura'; p.tEstado = 0; } },
    explodir(tipo, r, c, forca = 1){ criarExplosao(tipo, r, c, forca); },
    remover(id){ const p = pecas.get(id); if(p){ cena.remove(p.g); if(p.g.userData.matBomba) p.g.userData.matBomba.dispose(); pecas.delete(id); } },
    marcar(id, classe, on){ const p = pecas.get(id); if(!p) return; if(classe === 'sel') p.sel = on; if(classe === 'dica') p.dica = on; },
    poeira(r, c){ const d = poeiras.get(`${r},${c}`); if(d){ d.some = true; d.t = 0; } },
    // Defesa da Terra: os meteoros mudaram de casa — tira os que saíram e cria os que chegaram
    sincronizarPoeira(board){
      for(const [k, d] of poeiras){ const [r, c] = k.split(',').map(Number);
        if(!board.dust[r][c] && !d.some){ cena.remove(d.m, d.moldura); d.m.material.dispose(); d.moldura.material.dispose(); poeiras.delete(k); } }
      board.dust.forEach((row, r) => row.forEach((tem, c) => {
        const d = poeiras.get(`${r},${c}`);
        if(tem && d && d.some){ cena.remove(d.m, d.moldura); d.m.material.dispose(); d.moldura.material.dispose(); poeiras.delete(`${r},${c}`); }
        if(tem && !poeiras.has(`${r},${c}`)) novaPoeira(r, c, true);
      }));
      T.ativar();
    },
    reposicionar(board, cel){ if(cel) tamanho(cel); board.grid.forEach((row, r) => row.forEach((p, c) => T.mover(p.id, r, c))); },
    celula(e){
      const b = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      if(!raycaster.ray.intersectPlane(plano, ponto)) return { r:-1, c:-1 };
      return { r: Math.floor(4 - ponto.y), c: Math.floor(ponto.x + 4) };
    },
    projetar(r, c){
      const { x, y } = xy(r, c), v = new THREE.Vector3(x, y, 0).project(camera), b = renderer.domElement;
      return { x:(v.x + 1) / 2 * b.clientWidth, y:(1 - v.y) / 2 * b.clientHeight };
    },
    redimensionar(cel){ tamanho(cel); },
    flash(r, c, cor = '#ffd27a'){
      const z = luzes.reduce((a, b) => (a.t > b.t ? a : b));
      const { x, y } = xy(r, c);
      z.l.position.set(x, y, 0.9); z.l.color.set(cor); z.t = 0;
    },
    depurar: { avancar(dt){ passo(dt); }, get explosoes(){ return explosoes.length; }, get pecas(){ return pecas.size; }, info(id){ const p = pecas.get(id); if(!p) return null; const r = []; p.g.traverse(o => { if(o.isMesh || o.isSprite) r.push({ tipo:o.type, vis:o.visible, op:o.material.opacity, mapa:!!o.material.map, uuid:o.material.uuid.slice(0, 6), z:o.getWorldPosition(new THREE.Vector3()).z.toFixed(2), escala:o.getWorldScale(new THREE.Vector3()).x.toFixed(2) }); }); return { estado:p.estado, gvis:p.g.visible, escala:p.g.scale.x, pos:[p.g.position.x.toFixed(2), p.g.position.y.toFixed(2), p.g.position.z.toFixed(2)], r }; }, get poeiras(){ return [...poeiras.values()].filter(d => !d.some).length; } },
    ativar(){ if(!ativo){ ativo = true; ultimo = performance.now(); requestAnimationFrame(quadro); } },
    pausar(){ ativo = false; },
    limpar(){
      for(const p of pecas.values()) cena.remove(p.g); pecas.clear();
      for(const e of explosoes) removerExplosao(e); explosoes.length = 0;
      for(const d of poeiras.values()) cena.remove(d.m, d.moldura); poeiras.clear();
      // tira o canvas do tabuleiro: o three.js põe display:block direto no elemento, o que furava o
      // ".tabuleiro:not(.modo3d) .canvas3d{display:none}" — na troca automática para o 2D o último
      // quadro 3D ficava congelado POR CIMA do tabuleiro 2D (parecia travado). montar() o recoloca.
      renderer.domElement.remove();
    },
  };
  return T;
}

// Fotos dos planetas 3D (mapa, objetivos, álbum, estilhaços): renderiza cada tipo
// uma vez num renderer próprio, pequeno, e devolve data URLs.
async function gerarSprites(tam = 256, { comGorro = false } = {}){
  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, preserveDrawingBuffer:true });
  renderer.setPixelRatio(1); renderer.setSize(tam, tam, false); renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
  await carregarRecursos(renderer);
  const out = {};
  for(const tipo of TIPOS){
    const cena = new THREE.Scene();
    const l = new THREE.DirectionalLight(0xfff4e6, 3.0); l.position.set(-4, 5, 8); cena.add(l);
    cena.add(new THREE.AmbientLight(0x6a7ab0, 0.65));
    const p = montarPlaneta(tipo, null);
    p.userData.corpo.rotation.y = 1.2;
    if(comGorro) vestirGorro(p, tipo);
    cena.add(p);
    // Saturno precisa de espaço para o anel; com gorro, sobra espaço em cima para a ponta
    const m = (tipo === 'saturno' ? 0.7 : 0.5) * (comGorro ? 1.34 : 1);
    const cam = new THREE.OrthographicCamera(-m, m, m, -m, 0.1, 10); cam.position.set(comGorro ? m * 0.06 : 0, comGorro ? m * 0.22 : 0, 5);
    renderer.render(cena, cam);
    out[tipo] = renderer.domElement.toDataURL('image/png');
  }
  renderer.dispose(); renderer.forceContextLoss();
  return out;
}

// ---------- planeta grande do mundo (acima do tabuleiro) ----------
// Gira devagar; rachaduras incandescentes acendem com o progresso do objetivo
// (emissiveMap de fendas); treme nos combos e explode ao vencer a fase.
function texRachaduras(){
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512;
  const c = cv.getContext('2d'); c.fillStyle = '#000'; c.fillRect(0, 0, 1024, 512);
  let semente = 31; const rnd = () => (semente = (semente * 16807) % 2147483647) / 2147483647;
  const fenda = (x, y, ang, comp, larg, nivel) => {
    c.strokeStyle = '#fff'; c.lineCap = 'round'; c.lineWidth = larg;
    c.beginPath(); c.moveTo(x, y);
    for(let i = 0; i < comp; i++){ ang += (rnd() - 0.5) * 0.9; x += Math.cos(ang) * 9; y += Math.sin(ang) * 9; c.lineTo(x, y);
      if(nivel < 3 && rnd() < 0.08) { c.stroke(); fenda(x, y, ang + (rnd() - 0.5) * 2, comp * 0.5, larg * 0.6, nivel + 1); c.beginPath(); c.moveTo(x, y); } }
    c.stroke();
  };
  for(let i = 0; i < 9; i++) fenda(rnd() * 1024, 80 + rnd() * 350, rnd() * Math.PI * 2, 30 + rnd() * 30, 4 + rnd() * 3, 0);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Cratera: fundo escuro e borda de lava (cor) + só a borda acesa (emissão).
const texCratera = () => canvasTex(128, (c, s) => {
  const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(6,3,2,1)'); g.addColorStop(0.42, 'rgba(18,8,4,1)'); g.addColorStop(0.6, 'rgba(70,28,10,1)');
  g.addColorStop(0.72, 'rgba(255,150,50,1)'); g.addColorStop(0.86, 'rgba(120,50,20,.7)'); g.addColorStop(1, 'rgba(60,30,20,0)');
  c.fillStyle = g; c.fillRect(0, 0, s, s);
});
const texBordaCratera = () => canvasTex(128, (c, s) => {
  const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, '#000'); g.addColorStop(0.55, '#000'); g.addColorStop(0.7, '#fff'); g.addColorStop(0.82, '#552200'); g.addColorStop(1, '#000');
  c.fillStyle = g; c.fillRect(0, 0, s, s);
});

// Estação Espacial Internacional simplificada: treliça central, 8 asas de painéis solares
// (4 de cada lado), módulos pressurizados brancos e radiadores.
function criarISS(){
  const g = new THREE.Group();
  const branco = new THREE.MeshStandardMaterial({ color:0xe8eaee, roughness:0.5, metalness:0.3 });
  const treliça = new THREE.MeshStandardMaterial({ color:0xb8bcc4, roughness:0.4, metalness:0.7 });
  const painel = new THREE.MeshStandardMaterial({ color:0x1a2f6b, roughness:0.25, metalness:0.6, emissive:0x0a1430, emissiveIntensity:0.6 });
  const dourado = new THREE.MeshStandardMaterial({ color:0xd4a64a, roughness:0.4, metalness:0.8 });
  const caixa = (w, h, d, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); g.add(o); return o; };
  const cil = (r, l, m, x = 0, y = 0, z = 0, eixo = 'z') => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, 16), m); o.position.set(x, y, z); if(eixo === 'z') o.rotation.x = Math.PI / 2; if(eixo === 'x') o.rotation.z = Math.PI / 2; g.add(o); return o; };
  caixa(1.1, 0.035, 0.035, treliça);                                  // treliça principal
  cil(0.04, 0.5, branco, 0, 0, 0.0);                                  // módulos no meio, perpendiculares à treliça
  cil(0.045, 0.16, branco, 0, -0.05, 0.28, 'y');
  cil(0.035, 0.18, branco, 0.08, 0, -0.18, 'x');
  [-1, 1].forEach(s => {
    [0.36, 0.5].forEach(x => [-1, 1].forEach(t => {
      caixa(0.11, 0.004, 0.42, painel, s * x, 0, t * 0.24);           // asas dos painéis solares
      caixa(0.004, 0.006, 0.42, dourado, s * x, 0.002, t * 0.24);    // mastro dourado
    }));
    caixa(0.12, 0.004, 0.09, branco, s * 0.18, 0.05, 0);             // radiadores
  });
  return g;
}

function criarOrbitasTerra(raioTerra){
  const g = new THREE.Group();
  g.rotation.z = 0.25;                                                // plano das órbitas levemente inclinado
  // ISS: órbita baixa e rápida, bem rente à atmosfera
  const pivoISS = new THREE.Group(); pivoISS.rotation.x = 0.5; g.add(pivoISS);
  const iss = criarISS(); iss.scale.setScalar(0.45); iss.position.set(raioTerra * 1.18, 0, 0); pivoISS.add(iss);
  // Lua: órbita maior e mais lenta, com a mesma textura da Lua do tabuleiro
  const pivoLua = new THREE.Group(); pivoLua.rotation.x = 0.18; g.add(pivoLua);
  const lua = montarPlaneta('lua', null, { comAtmosfera:false }); lua.scale.setScalar(0.42); lua.position.set(raioTerra * 1.38, 0, 0); pivoLua.add(lua);
  let a = 0, b = 2.2;
  return { g, passo(dt){
    a += dt * 0.9; b += dt * 0.22;
    pivoISS.rotation.y = a; iss.rotation.y = -a + Math.PI / 2;      // painéis sempre de frente para a órbita
    pivoLua.rotation.y = b; lua.rotation.y = -b;                     // a Lua mostra sempre a mesma face
  } };
}

// ---------- gorro de Papai Noel em 3D (evento de Natal) ----------
// Cone de veludo vermelho que se curva e cai para o lado (tubo de raio variável ao longo de uma
// curva), barra e pompom de pelúcia (malha com relevo de ruído + textura felpuda). Feito para um
// planeta de raio RAIO; vai no grupo do planeta (não gira com o corpo).
function ruido3(x, y, z){            // ruído de valor 3D suave, só para relevo
  const h = (i, j, k) => { const n = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453; return n - Math.floor(n); };
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  return l(l(l(h(xi, yi, zi), h(xi + 1, yi, zi), u), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v),
           l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v), w);
}
// relevo felpudo: empurra cada vértice pela normal com ruído em duas escalas
function felpudo(geo, amp, freq){
  const pos = geo.attributes.position, nor = geo.attributes.normal, v = new THREE.Vector3(), n = new THREE.Vector3();
  for(let i = 0; i < pos.count; i++){
    v.fromBufferAttribute(pos, i); n.fromBufferAttribute(nor, i);
    const d = (ruido3(v.x * freq + 3.7, v.y * freq * 1.3, v.z * freq - 1.1) - 0.5) * amp + (ruido3(v.x * freq * 3.3, v.y * freq * 2.9, v.z * freq * 3.7) - 0.5) * amp * 0.6
      + (ruido3(v.x * freq * 8.1, v.y * freq * 7.7, v.z * freq * 8.3) - 0.5) * amp * 0.35;
    v.addScaledVector(n, d); pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals(); return geo;
}
const texPelucia = () => { const t = canvasTex(256, (c, s) => {
  c.fillStyle = '#f4f2ee'; c.fillRect(0, 0, s, s);
  for(let i = 0; i < 2600; i++){ const x = Math.random() * s, y = Math.random() * s, l = 2 + Math.random() * 5, a = Math.random() * 6.28, g = 200 + Math.random() * 55;
    c.strokeStyle = `rgba(${g},${g},${g - 6},.55)`; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
}); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 2); return t; };
// veludo: fios finos + dobras largas (vira relevo do tecido)
const texVeludo = () => { const t = canvasTex(256, (c, s) => {
  const g = c.createLinearGradient(0, 0, s, 0);
  for(let k = 0; k <= 6; k++) g.addColorStop(k / 6, k % 2 ? '#6a6a6a' : '#9a9a9a');
  c.fillStyle = g; c.fillRect(0, 0, s, s);
  const img = c.getImageData(0, 0, s, s), d = img.data;
  for(let i = 0; i < d.length; i += 4){ const r = (Math.random() - 0.5) * 38; d[i] += r; d[i + 1] += r; d[i + 2] += r; }
  c.putImageData(img, 0, 0);
}); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1); t.colorSpace = THREE.NoColorSpace; return t; };
let RG = null;   // recursos do gorro, criados uma vez
function criarGorro(raio = RAIO){
  if(!RG){
    const pel = texPelucia();
    RG = {
      // emissive baixo: a sombra do veludo fica vermelho-escura (preta parecia um buraco no gorro)
      veludo: new THREE.MeshPhysicalMaterial({ color:0xb3121d, emissive:0x4a0509, roughness:0.62, sheen:1, sheenColor:new THREE.Color(0xff5a5a), sheenRoughness:0.45,
        bumpMap:texVeludo(), bumpScale:1.6, side:THREE.DoubleSide }),
      pelucia: new THREE.MeshPhysicalMaterial({ color:0xffffff, map:pel, roughness:1, sheen:1, sheenColor:new THREE.Color(0xffffff), sheenRoughness:0.8,
        bumpMap:pel, bumpScale:3 }),
    };
  }
  const g = new THREE.Group();
  const r0 = raio * 0.74;                                            // raio da boca do gorro
  // eixo do cone: sobe e depois cai para o lado (+x), um pouco para a frente
  const curva = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.02, raio * 0.5, 0.02), new THREE.Vector3(raio * 0.2, raio * 0.95, 0.05),
    new THREE.Vector3(raio * 0.62, raio * 1.16, 0.1), new THREE.Vector3(raio * 1.02, raio * 1.02, 0.16)]);
  const N = 72, M = 48, Z = new THREE.Vector3(0, 0, 1);
  const pos = [], uv = [], idx = [];
  for(let i = 0; i <= N; i++){
    const t = i / N, c = curva.getPointAt(t), T = curva.getTangentAt(t);
    const nI = new THREE.Vector3().crossVectors(T, Z).normalize(), bI = new THREE.Vector3().crossVectors(nI, T).normalize();
    // raio cai devagar no começo e afina na ponta; ondulação = dobras do tecido
    const base = r0 * Math.pow(1 - t, 0.85) * (1 - 0.12 * Math.sin(t * Math.PI)) + raio * 0.035;
    for(let j = 0; j <= M; j++){
      const a = j / M * Math.PI * 2, dobra = 1 + 0.045 * Math.sin(a * 5 + t * 7) * (1 - t) + 0.03 * Math.sin(a * 9 - t * 11);
      const rr = base * dobra, n = nI.clone().multiplyScalar(Math.cos(a)).add(bI.clone().multiplyScalar(Math.sin(a)));
      pos.push(c.x + n.x * rr, c.y + n.y * rr, c.z + n.z * rr); uv.push(j / M, t);
    }
  }
  for(let i = 0; i < N; i++) for(let j = 0; j < M; j++){ const a = i * (M + 1) + j, b = a + M + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const geoCone = new THREE.BufferGeometry();
  geoCone.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geoCone.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geoCone.setIndex(idx); geoCone.computeVertexNormals();
  const cone = new THREE.Mesh(geoCone, RG.veludo);
  // barra de pelúcia na boca (perpendicular ao início da curva = horizontal)
  const barra = new THREE.Mesh(felpudo(new THREE.TorusGeometry(r0 * 1.02, raio * 0.14, 32, 128), raio * 0.11, 7 / raio), RG.pelucia);
  barra.rotation.x = Math.PI / 2;
  const ponta = curva.getPointAt(1);
  const pompom = new THREE.Mesh(felpudo(new THREE.SphereGeometry(raio * 0.17, 48, 32), raio * 0.12, 7 / raio), RG.pelucia);
  pompom.position.copy(ponta).add(new THREE.Vector3(raio * 0.03, -raio * 0.08, 0));
  g.add(cone, barra, pompom);
  return g;
}
// coloca o gorro no alto do planeta, inclinado, como se estivesse vestido
function vestirGorro(planeta, tipo){
  const raio = tipo === 'saturno' ? RAIO_SATURNO : RAIO;
  const gorro = criarGorro(raio);
  const inc = -0.32;                                                   // tomba para a direita, como um gorro vestido
  gorro.rotation.set(0.16, 0, inc);
  gorro.position.set(-Math.sin(inc) * raio * 0.64, Math.cos(inc) * raio * 0.64, raio * 0.1);
  planeta.add(gorro); planeta.userData.gorro = gorro;
  return gorro;
}

async function criarPlanetaGrande(container, tipo, { comGorro = false } = {}){
  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
  // o planeta grande é enfeite: nunca usa mais resolução que o tabuleiro
  renderer.setPixelRatio(window.Desempenho ? Math.min(1.5, Desempenho.pixelRatio()) : Math.min(2, devicePixelRatio || 1)); renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
  renderer.domElement.className = 'canvas-planeta';
  container.prepend(renderer.domElement);
  await carregarRecursos(renderer);
  const cena = new THREE.Scene();
  const sol = new THREE.DirectionalLight(0xfff4e6, 3.0); sol.position.set(-4, 3, 6); cena.add(sol);
  cena.add(new THREE.AmbientLight(0x6a7ab0, 0.45));
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50); camera.position.set(0, 0, 6);
  const g = montarPlaneta(tipo, null);
  const ud = g.userData;
  const mat = ud.corpo.material.clone();
  // o Sol já brilha (emissiveMap = a própria textura): em vez de rachar, ele esquenta
  const ehSol = tipo === 'sol';
  if(!ehSol){ mat.emissiveMap = texRachaduras(); mat.emissive = new THREE.Color('#ff6a1a'); mat.emissiveIntensity = 0; }
  ud.corpo.material = mat;
  if(comGorro) vestirGorro(g, tipo);
  const escala = (tipo === 'saturno' ? 2.3 : 2.6) * (comGorro ? 0.72 : 1);   // com gorro, um pouco menor para caber a ponta
  const baseY = comGorro ? -0.42 : 0;
  g.scale.setScalar(escala); g.position.y = baseY; cena.add(g);
  // na Terra: a Estação Espacial Internacional e a Lua em órbita (fora de escala, para caber)
  const orbitas = tipo === 'terra' ? criarOrbitasTerra(RAIO * escala) : null;
  if(orbitas) cena.add(orbitas.g);
  const frags = [], explosao = { ativa:false, t:0 };
  let alvoK = 0, k = 0, tremor = 0, ativo = true, ultimo = performance.now(), esc0 = 1;
  // Só reage se ESTE planeta ainda estiver em uso: ao trocar de fase, o planeta antigo é
  // destruído (forceContextLoss) e o aviso dele chega depois — sem esse teste ele escondia
  // o planeta NOVO atrás da foto (o bug das crateras "só no primeiro planeta").
  renderer.domElement.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    if(!ativo) return;
    ativo = false; container.classList.remove('tem3d');
  });

  // ---- crateras: abrem no lado virado para a câmera e giram com o planeta ----
  const MAX_CRATERAS = 10, crateras = [], estouros = [];
  const raioCorpo = (tipo === 'saturno' ? RAIO_SATURNO : RAIO) * 1.004;
  const geoCratera = new THREE.CircleGeometry(raioCorpo * 0.2, 28);
  const matCratera = new THREE.MeshStandardMaterial({ map:texCratera(), emissive:new THREE.Color('#ff6a1a'), emissiveMap:texBordaCratera(), emissiveIntensity:1.8,
    transparent:true, depthWrite:false, roughness:1, polygonOffset:true, polygonOffsetFactor:-2 });
  let proxCratera = 0;
  function abrirCratera(){
    const corpo = ud.corpo;
    corpo.updateMatrixWorld();
    const mundo = new THREE.Vector3((Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.0, 0.7 + Math.random() * 0.3).normalize();
    const local = mundo.clone().applyQuaternion(corpo.getWorldQuaternion(new THREE.Quaternion()).invert()).normalize();
    const m = new THREE.Mesh(geoCratera, matCratera);
    m.position.copy(local).multiplyScalar(raioCorpo);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), local);
    m.scale.setScalar(0.001);
    corpo.add(m);
    crateras.push({ m, t:0, tam:0.6 + Math.random() * 0.6 });
    // estouro no ponto em que a cratera abre (em coordenadas da cena)
    const fogo = new THREE.Sprite(new THREE.SpriteMaterial({ map:R.texFogo, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false }));
    fogo.position.copy(m.getWorldPosition(new THREE.Vector3())).add(mundo.clone().multiplyScalar(0.15));
    cena.add(fogo); estouros.push({ s:fogo, t:0 });
    tremor = Math.max(tremor, 0.6);
  }
  function quadro(agora){
    if(!ativo) return;
    try { passoPlaneta(agora); } catch(e){ console.warn('planeta: quadro com erro', e); }
    requestAnimationFrame(quadro);
  }
  function passoPlaneta(agora){
    const dt = Math.max(0, Math.min(0.1, (agora - ultimo) / 1000)); ultimo = agora;
    // planeta grande gira devagar (≈1 volta por minuto): rápido demais parecia "acelerado" em alguns aparelhos
    if(ud.corpo) ud.corpo.rotation.y += 0.1 * dt;
    if(ud.nuvens) ud.nuvens.rotation.y += 0.13 * dt;
    if(orbitas) orbitas.passo(dt);
    k += (alvoK - k) * Math.min(1, dt * 3);
    // uma cratera por vez, conforme o objetivo avança
    proxCratera -= dt;
    if(!explosao.ativa && proxCratera <= 0 && crateras.length < Math.floor(alvoK * MAX_CRATERAS)){ abrirCratera(); proxCratera = 0.35; }
    for(const c of crateras){ if(c.t < 0.45){ c.t += dt; const e = easeOutBack(Math.min(1, c.t / 0.45)); c.m.scale.setScalar(Math.max(0.001, e * c.tam)); } }
    for(let i = estouros.length - 1; i >= 0; i--){
      const b = estouros[i]; b.t += dt;
      b.s.scale.setScalar(0.3 + b.t * 2.4); b.s.material.opacity = Math.max(0, 1 - b.t / 0.5);
      if(b.t > 0.5){ cena.remove(b.s); b.s.material.dispose(); estouros.splice(i, 1); }
    }
    matCratera.emissiveIntensity = 1.4 + 0.6 * Math.sin(agora / 140);
    mat.emissiveIntensity = ehSol ? 1.1 + k * 1.4 * (0.85 + 0.15 * Math.sin(agora / 180)) : k * 2.6 * (0.85 + 0.15 * Math.sin(agora / 180));
    tremor = Math.max(0, tremor - dt * 2.5);
    const j = tremor * 0.08 + (k > 0.75 ? (k - 0.75) * 0.06 : 0);
    g.position.set((Math.random() - 0.5) * j, baseY + (Math.random() - 0.5) * j, 0);
    if(explosao.ativa){
      explosao.t += dt;
      for(const f of frags){ f.vel.y -= 1.2 * dt; f.m.position.addScaledVector(f.vel, dt); f.m.rotation.x += f.giro.x * dt; f.m.rotation.y += f.giro.y * dt;
        f.m.scale.setScalar(esc0 * Math.max(0, 1 - Math.max(0, explosao.t - 0.9) / 0.6)); }
      explosao.fogo.scale.setScalar(1.5 + explosao.t * 5); explosao.fogo.material.opacity = Math.max(0, 1 - explosao.t / 1.0);
    }
    renderer.render(cena, camera);
  }
  requestAnimationFrame(quadro);
  return {
    dimensionar(w, h){ renderer.setSize(w, h, false); Object.assign(renderer.domElement.style, { width:w + 'px', height:h + 'px' });
      camera.aspect = w / h; camera.position.z = Math.max(6, 6 / Math.min(1, w / h) * 0.9); camera.updateProjectionMatrix(); },
    progresso(v){ alvoK = Math.max(0, Math.min(1, v)); },
    get crateras(){ return crateras.length; },
    avancar(seg){ for(let t = 0; t < seg; t += 1 / 30){ ultimo -= 1000 / 30; passoPlaneta(performance.now()); } },
    tremer(){ tremor = 1; },
    explodir(){
      if(explosao.ativa) return;
      explosao.ativa = true; g.visible = false;
      if(orbitas) orbitas.g.visible = false;
      const esc = tipo === 'saturno' ? escala * RAIO_SATURNO / RAIO : escala; esc0 = esc;
      for(const f of R.frags){
        const m = new THREE.Mesh(f.geo, [mat, R.matLava]); m.scale.setScalar(esc);
        m.position.copy(f.centro).multiplyScalar(esc); cena.add(m);
        frags.push({ m, vel:f.dir.clone().multiplyScalar(1.4 + Math.random() * 1.0), giro:new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, 0).multiplyScalar(6) });
      }
      explosao.fogo = new THREE.Sprite(new THREE.SpriteMaterial({ map:R.texFogo, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false }));
      explosao.fogo.position.z = 0.5; cena.add(explosao.fogo);
    },
    destruir(){ ativo = false; renderer.domElement.remove(); renderer.dispose(); renderer.forceContextLoss(); },
  };
}

function suportado(){
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
  catch { return false; }
}

window.Galaxy3D = { suportado, criarTab3D, gerarSprites, criarPlanetaGrande };
window.dispatchEvent(new Event('galaxy3d-pronto'));
