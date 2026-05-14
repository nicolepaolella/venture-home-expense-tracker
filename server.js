import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT || 8080);
const DIST_DIR = join(process.cwd(), 'dist');
const INDEX_FILE = join(DIST_DIR, 'index.html');

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function resolveAssetPath(urlPath) {
  const safePath = normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, '');
  return join(DIST_DIR, safePath);
}

function sendFile(filePath, res) {
  const ext = extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  });

  createReadStream(filePath).pipe(res);
}

const server = createServer((req, res) => {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = requestUrl.pathname;

  if (pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  const assetPath = resolveAssetPath(pathname.slice(1));

  if (pathname !== '/' && existsSync(assetPath) && statSync(assetPath).isFile()) {
    sendFile(assetPath, res);
    return;
  }

  sendFile(INDEX_FILE, res);
});

server.listen(PORT, () => {
  console.log(`venture-home-expense-tracker listening on ${PORT}`);
});
