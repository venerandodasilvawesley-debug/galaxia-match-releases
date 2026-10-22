/* =========================================================
   GALÁXIA MATCH — EVENTO DE NATAL (datas e calendário do advento)
   O evento vai de 1º de dezembro a 6 de janeiro (Dia de Reis).
   Calendário do advento: uma porta por dia, de 1 a 25 de dezembro;
   dá para abrir as portas de dias que já passaram (quem não jogou
   num dia não perde o presente), nunca as de dias que ainda vão chegar.
   Prévia (live, testes): ?natal=DD finge que hoje é DD de dezembro.
   Na prévia nada do calendário é guardado e os presentes não valem.
   ========================================================= */
(function(root){
'use strict';

const PRIMEIRA_PORTA = 1, ULTIMA_PORTA = 25;
const FIM_JANEIRO = 6;

// ?natal=DD (1 a 31) → prévia de dezembro
let simulado = null;
try {
  const v = new URLSearchParams(location.search).get('natal');
  if(v !== null && /^\d{1,2}$/.test(v) && Number(v) >= 1 && Number(v) <= 31) simulado = Number(v);
} catch(e){}

function hoje(){
  if(simulado !== null){ const d = new Date(); return { ano:d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear(), mes:11, dia:simulado }; }
  const d = new Date();
  return { ano:d.getFullYear(), mes:d.getMonth(), dia:d.getDate() };
}

// em janeiro o evento ainda é o do Natal do ano anterior
function anoDoEvento(){ const h = hoje(); return h.mes === 0 ? h.ano - 1 : h.ano; }
function ativo(){ const h = hoje(); return h.mes === 11 || (h.mes === 0 && h.dia <= FIM_JANEIRO); }

// até que porta já dá para abrir (0 = nenhuma)
function ultimaPortaLiberada(){
  const h = hoje();
  if(!ativo()) return 0;
  if(h.mes === 0) return ULTIMA_PORTA;
  return Math.min(ULTIMA_PORTA, h.dia);
}

// dias até o Natal (0 no dia 25 e depois)
function diasParaONatal(){ const h = hoje(); return h.mes === 11 && h.dia < 25 ? 25 - h.dia : 0; }

// Presente de cada porta: poderes, com dias maiores no fim de semana do Natal; a 25 dá a carta
// especial Terra Nevada. Lista fixa: todo mundo ganha a mesma coisa no mesmo dia.
const CICLO = ['meteoro', 'foguete', 'gravidade', 'jogadas'];
function presente(dia){
  if(dia === ULTIMA_PORTA) return { carta:true, poderes:{ meteoro:1, foguete:1, gravidade:1, jogadas:1 } };
  const p = { [CICLO[(dia - 1) % 4]]:1 };
  if(dia % 6 === 0 || dia >= 22) p[CICLO[(dia + 1) % 4]] = (p[CICLO[(dia + 1) % 4]] || 0) + 1;   // dias 6, 12, 18 e a reta final: 2 poderes
  return { poderes:p };
}

root.GalaxyNatal = {
  PRIMEIRA_PORTA, ULTIMA_PORTA,
  get simulado(){ return simulado !== null; },
  hoje, anoDoEvento, ativo, ultimaPortaLiberada, diasParaONatal, presente
};
})(window);
