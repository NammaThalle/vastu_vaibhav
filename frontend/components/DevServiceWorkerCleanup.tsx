"use client"

import * as React from "react"

export function DevServiceWorkerCleanup() {
    React.useEffect(() => {
        if (process.env.NODE_ENV !== "development") {
            return
        }

        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.getRegistrations()
                .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
                .catch(() => undefined)
        }

        if ("caches" in window) {
            caches.keys()
                .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
                .catch(() => undefined)
        }
    }, [])

    return null
}
