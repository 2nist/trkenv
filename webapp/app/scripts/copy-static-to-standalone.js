const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '..', '.next', 'static');
const dest = path.resolve(__dirname, '..', '.next', 'standalone', '_next', 'static');

function copyRecursive(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return false;
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const s = path.join(srcDir, entry.name);
    const d = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
  return true;
}

if (!copyRecursive(src, dest)) {
  console.error('Source static dir not found:', src);
  process.exit(1);
}
console.log('Copied', src, 'to', dest);

// Also copy root manifest files from any hashed folder into the standalone root _next/static
function copyManifestsFromHashedFolder() {
  const hashedRoot = path.resolve(__dirname, '..', '.next', 'static');
  if (!fs.existsSync(hashedRoot)) return false;
  const entries = fs.readdirSync(hashedRoot, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const name = e.name;
    // skip known static folder names
    if (name === 'chunks' || name === 'css' || name === 'media') continue;
    const candidateDir = path.join(hashedRoot, name);
    const buildManifest = path.join(candidateDir, '_buildManifest.js');
    const ssgManifest = path.join(candidateDir, '_ssgManifest.js');
    const rootDest = path.resolve(__dirname, '..', '.next', 'standalone', '_next', 'static');
    const compatDest = path.resolve(__dirname, '..', '.next', 'standalone', '.next', 'static');
    if (fs.existsSync(buildManifest)) {
      try {
        fs.copyFileSync(buildManifest, path.join(rootDest, '_buildManifest.js'));
        fs.mkdirSync(compatDest, { recursive: true });
        fs.copyFileSync(buildManifest, path.join(compatDest, '_buildManifest.js'));
        console.log('Copied _buildManifest.js from', candidateDir, 'to standalone root');
      } catch (err) {
        console.warn('Failed copying buildManifest:', err && err.message);
      }
    }
    if (fs.existsSync(ssgManifest)) {
      try {
        fs.copyFileSync(ssgManifest, path.join(rootDest, '_ssgManifest.js'));
        fs.mkdirSync(compatDest, { recursive: true });
        fs.copyFileSync(ssgManifest, path.join(compatDest, '_ssgManifest.js'));
        console.log('Copied _ssgManifest.js from', candidateDir, 'to standalone root');
      } catch (err) {
        console.warn('Failed copying ssgManifest:', err && err.message);
      }
    }
  }
  return true;
}

copyManifestsFromHashedFolder();
process.exit(0);
