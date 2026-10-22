/* =========================================================
   GALÁXIA MATCH — SONS E VIBRAÇÃO
   Efeitos sintetizados com Web Audio (sem arquivos de áudio).
   ========================================================= */
(function(root){
'use strict';
let ctx = null, ligado = true;

function contexto(){
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if(ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}
const audio = () => ligado ? contexto() : null;

// Nota curta com envelope: freq em Hz, dur em s, tipo de onda.
function nota(freq, dur = 0.12, tipo = 'sine', vol = 0.18, atraso = 0, deslizaPara = null){
  const a = audio(); if(!a) return;
  const t = a.currentTime + atraso;
  const o = a.createOscillator(), g = a.createGain();
  o.type = tipo; o.frequency.setValueAtTime(freq, t);
  if(deslizaPara) o.frequency.exponentialRampToValueAtTime(deslizaPara, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

function ruido(dur = 0.4, vol = 0.12, freq = 1200){
  const a = audio(); if(!a) return;
  const n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for(let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8; g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination); src.start();
}

const ESCALA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5]; // dó maior pentatônica-ish

const Sons = {
  set ligado(v){ ligado = v; }, get ligado(){ return ligado; },
  clique(){ nota(660, 0.05, 'triangle', 0.08); },
  troca(){ nota(420, 0.08, 'sine', 0.08, 0, 560); },
  invalida(){ nota(220, 0.1, 'square', 0.05); nota(180, 0.12, 'square', 0.05, 0.08); },
  // estouro de combinação: sobe de tom a cada combo da cascata
  estouro(combo){ const f = ESCALA[Math.min(combo - 1, ESCALA.length - 1)]; nota(f, 0.14, 'triangle', 0.16); nota(f * 1.5, 0.1, 'sine', 0.06, 0.03); },
  cometa(){ ruido(0.35, 0.1, 2400); nota(900, 0.3, 'sawtooth', 0.04, 0, 200); },
  supernova(){ ruido(0.5, 0.16, 500); nota(160, 0.45, 'sine', 0.2, 0, 50); },
  buraco(){ nota(90, 0.9, 'sawtooth', 0.08, 0, 40); ruido(0.8, 0.08, 300); },
  criouEspecial(){ [0, 0.06, 0.12].forEach((t, i) => nota(ESCALA[i + 3], 0.1, 'sine', 0.1, t)); },
  vitoria(){ [0, 0.12, 0.24, 0.4].forEach((t, i) => nota([523, 659, 784, 1047][i], 0.3, 'triangle', 0.16, t)); },
  derrota(){ [0, 0.18, 0.36].forEach((t, i) => nota([392, 330, 262][i], 0.35, 'triangle', 0.12, t)); },
  estrela(i){ nota(ESCALA[4 + i], 0.25, 'sine', 0.14); },
  acerto(){ nota(784, 0.12, 'triangle', 0.14); nota(1047, 0.2, 'triangle', 0.14, 0.1); },
  erro(){ nota(300, 0.25, 'sawtooth', 0.06, 0, 200); },
};

// ---------- música ambiente (gerada na hora, sem arquivo) ----------
// Acordes longos e suaves (pad) trocando a cada 8 s + "brilhos" de notas agudas com eco.
const ACORDES = [[130.81, 164.81, 196, 246.94], [110, 130.81, 164.81, 196], [87.31, 130.81, 164.81, 220], [98, 146.83, 196, 246.94]]; // Dó7M, Lám7, Fá7M, Sol
const BRILHOS = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];
const Musica = (() => {
  let ligada = true, tocando = false, timer = null, saida = null, eco = null, passo = 0, proxPad = 0, proxBrilho = 0;
  function montar(a){
    if(saida) return;
    saida = a.createGain(); saida.gain.value = 0;
    const filtro = a.createBiquadFilter(); filtro.type = 'lowpass'; filtro.frequency.value = 1800;
    eco = a.createDelay(1); eco.delayTime.value = 0.42;
    const volta = a.createGain(); volta.gain.value = 0.35;
    eco.connect(volta).connect(eco); eco.connect(filtro);
    saida.connect(filtro).connect(a.destination);
  }
  function pad(a, t){
    for(const f of ACORDES[passo % ACORDES.length]) for(const d of [-4, 4]){
      const o = a.createOscillator(), g = a.createGain();
      o.type = 'triangle'; o.frequency.value = f; o.detune.value = d;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 2.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 9.5);
      o.connect(g).connect(saida); o.start(t); o.stop(t + 9.6);
    }
    passo++;
  }
  function brilho(a, t){
    const o = a.createOscillator(), g = a.createGain();
    o.type = 'sine'; o.frequency.value = BRILHOS[Math.floor(Math.random() * BRILHOS.length)];
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    o.connect(g); g.connect(saida); g.connect(eco); o.start(t); o.stop(t + 1.5);
  }
  function agendar(){
    const a = contexto(); if(!a || !tocando) return;
    const t = a.currentTime;
    if(proxPad < t + 0.5){ pad(a, Math.max(t, proxPad)); proxPad = Math.max(t, proxPad) + 8; }
    if(proxBrilho < t + 0.5){ brilho(a, Math.max(t, proxBrilho)); proxBrilho = Math.max(t, proxBrilho) + 1.2 + Math.random() * 2.2; }
  }
  function tocar(){
    if(!ligada || tocando || document.hidden) return;
    const a = contexto(); if(!a) return;
    montar(a); tocando = true;
    saida.gain.cancelScheduledValues(a.currentTime); saida.gain.setTargetAtTime(1, a.currentTime, 1.2);
    proxPad = proxBrilho = 0;
    timer = setInterval(agendar, 250); agendar();
  }
  function parar(){
    if(!tocando) return;
    tocando = false; clearInterval(timer);
    const a = contexto(); if(a && saida){ saida.gain.cancelScheduledValues(a.currentTime); saida.gain.setTargetAtTime(0, a.currentTime, 0.3); }
  }
  // app minimizado / aba escondida: silêncio
  document.addEventListener('visibilitychange', () => { if(document.hidden) parar(); else tocar(); });
  return {
    set ligada(v){ ligada = v; v ? tocar() : parar(); }, get ligada(){ return ligada; },
    get tocando(){ return tocando; },
    tocar, parar,
  };
})();

// Vibração: no app Android usa o plugin háptico do Tauri; no navegador, a Vibration API.
function vibrar(ms){
  if(!vibrar.ligado) return;
  try {
    if(window.__TAURI_INTERNALS__ && /Android/i.test(navigator.userAgent)){
      window.__TAURI_INTERNALS__.invoke('plugin:haptics|vibrate', { duration: ms }).catch(() => {});
    } else if(navigator.vibrate) navigator.vibrate(ms);
  } catch {}
}

vibrar.ligado = true;

root.GalaxySons = Sons;
root.GalaxyMusica = Musica;
root.GalaxyVibrar = vibrar;
})(window);
