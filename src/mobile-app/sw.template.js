/* eslint-disable */
const CACHE_NAME = "style-atelier-mobile-v1"
const ASSETS = [
  "/mobile/",
  "/mobile/index.html",
  "/mobile/manifest.json",
  "/mobile/icon-192.png",
  "/mobile/icon-512.png",
  "__CSS_PATH__",
  "__JS_PATH__"
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        // プレースホルダーが置換されていない場合は除外
        const cleanAssets = ASSETS.filter(
          (asset) =>
            !asset.includes("__CSS_PATH__") && !asset.includes("__JS_PATH__")
        )
        return cache.addAll(cleanAssets)
      })
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key)
            }
          })
        )
      })
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)

  // Google GIS や外部API、および Google Drive 等への外部リクエストはキャッシュしない
  if (url.origin !== self.location.origin) {
    return
  }

  // /mobile/ 配下のリクエストに対するキャッシュ戦略
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }

      return fetch(event.request)
        .then((response) => {
          // レスポンスが正常かつGETリクエストの場合のみ、動的キャッシュに追加する
          if (
            response &&
            response.status === 200 &&
            response.type === "basic" &&
            event.request.method === "GET"
          ) {
            const responseToCache = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache)
            })
          }
          return response
        })
        .catch(() => {
          // オフライン時のナビゲーションフォールバック
          if (event.request.mode === "navigate") {
            return caches.match("/mobile/index.html")
          }
        })
    })
  )
})
