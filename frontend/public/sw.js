self.addEventListener("install", (event) => {
    self.skipWaiting()
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
            .catch(() => undefined)
    )
})

self.addEventListener("activate", (event) => {
    event.waitUntil(
        Promise.all([
            self.registration.unregister(),
            caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))),
            self.clients.matchAll({ type: "window" }).then((clients) => {
                clients.forEach((client) => client.navigate(client.url))
            }),
        ]).catch(() => undefined)
    )
})
