/*
 * Service worker da área de pedidos de evento (EDI-125), escopo /admin/evento.
 * Guarda a tela e os arquivos dela para abrir sem internet no evento.
 * - Navegação: rede primeiro; sem rede, a última versão guardada.
 * - /_next/static e fontes: cache primeiro (arquivos versionados).
 * - /api/*: nunca passa pelo cache — os erros chegam reais à aba Network.
 */
const CACHE = "voxelas-evento-v1";
const PAGINA_PRINCIPAL = "/admin/evento";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c.startsWith("voxelas-evento-") && c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

async function redePrimeiro(request) {
  const url = new URL(request.url);
  const chave = url.origin + url.pathname;
  const cache = await caches.open(CACHE);
  try {
    const resposta = await fetch(request);
    // Só guarda a página de verdade — não o login para onde um redirect levaria.
    if (resposta.ok && !resposta.redirected) await cache.put(chave, resposta.clone());
    return resposta;
  } catch (erro) {
    const guardada = (await cache.match(chave)) || (await cache.match(url.origin + PAGINA_PRINCIPAL));
    if (guardada) return guardada;
    throw erro;
  }
}

async function cachePrimeiro(request) {
  const cache = await caches.open(CACHE);
  const guardada = await cache.match(request);
  if (guardada) return guardada;
  const resposta = await fetch(request);
  if (resposta.ok || resposta.type === "opaque") await cache.put(request, resposta.clone());
  return resposta;
}

self.addEventListener("fetch", (evento) => {
  const { request } = evento;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate" && url.origin === self.location.origin) {
    evento.respondWith(redePrimeiro(request));
    return;
  }

  const estatico =
    (url.origin === self.location.origin && (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/images/"))) ||
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com";

  if (estatico) {
    evento.respondWith(cachePrimeiro(request));
  }
});
