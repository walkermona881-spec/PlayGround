import { createReadStream, existsSync, statSync, watch } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const port = Number(process.env.PORT || 3000)
const host = '0.0.0.0'

const mime = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.glb': 'model/gltf-binary',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
}

const clients = new Set()
const keepAlive = setInterval(() => {
  for (const client of clients) client.write(': keepalive\n\n')
}, 20000)

let watcher
try {
  watcher = watch(root, { recursive: true }, () => {
    for (const client of clients) client.write('event: change\ndata: changed\n\n')
  })
} catch {
  watcher = undefined
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache',
    ...headers
  })
  res.end(body)
}

const server = createServer((req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      send(res, 405, 'Method not allowed', { Allow: 'GET, HEAD' })
      return
    }

    const url = new URL(req.url || '/', 'http://localhost')

    if (url.pathname === '/healthz') {
      send(res, 200, 'ok')
      return
    }

    if (url.pathname === '/__omgithub/live') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
      })
      res.write(': connected\n\n')
      clients.add(res)
      req.on('close', () => clients.delete(res))
      return
    }

    let pathname
    try {
      pathname = decodeURIComponent(url.pathname)
    } catch {
      send(res, 400, 'Bad request')
      return
    }

    let file = resolve(root, `.${pathname}`)
    if (file !== root && !file.startsWith(`${root}${sep}`)) {
      send(res, 403, 'Forbidden')
      return
    }

    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
    if (!existsSync(file) && !extname(pathname)) file = join(root, 'index.html')
    if (!existsSync(file) || !statSync(file).isFile()) {
      send(res, 404, 'Not found')
      return
    }

    res.writeHead(200, {
      'Content-Type': mime[extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff'
    })

    if (req.method === 'HEAD') {
      res.end()
      return
    }

    createReadStream(file).pipe(res)
  } catch {
    if (!res.headersSent) send(res, 500, 'Internal server error')
    else res.end()
  }
})

server.listen(port, host, () => {
  console.log(`REA app serving ${root} on http://${host}:${port}`)
})

function shutdown() {
  clearInterval(keepAlive)
  watcher?.close()
  for (const client of clients) client.end()
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 2000).unref()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
process.on('SIGHUP', shutdown)
