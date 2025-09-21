const http = require('http')
const path = require('path')
const fs = require('fs')

const TARGET_PORT = process.env.TARGET_PORT ? parseInt(process.env.TARGET_PORT, 10) : 3001
const LISTEN_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000

function findHashedFolder() {
  // Look in the standalone _next/static folder for the hash-named folder
  const candidate = path.join(__dirname, '..', '.next', 'standalone', '_next', 'static')
  if (!fs.existsSync(candidate)) return null
  const entries = fs.readdirSync(candidate, { withFileTypes: true })
  for (const e of entries) {
    if (!e.isDirectory()) continue
    const name = e.name
    if (name === 'chunks' || name === 'css' || name === 'media') continue
    if (name.startsWith('.')) continue
    return name
  }
  return null
}

const HASH = findHashedFolder()
if (!HASH) {
  console.warn('next-proxy: could not detect hashed _next static folder under .next/standalone/_next/static')
} else {
  console.log('next-proxy: detected hashed folder', HASH)
}

const server = http.createServer((req, res) => {
  try {
    let forwardPath = req.url

    // Rewrite root manifest requests to the hashed folder variant
    if ((req.url === '/_next/static/_buildManifest.js' || req.url === '/_next/static/_ssgManifest.js') && HASH) {
      const basename = path.basename(req.url)
      forwardPath = `/_next/static/${HASH}/${basename}`
      console.log(`next-proxy: rewrite ${req.url} -> ${forwardPath}`)
    }

    const options = {
      hostname: '127.0.0.1',
      port: TARGET_PORT,
      path: forwardPath,
      method: req.method,
      headers: req.headers,
    }

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers)
      proxyRes.pipe(res, { end: true })
    })

    proxyReq.on('error', (err) => {
      console.error('next-proxy: error forwarding request', err && err.message)
      res.statusCode = 502
      res.end('Bad Gateway')
    })

    req.pipe(proxyReq, { end: true })
  } catch (err) {
    console.error('next-proxy: unexpected error', err && err.message)
    res.statusCode = 500
    res.end('Internal Server Error')
  }
})

server.listen(LISTEN_PORT, () => {
  console.log(`next-proxy: listening on ${LISTEN_PORT}, forwarding to 127.0.0.1:${TARGET_PORT}`)
})
