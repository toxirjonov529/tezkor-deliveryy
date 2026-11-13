'use strict';
/* =========================================================
   TEZKOR DELIVERY: server (Node.js, tashqi paketlarsiz)
   Ishga tushirish:  node server.js   ->  http://localhost:3000
   Sozlamalar (muhit o'zgaruvchilari):
     PORT, ADMIN_PASSWORD, TOKEN_SECRET
   Ma'lumotlar: data/db.json
   ========================================================= */
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm');

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'weryurak2214';
const SECRET = process.env.TOKEN_SECRET || crypto.randomBytes(32).toString('hex');
const PUB = path.join(__dirname, 'public'), DB_DIR = path.join(__dirname, 'data'), DB_FILE = path.join(DB_DIR, 'db.json');
if (!process.env.ADMIN_PASSWORD) console.warn('! Demo admin paroli ishlatilmoqda. Ishga tushirishdan oldin ADMIN_PASSWORD ni o\'zgartiring.');

/* ---------- Ma'lumotlar bazasi (JSON fayl, atomik yozish) ---------- */
function seedProducts() {
  const src = fs.readFileSync(path.join(PUB, 'data.js'), 'utf8');
  return vm.runInNewContext(src + ';DATA', {}).products;
}
let db = { orders: [], products: [], messages: [] };
function loadDb() {
  fs.mkdirSync(DB_DIR, { recursive: true });
  try { db = { ...db, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) }; } catch (e) { /* birinchi ishga tushish */ }
  if (!db.products.length) { db.products = seedProducts(); saveDb(); }
}
function saveDb() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 1));
  fs.renameSync(tmp, DB_FILE);
}

/* ---------- Qoidalar (sayt bilan bir xil, lekin narx serverda hisoblanadi) ---------- */
const FREE_FROM = 150000, FEE = 12000;
const PROMOS = { TEZKOR1: { type: 'ship' }, SALOM10: { type: 'pct', value: 10 } };
const PAYS = { cash: 'Naqd pul', payme: 'Payme', click: 'Click', uzum: 'Uzum Bank', humo: 'Humo', uzcard: 'Uzcard', visa: 'Visa / Mastercard' };
const STATUSES = ['new', 'cook', 'way', 'done', 'cancel'];

