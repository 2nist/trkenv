## Production standalone notes

When building for production Next.js with `output: "standalone"`, the build places server code under `.next/standalone` but some static assets (e.g. hashed CSS under `.next/static`) are not automatically available to the standalone server at runtime.

This project includes a post-build helper that mirrors `.next/static` into the standalone package so the standalone server can serve hashed static files referenced by HTML.

Usage (from `webapp/app`):

```
npm run build
# or if you need a Windows-native copy step
powershell -File ./scripts/copy-static-to-standalone.ps1
node .next/standalone/server.js --port 3000
```

The repository contains a Node helper `scripts/copy-static-to-standalone.js` which is also invoked automatically by the `postbuild` npm script.
