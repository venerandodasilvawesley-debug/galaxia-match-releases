/* =========================================================
   GALÁXIA MATCH — CONTEÚDO EDUCATIVO
   10 mundos (Mercúrio → Netuno, Plutão e o Sol), 5 fases cada. Cada fase
   vencida libera uma carta de curiosidade do álbum; o quiz
   pergunta sobre cartas já ganhas e dá jogadas extras.
   Valores arredondados, de fontes de divulgação (NASA/ESA).
   ========================================================= */
(function(root){
'use strict';

// Peças do tabuleiro (as "cores"). Cada uma tem forma própria além da cor.
const PECAS = [
  { id:'marte',   nome:'Marte' },
  { id:'jupiter', nome:'Júpiter' },
  { id:'saturno', nome:'Saturno' },
  { id:'terra',   nome:'Terra' },
  { id:'netuno',  nome:'Netuno' },
  { id:'lua',     nome:'Lua' },
];

// carta: { fato, pergunta, certa, erradas:[2] }
const MUNDOS = [
  { id:'mercurio', nome:'Mercúrio', cor:'#9a8f86', fundo:'#1a1612', intro:'O planeta mais perto do Sol. Rápido, pequeno e de extremos.',
    cartas:[
      { fato:'Mercúrio é o planeta mais próximo do Sol.', pergunta:'Qual é o planeta mais próximo do Sol?', certa:'Mercúrio', erradas:['Vênus','Marte'] },
      { fato:'Um ano em Mercúrio dura só 88 dias terrestres.', pergunta:'Quanto dura um ano em Mercúrio?', certa:'88 dias', erradas:['365 dias','12 anos'] },
      { fato:'Mercúrio não tem nenhuma lua.', pergunta:'Quantas luas Mercúrio tem?', certa:'Nenhuma', erradas:['Uma','Duas'] },
      { fato:'Quase sem atmosfera para segurar o calor, Mercúrio vai de cerca de 430 °C de dia a −180 °C à noite.', pergunta:'Por que Mercúrio esfria tanto à noite?', certa:'Quase não tem atmosfera', erradas:['Tem muitas luas','Fica longe do Sol'] },
      { fato:'Mercúrio é o menor planeta do Sistema Solar — só um pouco maior que a nossa Lua: cerca de 1,4 vez o tamanho dela.', pergunta:'Qual é o menor planeta do Sistema Solar?', certa:'Mercúrio', erradas:['Marte','Netuno'] },
    ] },
  { id:'venus', nome:'Vênus', cor:'#e8c37a', fundo:'#22170a', intro:'Coberto de nuvens ácidas e com um efeito estufa fora de controle.',
    cartas:[
      { fato:'Vênus é o planeta mais quente — cerca de 465 °C — por causa do efeito estufa, mesmo não sendo o mais próximo do Sol.', pergunta:'Qual é o planeta mais quente do Sistema Solar?', certa:'Vênus', erradas:['Mercúrio','Júpiter'] },
      { fato:'Vênus leva 243 dias terrestres para dar uma volta em torno de si mesmo — mais que os 225 dias que leva para dar a volta no Sol.', pergunta:'Em Vênus, o que demora mais?', certa:'Girar em torno de si mesmo', erradas:['Dar a volta no Sol','Os dois demoram igual'] },
      { fato:'Vênus gira ao contrário da maioria dos planetas: lá o Sol nasce no oeste.', pergunta:'De que lado o Sol nasce em Vênus?', certa:'No oeste', erradas:['No leste','No norte'] },
      { fato:'A pressão na superfície de Vênus é cerca de 90 vezes a da Terra — como estar a 900 m de profundidade no mar.', pergunta:'A pressão em Vênus é parecida com…', certa:'Estar a 900 m no fundo do mar', erradas:['O topo do Everest','A da Terra'] },
      { fato:'Depois da Lua, Vênus é o objeto mais brilhante do céu noturno — é a "estrela-d’alva".', pergunta:'Qual planeta é chamado de "estrela-d’alva"?', certa:'Vênus', erradas:['Marte','Saturno'] },
    ] },
  { id:'terra', nome:'Terra', cor:'#3fa7d6', fundo:'#07182a', intro:'Nosso planeta: o único lugar conhecido onde existe vida.',
    cartas:[
      { fato:'A Terra é o único planeta conhecido com vida.', pergunta:'Em qual planeta sabemos que existe vida?', certa:'Terra', erradas:['Marte','Vênus'] },
      { fato:'Cerca de 71% da superfície da Terra é coberta por água.', pergunta:'Quanto da superfície da Terra é água?', certa:'Cerca de 71%', erradas:['Cerca de 30%','Cerca de 95%'] },
      { fato:'A luz do Sol leva cerca de 8 minutos e 20 segundos para chegar à Terra.', pergunta:'Quanto tempo a luz do Sol leva para chegar à Terra?', certa:'Cerca de 8 minutos', erradas:['1 segundo','1 dia'] },
      { fato:'A Lua se afasta da Terra cerca de 3,8 cm por ano.', pergunta:'O que a Lua faz todo ano?', certa:'Se afasta uns 3,8 cm', erradas:['Se aproxima 1 km','Fica parada'] },
      { fato:'A Terra é o planeta mais denso do Sistema Solar.', pergunta:'Qual é o planeta mais denso?', certa:'Terra', erradas:['Júpiter','Saturno'] },
    ] },
  { id:'marte', nome:'Marte', cor:'#d9583b', fundo:'#200a06', intro:'O planeta vermelho, com o maior vulcão do Sistema Solar.',
    cartas:[
      { fato:'Marte é vermelho por causa do óxido de ferro — ferrugem — espalhado pelo solo.', pergunta:'Por que Marte é vermelho?', certa:'Ferrugem no solo', erradas:['É muito quente','Reflete o Sol'] },
      { fato:'O Monte Olimpo, em Marte, é o maior vulcão do Sistema Solar: cerca de 22 km acima do terreno ao redor, quase 2,5 vezes o Everest.', pergunta:'Onde fica o maior vulcão do Sistema Solar?', certa:'Em Marte', erradas:['Na Terra','Em Vênus'] },
      { fato:'Marte tem duas luas pequenas: Fobos e Deimos.', pergunta:'Como se chamam as luas de Marte?', certa:'Fobos e Deimos', erradas:['Io e Europa','Titã e Tritão'] },
      { fato:'Um dia em Marte (o "sol") dura cerca de 24 h 40 min — quase igual ao nosso.', pergunta:'Quanto dura um dia em Marte?', certa:'Pouco mais de 24 h', erradas:['10 horas','243 dias'] },
      { fato:'A gravidade de Marte é cerca de 38% da terrestre: quem pesa 50 kg aqui "pesaria" uns 19 kg lá.', pergunta:'Quem pesa 50 kg na Terra "pesaria" quanto em Marte?', certa:'Cerca de 19 kg', erradas:['Cerca de 100 kg','Os mesmos 50 kg'] },
    ] },
  { id:'jupiter', nome:'Júpiter', cor:'#e09a5a', fundo:'#1f1206', intro:'O gigante gasoso: maior que todos os outros planetas juntos.',
    cartas:[
      { fato:'Júpiter é o maior planeta: caberiam mais de 1.300 Terras dentro dele.', pergunta:'Quantas Terras caberiam dentro de Júpiter?', certa:'Mais de 1.300', erradas:['Umas 10','Exatamente 2'] },
      { fato:'A Grande Mancha Vermelha de Júpiter é uma tempestade maior que a Terra, observada há quase 200 anos.', pergunta:'O que é a Grande Mancha Vermelha?', certa:'Uma tempestade gigante', erradas:['Um vulcão','Um oceano'] },
      { fato:'Júpiter tem o dia mais curto do Sistema Solar: gira uma vez em menos de 10 horas.', pergunta:'Qual planeta tem o dia mais curto?', certa:'Júpiter', erradas:['Mercúrio','Terra'] },
      { fato:'As quatro maiores luas de Júpiter — Io, Europa, Ganimedes e Calisto — foram descobertas por Galileu em 1610.', pergunta:'Quem descobriu as grandes luas de Júpiter?', certa:'Galileu Galilei', erradas:['Isaac Newton','Albert Einstein'] },
      { fato:'Ganimedes, lua de Júpiter, é a maior lua do Sistema Solar — maior até que Mercúrio.', pergunta:'Qual é a maior lua do Sistema Solar?', certa:'Ganimedes', erradas:['A nossa Lua','Fobos'] },
    ] },
  { id:'saturno', nome:'Saturno', cor:'#e6c869', fundo:'#1d1707', intro:'O senhor dos anéis — e das luas.',
    cartas:[
      { fato:'Os anéis de Saturno são feitos de pedaços de gelo e rocha, de grãos de poeira a blocos do tamanho de casas.', pergunta:'Do que são feitos os anéis de Saturno?', certa:'Gelo e rocha', erradas:['Gás quente','Metal líquido'] },
      { fato:'Saturno é tão pouco denso que, em teoria, flutuaria numa banheira gigante cheia de água.', pergunta:'O que aconteceria com Saturno numa banheira gigante?', certa:'Flutuaria', erradas:['Afundaria','Derreteria'] },
      { fato:'Saturno é o planeta com mais luas conhecidas: mais de 200.', pergunta:'Qual planeta tem mais luas conhecidas?', certa:'Saturno', erradas:['Terra','Marte'] },
      { fato:'Titã, a maior lua de Saturno, tem atmosfera densa e lagos de metano e etano líquidos.', pergunta:'O que existe nos lagos de Titã?', certa:'Metano líquido', erradas:['Água doce','Lava'] },
      { fato:'Os anéis de Saturno têm cerca de 280 mil km de diâmetro, mas em geral menos de 1 km de espessura.', pergunta:'Os anéis de Saturno são…', certa:'Enormes e muito finos', erradas:['Pequenos e grossos','Uma bola sólida'] },
    ] },
  { id:'urano', nome:'Urano', cor:'#8fd6d9', fundo:'#071b1d', intro:'O gigante de gelo que gira deitado.',
    cartas:[
      { fato:'Urano gira "deitado": seu eixo é inclinado cerca de 98°.', pergunta:'O que é diferente na rotação de Urano?', certa:'Ele gira deitado', erradas:['Não gira','Gira muito rápido'] },
      { fato:'Urano foi o primeiro planeta descoberto com telescópio, por William Herschel, em 1781.', pergunta:'Como Urano foi descoberto?', certa:'Com telescópio, em 1781', erradas:['A olho nu, na Antiguidade','Por uma sonda'] },
      { fato:'A cor azul-esverdeada de Urano vem do metano na atmosfera.', pergunta:'O que dá a cor azul-esverdeada a Urano?', certa:'Metano', erradas:['Água','Ferro'] },
      { fato:'Urano tem as temperaturas mais baixas já medidas num planeta do Sistema Solar: cerca de −224 °C.', pergunta:'Qual planeta registrou as temperaturas mais baixas?', certa:'Urano', erradas:['Mercúrio','Marte'] },
      { fato:'Um ano em Urano dura 84 anos terrestres: cada polo passa cerca de 42 anos de dia e 42 de noite.', pergunta:'Quanto dura um ano em Urano?', certa:'84 anos terrestres', erradas:['1 ano','10 dias'] },
    ] },
  { id:'netuno', nome:'Netuno', cor:'#4a6ee0', fundo:'#070d24', intro:'O último planeta: ventos furiosos no frio extremo.',
    cartas:[
      { fato:'Netuno tem os ventos mais rápidos do Sistema Solar: mais de 2.000 km/h.', pergunta:'Onde sopram os ventos mais rápidos do Sistema Solar?', certa:'Em Netuno', erradas:['Na Terra','Em Marte'] },
      { fato:'Netuno foi previsto por cálculos matemáticos antes de ser visto pela primeira vez, em 1846.', pergunta:'Como Netuno foi encontrado?', certa:'Previsto por cálculos', erradas:['Por acaso, a olho nu','Por uma sonda'] },
      { fato:'Netuno leva 165 anos para dar uma volta no Sol: completou a primeira volta desde a descoberta só em 2011.', pergunta:'Quanto tempo Netuno leva para dar uma volta no Sol?', certa:'165 anos', erradas:['1 ano','30 dias'] },
      { fato:'Tritão, a maior lua de Netuno, gira em volta do planeta no sentido contrário ao da rotação dele.', pergunta:'O que Tritão tem de estranho?', certa:'Orbita ao contrário', erradas:['É quadrada','É maior que Netuno'] },
      { fato:'Netuno fica a cerca de 4,5 bilhões de km do Sol — a luz leva umas 4 horas para chegar lá.', pergunta:'Quanto tempo a luz do Sol leva para chegar a Netuno?', certa:'Cerca de 4 horas', erradas:['8 minutos','1 segundo'] },
    ] },
  // Depois dos 8 planetas: o planeta-anão mais famoso e, no fim da viagem, a estrela que comanda tudo.
  { id:'plutao', nome:'Plutão', cor:'#c9a27e', fundo:'#1a130c', intro:'Planeta-anão gelado no Cinturão de Kuiper, com um coração no peito.',
    cartas:[
      { fato:'Em 2006, a União Astronômica Internacional reclassificou Plutão como planeta-anão.', pergunta:'Em que ano Plutão virou planeta-anão?', certa:'2006', erradas:['1930','1990'] },
      { fato:'Plutão tem uma grande região clara em forma de coração, a Tombaugh Regio, fotografada pela sonda New Horizons em 2015.', pergunta:'Que forma tem a famosa mancha clara de Plutão?', certa:'Coração', erradas:['Estrela','Triângulo'] },
      { fato:'Plutão é menor que a nossa Lua: tem cerca de 2.400 km de diâmetro.', pergunta:'Comparado à nossa Lua, Plutão é…', certa:'Menor', erradas:['Maior','Igual'] },
      { fato:'Plutão leva cerca de 248 anos terrestres para dar uma volta no Sol.', pergunta:'Quanto dura um ano em Plutão?', certa:'Cerca de 248 anos', erradas:['12 anos','88 dias'] },
      { fato:'Caronte, a maior lua de Plutão, tem metade do tamanho dele — os dois giram em volta de um ponto entre eles.', pergunta:'Como se chama a maior lua de Plutão?', certa:'Caronte', erradas:['Titã','Europa'] },
    ] },
  { id:'sol', nome:'Sol', cor:'#ffa94d', fundo:'#241004', intro:'De volta ao centro: a estrela que ilumina e segura todo o Sistema Solar.',
    cartas:[
      { fato:'O Sol é uma estrela e concentra cerca de 99,8% de toda a massa do Sistema Solar.', pergunta:'Quanto da massa do Sistema Solar está no Sol?', certa:'Cerca de 99,8%', erradas:['Metade','Cerca de 10%'] },
      { fato:'O Sol tem cerca de 4,6 bilhões de anos — está mais ou menos na metade da vida.', pergunta:'Qual é a idade do Sol?', certa:'Cerca de 4,6 bilhões de anos', erradas:['Cerca de 6 mil anos','Cerca de 100 milhões de anos'] },
      { fato:'A superfície do Sol tem cerca de 5.500 °C, mas o núcleo passa de 15 milhões de °C.', pergunta:'Qual parte do Sol é mais quente?', certa:'O núcleo', erradas:['A superfície','As manchas solares'] },
      { fato:'No núcleo do Sol, o hidrogênio se funde e vira hélio: essa fusão nuclear gera a luz e o calor que chegam até nós.', pergunta:'O que produz a energia do Sol?', certa:'Fusão nuclear', erradas:['Fogo comum','Eletricidade'] },
      { fato:'Daqui a uns 5 bilhões de anos o Sol vai inchar e virar uma gigante vermelha e, depois, uma anã branca — ele não tem massa para virar supernova.', pergunta:'O que o Sol vai virar no futuro?', certa:'Uma gigante vermelha', erradas:['Um buraco negro','Uma supernova'] },
    ] },
];

// ---------- fases ----------
// Padrões de poeira cósmica ('#' = poeira). Em ordem de dificuldade: casas no
// meio do tabuleiro são fáceis de alcançar; cantos e a última linha ficaram de fora
// porque, na simulação, eram difíceis demais até com 45 jogadas.
const POEIRA = {
  centro:  ['........','........','..####..','..####..','..####..','..####..','........','........'],
  faixa:   ['........','........','........','########','########','........','........','........'],
  cruz:    ['........','...##...','...##...','.######.','.######.','...##...','...##...','........'],
  anel:    ['........','.######.','.#....#.','.#....#.','.#....#.','.#....#.','.######.','........'],
  losango: ['........','...##...','..#..#..','.#....#.','.#....#.','..#..#..','...##...','........'],
  baixa:   ['........','........','........','........','........','.######.','.######.','........'],
  colunas: ['.#.##.#.','.#.##.#.','.#.##.#.','.#.##.#.','.#.##.#.','.#.##.#.','.#.##.#.','.#.##.#.'],
  blocos:  ['........','.##..##.','.##..##.','........','........','.##..##.','.##..##.','........'],
};

// Gera as 50 fases (as 40 primeiras não mudam: Plutão e Sol vieram depois e só se somam). Tipos por posição no mundo: pontos → coletar 1 cor → poeira →
// coletar 2 cores → chefe (poeira + coleta). Os objetivos crescem com o índice e as
// JOGADAS de cada fase vêm da calibragem por simulação (tests/calibrar.js).
function gerarFases(){
  const poeiraFase3 = ['centro','faixa','cruz','anel','losango','baixa','colunas','blocos','losango','anel'];
  const poeiraChefe = ['centro','centro','faixa','faixa','cruz','anel','losango','baixa','cruz','anel'];
  const fases = [];
  MUNDOS.forEach((m, w) => {
    for(let f = 0; f < 5; f++){
      const i = w * 5 + f;
      const cores = i < 5 ? 5 : 6;
      const t = i / 39;                       // 0 → 1 até Netuno; passa de 1 em Plutão e no Sol
      const cor = (a) => (w + f + a) % cores;
      const fase = { id:i, mundo:w, numero:f + 1, cores, jogadas:25, objetivos:{}, poeira:null };
      if(f === 0) fase.objetivos.pontos = Math.round((6000 + t * 18000) / 500) * 500;
      if(f === 1) fase.objetivos.coletar = { [cor(0)]: Math.round(18 + t * 14) };
      if(f === 2){ fase.poeira = POEIRA[poeiraFase3[w]]; fase.objetivos.poeira = true; }
      if(f === 3) fase.objetivos.coletar = { [cor(0)]: Math.round(12 + t * 10), [cor(2)]: Math.round(12 + t * 10) };
      if(f === 4){
        fase.poeira = POEIRA[poeiraChefe[w]];
        fase.objetivos.poeira = true;
        fase.objetivos.coletar = { [cor(1)]: Math.round(8 + t * 8) };
        if(i === 49) fase.objetivos.coletar[cor(3)] = 12;   // chefe final (Sol): duas cores + poeira
      }
      fases.push(fase);
    }
  });
  return fases;
}

const FASES = gerarFases();
// Jogadas calibradas por simulação (web/calibragem.js), quando existirem.
const CAL = typeof module !== 'undefined' && module.exports
  ? (() => { try { return require('./calibragem.js'); } catch { return null; } })()
  : root.GalaxyCalibragem;
if(CAL) FASES.forEach((f, i) => { if(CAL[i]) f.jogadas = CAL[i]; });
// Ficha de cada mundo para as cartas colecionáveis (valores médios de referência da NASA;
// luas confirmadas até 2025). tipo aparece como o "tipo" da carta.
const FICHAS = {
  mercurio:{ tipo:'Rochoso', diametro:'4.879 km', temperatura:'−173 a 427 °C', gravidade:'0,38 g', dia:'59 dias', luas:'0', distancia:'58 mi km' },
  venus:   { tipo:'Rochoso', diametro:'12.104 km', temperatura:'464 °C', gravidade:'0,91 g', dia:'243 dias', luas:'0', distancia:'108 mi km' },
  terra:   { tipo:'Rochoso', diametro:'12.742 km', temperatura:'15 °C', gravidade:'1 g', dia:'24 h', luas:'1', distancia:'150 mi km' },
  marte:   { tipo:'Rochoso', diametro:'6.779 km', temperatura:'−63 °C', gravidade:'0,38 g', dia:'24 h 37 min', luas:'2', distancia:'228 mi km' },
  jupiter: { tipo:'Gigante gasoso', diametro:'139.820 km', temperatura:'−110 °C', gravidade:'2,53 g', dia:'9 h 56 min', luas:'95', distancia:'778 mi km' },
  saturno: { tipo:'Gigante gasoso', diametro:'116.460 km', temperatura:'−140 °C', gravidade:'1,07 g', dia:'10 h 33 min', luas:'274', distancia:'1,4 bi km' },
  urano:   { tipo:'Gigante de gelo', diametro:'50.724 km', temperatura:'−195 °C', gravidade:'0,90 g', dia:'17 h 14 min', luas:'29', distancia:'2,9 bi km' },
  netuno:  { tipo:'Gigante de gelo', diametro:'49.244 km', temperatura:'−200 °C', gravidade:'1,14 g', dia:'16 h 6 min', luas:'16', distancia:'4,5 bi km' },
  plutao:  { tipo:'Planeta-anão', diametro:'2.377 km', temperatura:'−229 °C', gravidade:'0,06 g', dia:'6,4 dias', luas:'5', distancia:'5,9 bi km' },
  sol:     { tipo:'Estrela', diametro:'1.392.700 km', temperatura:'5.500 °C', gravidade:'28 g', dia:'≈27 dias', luas:'8 planetas', distancia:'centro' },
};
// ---------- evento de Natal ----------
// Um mundo a mais, fora da viagem principal: só aparece no evento (natal.js decide as datas).
// As 50 fases da viagem não mudam; as do Polo Norte continuam a numeração (50 a 54) para
// estrelas e cartas ficarem no mesmo progresso salvo. Nelas a poeira cósmica vira GELO.
const POEIRA_NATAL = {
  floco:  ['........','...##...','..####..','.######.','.######.','..####..','...##...','........'],
  arvore: ['...##...','..####..','.######.','..####..','.######.','########','...##...','........'],
};
const NATAL = {
  mundo: { id:'polo', foto:'terra', nome:'Polo Norte', cor:'#3ccf6e', fundo:'#04170c', evento:true,
    intro:'Evento de Natal: no topo do mundo, o gelo esconde os planetas.',
    cartas:[
      { fato:'Na véspera de Natal de 1968, a Apollo 8 levou os primeiros humanos a dar a volta na Lua — e fez a famosa foto "Nascer da Terra".', pergunta:'Qual missão deu a volta na Lua no Natal de 1968?', certa:'Apollo 8', erradas:['Apollo 11','Sputnik 1'] },
      { fato:'No Brasil, dezembro é verão: perto do dia 21 acontece o solstício, o dia mais longo do ano no Hemisfério Sul.', pergunta:'Que estação começa no Brasil em dezembro?', certa:'Verão', erradas:['Inverno','Outono'] },
      { fato:'No Polo Norte, o Sol fica cerca de seis meses sem nascer: é a noite polar, que vai de setembro a março.', pergunta:'O que acontece no Polo Norte no Natal?', certa:'É noite o dia inteiro', erradas:['É dia o tempo todo','Faz calor'] },
      { fato:'A Estação Espacial Internacional dá uma volta na Terra a cada 90 minutos: os astronautas veem uns 16 nasceres do Sol por dia — até no Natal.', pergunta:'Quantos nasceres do Sol os astronautas da ISS veem por dia?', certa:'Cerca de 16', erradas:['Só 1','Nenhum'] },
      { fato:'O Telescópio Espacial James Webb, o maior já lançado ao espaço, decolou no dia de Natal: 25 de dezembro de 2021.', pergunta:'Em que dia o telescópio James Webb foi lançado?', certa:'No Natal de 2021', erradas:['No Ano-Novo de 2000','No Carnaval de 2010'] },
    ] },
  // jogadas calibradas por simulação (tests/calibrar-natal.js): o evento é para todo mundo,
  // então fica mais fácil que o fim da viagem
  fases: [
    { numero:1, cores:6, jogadas:16, objetivos:{ pontos:11000 }, poeira:null },
    { numero:2, cores:6, jogadas:23, objetivos:{ coletar:{ 3:20 } }, poeira:null },
    { numero:3, cores:6, jogadas:20, objetivos:{ poeira:true }, poeira:POEIRA_NATAL.floco },
    { numero:4, cores:6, jogadas:19, objetivos:{ coletar:{ 5:14, 4:14 } }, poeira:null },
    { numero:5, cores:6, jogadas:26, objetivos:{ poeira:true, coletar:{ 3:10 } }, poeira:POEIRA_NATAL.arvore },
  ].map((f, k) => ({ ...f, id:FASES.length + k, mundo:MUNDOS.length, gelo:true })),
  // carta especial do calendário do advento (porta do dia 25)
  carta: { nome:'Terra Nevada', fato:'No Natal, o Brasil está no verão e o Polo Norte, no inverno: é a inclinação de 23,4° do eixo da Terra que cria as estações.' },
};
FICHAS.polo = { tipo:'Evento de Natal', diametro:'12.742 km', temperatura:'≈ −34 °C no inverno', gravidade:'1 g', dia:'noite polar', luas:'1', distancia:'150 mi km' };

const api = { PECAS, MUNDOS, FASES, POEIRA, FICHAS, NATAL };
if(typeof module !== 'undefined' && module.exports) module.exports = api;
else root.GalaxyConteudo = api;
})(typeof window !== 'undefined' ? window : globalThis);
