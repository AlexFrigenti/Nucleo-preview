/* ============ SERVICE WORKER DE NÚCLEO ============
   Guarda una copia del juego en el móvil para que abra sin conexión.

   Estrategia:
   - La PÁGINA (navegación) se pide siempre fresca a internet si hay
     conexión (así ves los cambios al instante); si no hay, se usa la copia.
   - El resto de archivos: internet primero, revalidando contra red antes de
     usar la copia local. Así la preview no queda atrapada en un asset viejo.
   - Mensaje 'actualizar': vuelve a bajar todo salteando la caché del
     navegador y avisa a la app para que recargue con lo nuevo.

   Sube el número de CACHE si cambias esta lógica. */

const CACHE = 'nucleo-v34';
const ARCHIVOS = ['./', './index.html', './styles/app.css?v=56', './scripts/app.js?v=56', './registro.js?v=56', './manifest.webmanifest?v=56', './version.json'];

// 1) Instalación: guarda la copia inicial.
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ARCHIVOS))
  );
});

// 2) Activación: borra copias de versiones anteriores.
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(claves =>
      Promise.all(claves.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 3) Peticiones: página sin caché; assets revalidados contra red.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const esPagina = e.request.mode === 'navigate';
  const peticion = new Request(e.request.url, {
    cache: esPagina ? 'no-store' : 'no-cache'
  });
  e.respondWith(
    fetch(peticion)
      .then(resp => {
        const copia = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copia));
        return resp;
      })
      .catch(() =>
        caches.match(e.request).then(r => r || caches.match('./index.html'))
      )
  );
});

// 4) 'actualizar': rebaja todo saltando la caché del navegador y avisa a la app.
self.addEventListener('message', e => {
  if (e.data === 'actualizar') {
    e.waitUntil((async () => {
      const c = await caches.open(CACHE);
      await Promise.all(
        ARCHIVOS.map(u =>
          fetch(u, { cache: 'reload' }).then(r => c.put(u, r)).catch(() => {})
        )
      );
      const clientes = await self.clients.matchAll();
      clientes.forEach(cl => cl.postMessage('actualizado'));
    })());
  }
});
