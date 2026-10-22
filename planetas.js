/* =========================================================
   GALÁXIA MATCH — PLANETAS PROCEDURAIS
   Cada planeta é pintado pixel a pixel num canvas: ruído 3D
   amostrado na superfície da esfera (sem emenda), iluminação
   de lado e brilho de atmosfera. Gerado uma vez e reaproveitado
   como imagem (data URL). Nenhuma imagem externa.
   ========================================================= */
(function(root){
'use strict';

// ---------- ruído 3D (value noise + fbm) ----------
function hash3(x, y, z, s){
  let h = (x * 374761393 + y * 668265263 + z * 2147483647 + s * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
const suave = t => t * t * (3 - 2 * t);
function ruido3(x, y, z, s){
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = suave(x - xi), yf = suave(y - yi), zf = suave(z - zi);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz, s);
  return l(l(l(c(0,0,0), c(1,0,0), xf), l(c(0,1,0), c(1,1,0), xf), yf),
           l(l(c(0,0,1), c(1,0,1), xf), l(c(0,1,1), c(1,1,1), xf), yf), zf);
}
function fbm(x, y, z, s, oitavas = 5){
  let v = 0, a = 0.5, f = 1;
  for(let i = 0; i < oitavas; i++){ v += a * ruido3(x * f, y * f, z * f, s + i * 17); f *= 2.03; a *= 0.5; }
  return v;
}
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * Math.min(1, Math.max(0, t)));
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

// Paleta em degraus suaves: stops = [[pos, '#rrggbb'], ...]
function rampa(stops, t){
  t = Math.min(1, Math.max(0, t));
  for(let i = 1; i < stops.length; i++){
    if(t <= stops[i][0]){
      const [p0, c0] = stops[i - 1], [p1, c1] = stops[i];
      return mix(hex(c0), hex(c1), (t - p0) / (p1 - p0));
    }
  }
  return hex(stops[stops.length - 1][1]);
}

// ---------- superfícies: (x,y,z) na esfera unitária → [r,g,b] ----------
// y = norte/sul (latitude = y), x/z = longitude.
const SUPERFICIES = {
  marte(x, y, z){
    const n = fbm(x * 2.2, y * 2.2, z * 2.2, 11);
    const fina = fbm(x * 9, y * 9, z * 9, 12, 3);
    let c = rampa([[0, '#5e1d0b'], [0.42, '#9c3a17'], [0.55, '#c25a2c'], [0.7, '#d9864f'], [1, '#e8a875']], n + (fina - 0.5) * 0.25);
    const polo = (Math.abs(y) - 0.8 + (fina - 0.5) * 0.12) / 0.1;               // calotas polares suaves
    if(polo > 0) c = mix(c, [238, 232, 226], Math.min(0.92, polo));
    return c;
  },
  jupiter(x, y, z){
    const turb = fbm(x * 3, y * 3, z * 3, 21) - 0.5;
    const faixa = Math.sin((y + turb * 0.22) * 15) * 0.5 + 0.5;
    let c = rampa([[0, '#8a5a3c'], [0.3, '#b9875f'], [0.55, '#e3c6a0'], [0.8, '#f2e3cc'], [1, '#c9946a']], faixa * 0.85 + fbm(x * 8, y * 8, z * 8, 22, 3) * 0.2);
    // Grande Mancha Vermelha (hemisfério sul)
    const dx = (Math.atan2(x, z) - 0.6) * 1.1, dy = (y + 0.36) * 2.6;
    const d = dx * dx + dy * dy;
    if(d < 0.09) c = mix(c, [178, 74, 46], (1 - d / 0.09) * 0.95);
    return c;
  },
  saturno(x, y, z){
    const turb = fbm(x * 2.5, y * 2.5, z * 2.5, 31) - 0.5;
    const faixa = Math.sin((y + turb * 0.08) * 11) * 0.5 + 0.5;
    return rampa([[0, '#b8925a'], [0.5, '#e2c88f'], [1, '#f3e3b8']], faixa * 0.7 + 0.2);
  },
  terra(x, y, z){
    const cont = fbm(x * 1.8, y * 1.8, z * 1.8, 41);
    const det = fbm(x * 7, y * 7, z * 7, 42, 3);
    let c;
    if(cont > 0.53){
      const alt = (cont - 0.53) * 4 + (det - 0.5) * 0.3;
      c = rampa([[0, '#3f7d3a'], [0.35, '#6f8f3e'], [0.6, '#a08455'], [1, '#d8cbb0']], alt);
      if(Math.abs(y) < 0.3 && det > 0.55) c = mix(c, [196, 170, 108], 0.6);      // desertos
    } else c = rampa([[0, '#0b2f6b'], [0.8, '#1d5fa8'], [1, '#3f8fd0']], cont / 0.53);
    const gelo = (Math.abs(y) - 0.83 + (det - 0.5) * 0.15) / 0.08;               // gelo polar suave
    if(gelo > 0) c = mix(c, [240, 246, 250], Math.min(1, gelo));
    const nuvem = fbm(x * 3.2 + 9, y * 4.5, z * 3.2, 43);
    if(nuvem > 0.55) c = mix(c, [250, 252, 255], (nuvem - 0.55) * 3.2);
    return c;
  },
  netuno(x, y, z){
    const turb = fbm(x * 2.5, y * 2.5, z * 2.5, 51) - 0.5;
    const faixa = Math.sin((y + turb * 0.15) * 9) * 0.5 + 0.5;
    let c = rampa([[0, '#1b2f8f'], [0.5, '#2f56c9'], [1, '#5f8be8']], faixa * 0.6 + 0.25);
    const dx = (Math.atan2(x, z) + 0.5) * 1.3, dy = (y + 0.25) * 3;
    if(dx * dx + dy * dy < 0.06) c = mix(c, [16, 26, 80], 0.85);                   // Grande Mancha Escura
    const cirro = fbm(x * 6, y * 14, z * 6, 52, 3);
    if(cirro > 0.66) c = mix(c, [235, 242, 255], (cirro - 0.66) * 4);              // nuvens altas
    return c;
  },
  lua(x, y, z){
    const n = fbm(x * 2.5, y * 2.5, z * 2.5, 61);
    let c = rampa([[0, '#4c4c50'], [0.45, '#7d7c7a'], [0.6, '#a6a49f'], [1, '#cfccc6']], n);
    if(n < 0.42) c = mix(c, [70, 70, 74], 0.6);                                    // mares lunares
    // crateras: células de ruído com centro escuro e borda clara
    const cr = fbm(x * 11, y * 11, z * 11, 62, 2);
    if(cr > 0.68) c = mix(c, [60, 60, 62], (cr - 0.68) * 3);
    else if(cr > 0.63) c = mix(c, [220, 218, 212], (cr - 0.63) * 4);
    return c;
  },
  mercurio(x, y, z){
    const n = fbm(x * 3, y * 3, z * 3, 71);
    const cr = fbm(x * 12, y * 12, z * 12, 72, 2);
    let c = rampa([[0, '#4f4740'], [0.5, '#8a7f74'], [1, '#bdb2a4']], n);
    if(cr > 0.67) c = mix(c, [58, 52, 46], (cr - 0.67) * 3);
    return c;
  },
  venus(x, y, z){
    const turb = fbm(x * 2, y * 2, z * 2, 81);
    const v = Math.sin((y * 3 + turb * 2.5 + Math.atan2(x, z) * 0.6)) * 0.5 + 0.5;
    return rampa([[0, '#b98a3e'], [0.5, '#e3c27d'], [1, '#f6e7bc']], v * 0.6 + turb * 0.4);
  },
  urano(x, y, z){
    const n = fbm(x * 1.5, y * 4, z * 1.5, 91);
    return rampa([[0, '#6fc3c9'], [0.6, '#9fe0e2'], [1, '#c7f1f1']], n * 0.5 + (y + 1) * 0.2);
  },
  plutao(x, y, z){
    const n = fbm(x * 2.6, y * 2.6, z * 2.6, 101);
    const det = fbm(x * 10, y * 10, z * 10, 102, 3);
    let c = rampa([[0, '#6b4a33'], [0.45, '#a07a58'], [0.7, '#c9ab8a'], [1, '#e6d6c0']], n + (det - 0.5) * 0.2);
    const lon = Math.atan2(x, z), lat = Math.asin(Math.max(-1, Math.min(1, y)));
    // faixa escura avermelhada no equador (Cthulhu Macula), a oeste do coração
    const cth = Math.exp(-(((lon + 1.1) / 0.75) ** 2) - ((lat + 0.08) / 0.28) ** 2);
    c = mix(c, [74, 36, 24], cth * 0.85 * (0.7 + det * 0.5));
    // o "coração" claro de gelo de nitrogênio (Tombaugh Regio)
    const borda = (fbm(x * 6, y * 6, z * 6, 103, 3) - 0.5) * 0.35;                   // contorno irregular
    const X = (lon - 0.1) / 0.3, Y = (lat - 0.05) / 0.3;
    const h = X * X + (Y - Math.cbrt(X * X)) ** 2 - 1 + borda;                      // x² + (y − ∛x²)² = 1
    if(h < 0.2) c = mix(c, [244, 238, 228], suave(Math.min(1, (0.2 - h) / 0.4)) * (0.8 + det * 0.2));
    return c;
  },
  sol(x, y, z){
    const gran = fbm(x * 22, y * 22, z * 22, 111, 3);                             // granulação
    const grande = fbm(x * 3, y * 3, z * 3, 112);
    let c = rampa([[0, '#d9480f'], [0.4, '#f76707'], [0.7, '#ffa94d'], [1, '#fff3bf']], gran * 0.65 + grande * 0.45);
    const mancha = fbm(x * 6, y * 6, z * 6, 113, 3);                               // manchas solares perto do equador
    if(mancha > 0.7 && Math.abs(y) < 0.5) c = mix(c, [70, 20, 4], (mancha - 0.7) * 6);
    return c;
  },
};

const ATMOSFERA = { sol:[255, 190, 90], terra:[120, 180, 255], netuno:[110, 150, 255], urano:[170, 240, 245], venus:[255, 225, 160], jupiter:[255, 220, 180], saturno:[255, 230, 180], marte:[255, 160, 120] };

// Pinta a esfera num canvas. raio relativo ao tamanho (Saturno deixa espaço p/ anel).
function pintarEsfera(ctx, tipo, tam, cx, cy, raio, rot){
  const img = ctx.getImageData(0, 0, tam, tam);
  const d = img.data, sup = SUPERFICIES[tipo], atm = ATMOSFERA[tipo];
  const luz = [-0.55, -0.45, 0.70];                        // luz vinda de cima-esquerda, à frente
  const cr = Math.cos(rot), sr = Math.sin(rot);
  for(let py = 0; py < tam; py++) for(let px = 0; px < tam; px++){
    const nx = (px + 0.5 - cx) / raio, ny = (py + 0.5 - cy) / raio;
    const r2 = nx * nx + ny * ny;
    if(r2 > 1) continue;
    const nz = Math.sqrt(1 - r2);
    // gira a esfera em torno do eixo norte-sul (variação entre planetas iguais)
    const x = nx * cr + nz * sr, z = -nx * sr + nz * cr, y = -ny;
    let c = sup(x, y, z);
    const lamb = Math.max(0, nx * luz[0] + ny * luz[1] + nz * luz[2]);
    // o Sol tem luz própria: só escurece um pouco na borda (escurecimento de limbo)
    const sombra = tipo === 'sol' ? 0.72 + 0.4 * nz : 0.12 + 0.95 * Math.pow(lamb, 0.85);
    c = c.map(v => v * sombra);
    if(atm){ const borda = Math.pow(1 - nz, 2.2); c = mix(c, atm, borda * 0.55 * (0.35 + lamb)); }
    const a = Math.min(1, (1 - Math.sqrt(r2)) * raio * 1.5);  // borda antisserrilhada
    const i = (py * tam + px) * 4;
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255 * a;
  }
  ctx.putImageData(img, 0, 0);
}

function anelSaturno(ctx, tam, cx, cy, raio, frente){
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(-0.38); ctx.scale(1, 0.32);
  ctx.beginPath();
  if(frente) ctx.rect(-tam, 0, tam * 2, tam); else ctx.rect(-tam, -tam, tam * 2, tam);
  ctx.clip();
  const faixas = [[1.25, 1.55, 'rgba(214,190,140,.85)'], [1.58, 1.95, 'rgba(232,212,165,.9)'], [2.0, 2.15, 'rgba(190,165,120,.7)']];
  for(const [r1, r2, cor] of faixas){
    ctx.beginPath(); ctx.arc(0, 0, raio * r2, 0, Math.PI * 2); ctx.arc(0, 0, raio * r1, 0, Math.PI * 2, true);
    ctx.fillStyle = cor; ctx.fill('evenodd');
  }
  ctx.restore();
}

function gerarPlaneta(tipo, tam = 128, rot = 0){
  const cv = document.createElement('canvas');
  cv.width = cv.height = tam;
  const ctx = cv.getContext('2d');
  const anel = tipo === 'saturno';
  const raio = tam * (anel ? 0.27 : 0.44), cx = tam / 2, cy = tam / 2;
  if(anel){
    // pinta a esfera num canvas à parte e compõe: anel de trás → esfera → anel da frente
    const esf = document.createElement('canvas'); esf.width = esf.height = tam;
    pintarEsfera(esf.getContext('2d'), tipo, tam, cx, cy, raio, rot);
    anelSaturno(ctx, tam, cx, cy, raio, false);
    ctx.drawImage(esf, 0, 0);
    anelSaturno(ctx, tam, cx, cy, raio, true);
  } else pintarEsfera(ctx, tipo, tam, cx, cy, raio, rot);
  return cv.toDataURL('image/png');
}

function gerarBuracoNegro(tam = 128){
  const cv = document.createElement('canvas');
  cv.width = cv.height = tam;
  const ctx = cv.getContext('2d'), c = tam / 2;
  const brilho = ctx.createRadialGradient(c, c, tam * 0.12, c, c, tam * 0.5);
  brilho.addColorStop(0, 'rgba(255,190,90,.9)'); brilho.addColorStop(0.35, 'rgba(255,120,40,.55)');
  brilho.addColorStop(0.7, 'rgba(140,40,160,.25)'); brilho.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = brilho; ctx.fillRect(0, 0, tam, tam);
  ctx.save(); ctx.translate(c, c); ctx.scale(1, 0.34);                 // disco de acreção
  const disco = ctx.createRadialGradient(0, 0, tam * 0.16, 0, 0, tam * 0.47);
  disco.addColorStop(0, '#fff3c4'); disco.addColorStop(0.3, '#ffb347'); disco.addColorStop(0.75, '#d9480f'); disco.addColorStop(1, 'rgba(120,20,0,0)');
  ctx.fillStyle = disco; ctx.beginPath(); ctx.arc(0, 0, tam * 0.47, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(c, c, tam * 0.17, 0, Math.PI * 2); ctx.fill(); // horizonte de eventos
  ctx.strokeStyle = 'rgba(255,230,170,.9)'; ctx.lineWidth = tam * 0.02;
  ctx.beginPath(); ctx.arc(c, c, tam * 0.185, 0, Math.PI * 2); ctx.stroke();                        // anel de fótons
  return cv.toDataURL('image/png');
}

// Cache: gera cada sprite uma vez por sessão.
const cache = {};
function sprite(tipo, tam = 128, rot = 0){
  const k = `${tipo}:${tam}:${rot}`;
  if(!cache[k]) cache[k] = tipo === 'buraco' ? gerarBuracoNegro(tam) : gerarPlaneta(tipo, tam, rot);
  return cache[k];
}

// Cor da superfície num ponto da esfera unitária (usado para gerar texturas equirretangulares).
const superficie = (tipo, x, y, z) => SUPERFICIES[tipo](x, y, z);
root.GalaxyPlanetas = { sprite, superficie, TIPOS: Object.keys(SUPERFICIES) };
})(window);
