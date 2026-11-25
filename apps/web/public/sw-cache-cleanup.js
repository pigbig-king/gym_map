// Remove the API cache created by older releases when the new worker takes over.
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.delete('api-cache'))
})