/* ---------- Yordamchilar ---------- */
const send = (res, code, body, headers = {}) => {
  const isStr = typeof body === 'string' || Buffer.isBuffer(body);
  res.writeHead(code, { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'Cache-Control': 'no-store', ...(isStr ? {} : { 'Content-Type': 'application/json; charset=utf-8' }), ...headers });
  res.end(isStr ? body : JSON.stringify(body));
};
class HttpError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
const readBody = (req) => new Promise((ok, no) => {
  let n = 0; const chunks = [];
  req.on('data', (c) => { n += c.length; if (n > 200 * 1024) { no(new HttpError(413, 'So\'rov juda katta')); req.destroy(); } else chunks.push(c); });
  req.on('end', () => { try { ok(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch (e) { no(new HttpError(400, 'JSON noto\'g\'ri')); } });
  req.on('error', no);
});
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const hits = new Map();
function limit(key, max, ms) {
  const now = Date.now(), a = (hits.get(key) || []).filter((t) => now - t < ms);
  if (a.length >= max) throw new HttpError(429, 'Juda ko\'p urinish. Birozdan keyin qayta urinib ko\'ring.');
  a.push(now); hits.set(key, a);
}
setInterval(() => { const now = Date.now(); for (const [k, a] of hits) if (!a.some((t) => now - t < 3600e3)) hits.delete(k); }, 600e3).unref();

const sign = (p) => crypto.createHmac('sha256', SECRET).update(p).digest('base64url');
const makeToken = () => { const p = Buffer.from(JSON.stringify({ exp: Date.now() + 12 * 3600e3 })).toString('base64url'); return p + '.' + sign(p); };
function isAdmin(req) {
  const [p, s] = (req.headers.authorization || '').replace(/^Bearer /, '').split('.');
  if (!p || !s) return false;
  const good = Buffer.from(sign(p)), got = Buffer.from(s);
  if (good.length !== got.length || !crypto.timingSafeEqual(good, got)) return false;
  try { return JSON.parse(Buffer.from(p, 'base64url').toString()).exp > Date.now(); } catch (e) { return false; }
}
const sameStr = (a, b) => { const x = crypto.createHash('sha256').update(a).digest(), y = crypto.createHash('sha256').update(b).digest(); return crypto.timingSafeEqual(x, y); };

/* ---------- Tekshiruv ---------- */
function cleanProduct(p) {
  const price = Math.round(Number(p && p.price));
  const img = str(p && p.img, 500);
  if (!p || str(p.name, 80).length < 2 || !(price > 0 && price < 1e8)) throw new HttpError(400, 'Mahsulot nomi yoki narxi noto\'g\'ri');
  if (img && !/^https:\/\//i.test(img)) throw new HttpError(400, 'Rasm havolasi https:// bilan boshlansin');
  return { id: str(p.id, 40).replace(/[^\w-]/g, '') || 'p' + crypto.randomBytes(4).toString('hex'), name: str(p.name, 80), cat: str(p.cat, 40) || 'Fast Food', price, desc: str(p.desc, 300) || str(p.name, 80), img, fb: str(p.fb, 8) || '🍽️', pop: !!p.pop };
}

function createOrder(b) {
  const name = str(b.name, 80), phone = String(b.phone || '').replace(/\D/g, ''), addr = str(b.addr, 250);
  if (name.length < 2) throw new HttpError(400, 'Ismni kiriting');
  if (phone.length !== 9) throw new HttpError(400, 'Telefon raqami 9 ta raqamdan iborat bo\'lishi kerak');
  if (addr.length < 5) throw new HttpError(400, 'Manzilni kiriting');
  if (!PAYS[b.pay]) throw new HttpError(400, 'To\'lov usuli noto\'g\'ri');
  if (!Array.isArray(b.items) || !b.items.length || b.items.length > 50) throw new HttpError(400, 'Savatcha bo\'sh');
  let sub = 0, count = 0; const items = [];
  for (const it of b.items) {
    const p = db.products.find((x) => x.id === String(it && it[0])), q = Math.floor(Number(it && it[1]));
    if (!p || !(q >= 1 && q <= 99)) throw new HttpError(400, 'Mahsulot topilmadi yoki miqdori noto\'g\'ri');
    sub += p.price * q; count += q; items.push([p.id, q]);
  }
  const pr = PROMOS[String(b.promo || '').toUpperCase()];
  const disc = pr && pr.type === 'pct' ? Math.round(sub * pr.value / 100) : 0;
  const fee = sub >= FREE_FROM || (pr && pr.type === 'ship') ? 0 : FEE;
  let no; do { no = 'TZ-' + (1000 + crypto.randomInt(9000)); } while (db.orders.some((o) => o.no === no));
  const order = { no, ts: Date.now(), name, phone: '+998 ' + phone.replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4'), addr, pay: PAYS[b.pay], total: sub - disc + fee, count, items, status: 'new' };
  db.orders.unshift(order); db.orders = db.orders.slice(0, 2000); saveDb();
  return order;
}

/* ---------- API ---------- */
async function api(req, res, url) {
  const m = req.method, p = url.pathname, ip = req.socket.remoteAddress || '?';
  if (p === '/api/health' && m === 'GET') return send(res, 200, { ok: true });
  if (p === '/api/products' && m === 'GET') return send(res, 200, db.products);

  if (p === '/api/orders' && m === 'POST') { limit('o' + ip, 15, 600e3); const o = createOrder(await readBody(req)); return send(res, 201, { no: o.no, total: o.total, status: o.status }); }
  let r;
  if ((r = p.match(/^\/api\/orders\/(TZ-\d{4})$/)) && m === 'GET') {
    const o = db.orders.find((x) => x.no === r[1]); if (!o) throw new HttpError(404, 'Buyurtma topilmadi');
    return send(res, 200, { no: o.no, status: o.status });
  }
  if (p === '/api/messages' && m === 'POST') {
    limit('m' + ip, 6, 600e3); const b = await readBody(req);
    const name = str(b.name, 60), contact = str(b.contact, 60), msg = str(b.msg, 500);
    if (name.length < 2 || contact.length < 5 || msg.length < 5) throw new HttpError(400, 'Maydonlarni to\'ldiring');
    db.messages.unshift({ id: Date.now(), ts: Date.now(), name, contact, msg, read: false }); db.messages = db.messages.slice(0, 500); saveDb();
    return send(res, 201, { ok: true });
  }

  if (p === '/api/admin/login' && m === 'POST') {
    limit('l' + ip, 8, 15 * 60e3);
    const b = await readBody(req);
    if (typeof b.password !== 'string' || !sameStr(b.password, ADMIN_PASSWORD)) throw new HttpError(401, 'Parol noto\'g\'ri');
    return send(res, 200, { token: makeToken() });
  }
  if (p.startsWith('/api/admin/')) {
    if (!isAdmin(req)) throw new HttpError(401, 'Kirish talab qilinadi');
    if (p === '/api/admin/orders' && m === 'GET') return send(res, 200, db.orders);
    if (p === '/api/admin/messages' && m === 'GET') return send(res, 200, db.messages);
    if (p === '/api/admin/products' && m === 'GET') return send(res, 200, db.products);
    if (p === '/api/admin/products' && m === 'PUT') {
      const b = await readBody(req); if (!Array.isArray(b) || !b.length || b.length > 300) throw new HttpError(400, 'Mahsulotlar ro\'yxati noto\'g\'ri');
      const seen = new Set(); db.products = b.map(cleanProduct).filter((x) => !seen.has(x.id) && seen.add(x.id)); saveDb();
      return send(res, 200, db.products);
    }
    if ((r = p.match(/^\/api\/admin\/orders\/(TZ-\d{4})$/))) {
      const i = db.orders.findIndex((o) => o.no === r[1]); if (i < 0) throw new HttpError(404, 'Buyurtma topilmadi');
      if (m === 'PATCH') { const b = await readBody(req); if (!STATUSES.includes(b.status)) throw new HttpError(400, 'Holat noto\'g\'ri'); db.orders[i].status = b.status; saveDb(); return send(res, 200, db.orders[i]); }
      if (m === 'DELETE') { db.orders.splice(i, 1); saveDb(); return send(res, 200, { ok: true }); }
    }
    if ((r = p.match(/^\/api\/admin\/messages\/(\d+)$/))) {
      const i = db.messages.findIndex((x) => String(x.id) === r[1]); if (i < 0) throw new HttpError(404, 'Xabar topilmadi');
      if (m === 'PATCH') { db.messages[i].read = true; saveDb(); return send(res, 200, db.messages[i]); }
      if (m === 'DELETE') { db.messages.splice(i, 1); saveDb(); return send(res, 200, { ok: true }); }
    }
  }
  throw new HttpError(404, 'Topilmadi');
}

/* ---------- Statik fayllar (faqat public/ papkasi) ---------- */
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp', '.woff2': 'font/woff2' };
function serveStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method Not Allowed');
  let rel; try { rel = decodeURIComponent(url.pathname); } catch (e) { return send(res, 400, 'Bad Request'); }
  if (rel === '/' ) rel = '/index.html';
  const file = path.join(PUB, path.normalize(rel));
  if (!file.startsWith(PUB + path.sep) || !TYPES[path.extname(file)]) return send(res, 404, 'Topilmadi', { 'Content-Type': 'text/plain; charset=utf-8' });
  fs.readFile(file, (err, buf) => err ? send(res, 404, 'Topilmadi', { 'Content-Type': 'text/plain; charset=utf-8' }) : send(res, 200, buf, { 'Content-Type': TYPES[path.extname(file)], 'Cache-Control': 'no-cache' }));
}

loadDb();
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) await api(req, res, url); else serveStatic(req, res, url);
  } catch (e) {
    if (!(e instanceof HttpError)) console.error(e);
    if (!res.headersSent) send(res, e.code || 500, { error: e instanceof HttpError ? e.message : 'Server xatosi' });
  }
}).listen(PORT, () => console.log(`TEZKOR DELIVERY: http://localhost:${PORT}   (admin: /admin.html)`));
