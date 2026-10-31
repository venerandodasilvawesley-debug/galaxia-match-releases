// Service worker: guarda os arquivos do jogo para funcionar offline
// (no iPhone/Android instalado pelo navegador). Troque VERSAO a cada publicação.
const VERSAO = 'galaxia-v41';
const ARQUIVOS = ['./', 'index.html', 'estilo.css', 'relato.js', 'desempenho.js', 'calibragem.js', 'conteudo.js', 'natal.js', 'defesa.js', 'sistema.js', 'engine.js', 'regras.js', 'planetas.js', 'sons.js', 'fx.js', 'neve.js', 'galaxia.js', 'tab2d.js', 'jogo.js', 'render3d.js', 'vendor/three.module.min.js',
  ...['marte', 'jupiter', 'saturno', 'terra', 'netuno', 'lua', 'mercurio', 'venus', 'urano', 'plutao', 'sol', 'terra-nuvens'].map(t => `texturas/${t}.jpg`), 'texturas/saturno-anel.png',
  'manifest.webmanifest', 'icones/icone-192.png', 'icones/icone-512.png', 'icones/icone-180.png'];
// cache:'reload': ao instalar uma versão nova, busca cada arquivo direto do servidor — sem isso o
// navegador podia reaproveitar a cópia antiga do próprio cache HTTP e misturar versões
self.addEventListener('install', e => e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS.map(u => new Request(u, { cache:'reload' })))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
