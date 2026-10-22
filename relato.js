/* =========================================================
   GALÁXIA MATCH — RELATO DE PROBLEMAS
   Guarda os últimos avisos e erros do jogo (console, erros não
   tratados e promessas rejeitadas) para o jogador poder mandar
   num "Reportar um problema" em ⚙️ Configurações. Fica só no
   aparelho; nada é enviado sem o jogador tocar em enviar.
   Carregado antes dos outros scripts para pegar erros desde o início.
   ========================================================= */
(function(root){
'use strict';

const CHAVE = 'galaxia-relato-v1', MAX = 25;
let entradas = [];
try { entradas = JSON.parse(localStorage.getItem(CHAVE)) || []; if(!Array.isArray(entradas)) entradas = []; } catch(e){ entradas = []; }
entradas = entradas.filter(x => x && typeof x.m === 'string').slice(-MAX);

let timer = null;
function gravar(){
  clearTimeout(timer);
  timer = setTimeout(() => { try { localStorage.setItem(CHAVE, JSON.stringify(entradas)); } catch(e){} }, 400);
}

function texto(v){
  if(v instanceof Error) return (v.stack || (v.name + ': ' + v.message)).split('\n').slice(0, 4).join(' | ');
  if(typeof v === 'string') return v;
  try { return JSON.stringify(v); } catch(e){ return String(v); }
}

function registrar(tipo, partes){
  const m = partes.map(texto).join(' ').replace(/\s+/g, ' ').slice(0, 320);
  const ultima = entradas[entradas.length - 1];
  if(ultima && ultima.m === m && ultima.t === tipo){ ultima.n = (ultima.n || 1) + 1; ultima.h = Date.now(); gravar(); return; }
  entradas.push({ t:tipo, m, h:Date.now() });
  if(entradas.length > MAX) entradas.splice(0, entradas.length - MAX);
  gravar();
}

// console.warn / console.error continuam aparecendo no console, e também ficam registrados
['warn', 'error'].forEach(nivel => {
  const original = console[nivel].bind(console);
  console[nivel] = (...args) => { try { registrar(nivel === 'warn' ? 'aviso' : 'erro', args); } catch(e){} original(...args); };
});
addEventListener('error', e => registrar('erro', [e.error || e.message || 'erro', e.filename ? `${e.filename.split('/').pop()}:${e.lineno}` : '']));
addEventListener('unhandledrejection', e => registrar('erro', ['promessa rejeitada:', e.reason || '']));

function placaDeVideo(){
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if(!gl) return 'sem WebGL';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  } catch(e){ return 'desconhecida'; }
}

// Texto técnico do relatório (sem dados pessoais: só aparelho, versão, fase e os registros)
function relatorio(info){
  const hora = h => new Date(h).toLocaleString('pt-BR');
  const linhas = [
    `Versão: ${info.versao}`,
    `Aparelho: ${navigator.userAgent}`,
    `Tela: ${screen.width}×${screen.height} (densidade ${devicePixelRatio})`,
    `Memória: ${navigator.deviceMemory || '?'} GB · núcleos: ${navigator.hardwareConcurrency || '?'}`,
    `Vídeo: ${placaDeVideo()}`,
    `Gráficos: ${info.graficos}`,
    `Onde estava: ${info.onde}`,
    `Quando: ${new Date().toLocaleString('pt-BR')}`,
    '',
    `Últimos registros (${entradas.length}):`,
    ...(entradas.length ? entradas.slice(-12).map(x => `[${hora(x.h)}] ${x.t}${x.n > 1 ? ' ×' + x.n : ''}: ${x.m}`) : ['(nenhum erro registrado)'])
  ];
  return linhas.join('\n');
}

root.Relato = { registrar:(tipo, ...p) => registrar(tipo, p), relatorio, get entradas(){ return entradas.slice(); },
  limpar(){ entradas = []; gravar(); } };
})(window);
