// SIJALAN — Service Worker
// Tujuan: menyimpan cache "app shell" (index.html + manifest) supaya aplikasi
// tetap BISA DIBUKA walau petugas lapangan sedang tanpa sinyal internet.
// Data (Supabase) tetap butuh koneksi — offline mode di sini hanya menjamin
// halaman/form tetap tampil; penyimpanan data saat offline diantrekan oleh
// aplikasi sendiri (lihat OFFLINE_QUEUE_KEY di index.html) dan disinkronkan
// otomatis saat sinyal kembali.

const CACHE_NAME = 'sijalan-shell-v1';
const SHELL_FILES = ['./index.html', './manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Hanya tangani request ke origin sendiri (app shell). Request ke Supabase
  // atau CDN eksternal dibiarkan lewat jaringan seperti biasa (tidak di-cache),
  // supaya data yang ditampilkan selalu yang terbaru saat online.
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return res;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});
