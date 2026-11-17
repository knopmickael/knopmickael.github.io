import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectRoot, publicFiles, compileHtml } from './site.mjs';
import { imagePathPattern, validatePortfolio } from '../lib/content.js';
import { publicPortfolio } from '../lib/blog.js';

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const allowed = new Set([...publicFiles, '.nojekyll']);

export function createSiteServer({ root = projectRoot, production = false, base = '/' } = {}) {
  const directory = production ? resolve(root, 'dist') : root;
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
      if (url.pathname === base.slice(0, -1) && base !== '/') {
        response.writeHead(308, { Location: `${base}${url.search}` }).end();
        return;
      }
      const pathname = decodeURIComponent(url.pathname);
      if (!pathname.startsWith(base)) {
        response.writeHead(404).end('Not found');
        return;
      }
      const file = pathname.slice(base.length) || 'index.html';
      if (!allowed.has(file) && !imagePathPattern.test(file)) {
        response.writeHead(404).end('Not found');
        return;
      }
      if (!['GET', 'HEAD'].includes(request.method)) {
        response.writeHead(405, { Allow: 'GET, HEAD' }).end();
        return;
      }
      let body = await readFile(resolve(directory, file));
      if (!production && file === 'portfolio.json') body = Buffer.from(JSON.stringify(publicPortfolio(JSON.parse(body.toString('utf8')))));
      if (!production && (file === 'index.html' || file === 'blog.html')) body = Buffer.from(compileHtml(body.toString('utf8'), validatePortfolio(JSON.parse(await readFile(resolve(root, 'portfolio.json'), 'utf8')))));
      response.writeHead(200, { 'Content-Type': types[extname(file)] || 'text/plain', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch (error) {
      console.error('[server]', error.message);
      response.writeHead(error.code === 'ENOENT' ? 404 : 500).end('Unable to serve this resource');
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(argument('--port', process.env.PORT || '4173'));
  const host = argument('--host', process.env.HOST || '127.0.0.1');
  const rawBase = argument('--base', '/');
  const base = `/${rawBase.split('/').filter(Boolean).join('/')}${rawBase === '/' ? '' : '/'}`;
  const production = process.argv.includes('--dist');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535.');
  if (production) await readFile(resolve(projectRoot, 'dist/index.html'));
  else validatePortfolio(JSON.parse(await readFile(resolve(projectRoot, 'portfolio.json'), 'utf8')));
  const server = createSiteServer({ production, base });
  server.listen(port, host, () => console.log(`${production ? 'Preview' : 'Desenvolvimento'}: http://${host}:${port}${base}`));
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => process.exit(0)));
}
