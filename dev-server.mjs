/**
 * @description: 本地开发服务器 - 模拟 EdgeOne Pages 行为
 *               1) 把 functions/api/*.js 和 functions/api.js 自动注册成路由
 *               2) 其它路径走静态文件（index.html / css / js / images）
 *               3) Node IncomingMessage <-> Web Request 转换，让 onRequest(context) 能直接跑
 *               用法: node dev-server.mjs   →   访问 http://localhost:8000
 * @author: UG - 一个斗码大陆苦逼的三段码之气的少年，并没有神秘戒指中码老的帮助，但总有一天，我会成为斗码大陆中码帝一样的存在。三十年河东，三十年河西，莫欺少年穷。
 * @date: 2026-04-25
 */

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const PORT = parseInt(process.env.PORT, 10) || 8000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const ROUTES = new Map();

async function loadRoutes() {
  // /api/<name> 由 functions/api/*.js 提供
  const apiDir = path.join(ROOT, 'functions/api');
  for (const f of await fs.readdir(apiDir)) {
    if (!f.endsWith('.js')) continue;
    const name = f.replace(/\.js$/, '');
    const mod = await import(pathToFileURL(path.join(apiDir, f)).href);
    if (typeof mod.onRequest === 'function') {
      ROUTES.set(`/api/${name}`, mod.onRequest);
    }
  }
  // /api PHP 兼容入口由 functions/api.js 提供
  const compat = await import(pathToFileURL(path.join(ROOT, 'functions/api.js')).href);
  if (typeof compat.onRequest === 'function') {
    ROUTES.set('/api', compat.onRequest);
  }
  console.log(`[dev-server] loaded ${ROUTES.size} routes:`);
  for (const k of [...ROUTES.keys()].sort()) console.log('   ', k);
}

async function nodeReqToWeb(req, fullUrl) {
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) v.forEach((x) => headers.append(k, x));
    else if (v != null) headers.set(k, v);
  }
  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    if (chunks.length) body = Buffer.concat(chunks);
  }
  return new Request(fullUrl, { method: req.method, headers, body });
}

async function sendWebRes(res, webRes) {
  const headers = {};
  webRes.headers.forEach((v, k) => {
    headers[k] = v;
  });
  res.writeHead(webRes.status, headers);
  if (webRes.body) {
    const buf = Buffer.from(await webRes.arrayBuffer());
    res.end(buf);
  } else {
    res.end();
  }
}

async function serveStatic(res, urlPath) {
  let rel = decodeURIComponent(urlPath.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  // 阻止目录穿越
  const filePath = path.normalize(path.join(ROOT, rel));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  try {
    const stat = await fs.stat(filePath);
    let target = filePath;
    if (stat.isDirectory()) target = path.join(filePath, 'index.html');
    const data = await fs.readFile(target);
    const ext = path.extname(target).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found: ' + rel);
  }
}

async function handle(req, res) {
  const fullUrl = `http://${req.headers.host}${req.url}`;
  const url = new URL(fullUrl);
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${req.method} ${url.pathname}${url.search}`);

  const handler = ROUTES.get(url.pathname);
  if (handler) {
    try {
      const webReq = await nodeReqToWeb(req, fullUrl);
      const webRes = await handler({ request: webReq });
      await sendWebRes(res, webRes);
    } catch (err) {
      console.error('  ✗', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: err.message, stack: err.stack }));
    }
    return;
  }

  await serveStatic(res, url.pathname);
}

await loadRoutes();
http.createServer(handle).listen(PORT, () => {
  console.log(`\n🎵 UG Music Edge Dev Server`);
  console.log(`   Running:   http://localhost:${PORT}`);
  console.log(`   Player:    http://localhost:${PORT}/index.html`);
  console.log(`   API test:  http://localhost:${PORT}/test-edge.html`);
  console.log(`   Press Ctrl+C to stop\n`);
});
