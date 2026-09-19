// Cache only app files, never archives, user attachments or arbitrary requests.
// Updates wait until previous tabs close; no forced reload during note editing.
const CACHE='archivo-web-2.2.0-1';
const FILES=['./','./index.html','./app.js','./storage.js','./zip.js','./style.css','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./briefing.html'];
const ALLOWED=new Set(FILES.map(p=>new URL(p,self.location).href));
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(p=>new Request(p,{cache:'reload'}))))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('archivo-web-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  const url=new URL(event.request.url);url.search='';url.hash='';
  if(!ALLOWED.has(url.href))return;
  event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(url.href))||fetch(event.request)));
});
