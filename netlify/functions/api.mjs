import crypto from 'node:crypto';
import { getConnectionString } from '@netlify/database';
import { getStore } from '@netlify/blobs';
import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.NETLIFY_DB_URL || process.env.DATABASE_URL || getConnectionString();
const pool = new Pool({
  connectionString,
  max: 4,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 8_000,
});

let schemaPromise;
function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(`
          CREATE TABLE IF NOT EXISTS site_settings (id BIGSERIAL PRIMARY KEY, setting_key VARCHAR(120) UNIQUE NOT NULL, setting_value TEXT NOT NULL DEFAULT '', updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
          CREATE TABLE IF NOT EXISTS services (id BIGSERIAL PRIMARY KEY, name VARCHAR(150) NOT NULL, description VARCHAR(700) NOT NULL DEFAULT '', icon VARCHAR(30) NOT NULL DEFAULT '💻', image VARCHAR(255) NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0, status BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
          CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
          CREATE TABLE IF NOT EXISTS products (id BIGSERIAL PRIMARY KEY, name VARCHAR(180) NOT NULL, category VARCHAR(100) NOT NULL DEFAULT '', price VARCHAR(100) NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '', image VARCHAR(255) NOT NULL DEFAULT '', status BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
          CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
          CREATE TABLE IF NOT EXISTS gallery (id BIGSERIAL PRIMARY KEY, title VARCHAR(180) NOT NULL DEFAULT '', image VARCHAR(255) NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0, status BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
          CREATE TABLE IF NOT EXISTS enquiries (id BIGSERIAL PRIMARY KEY, name VARCHAR(150) NOT NULL, phone VARCHAR(30) NOT NULL, email VARCHAR(190) NOT NULL DEFAULT '', message TEXT NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'new', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
          CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
          CREATE TABLE IF NOT EXISTS admins (id BIGSERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, email VARCHAR(190) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
          CREATE TABLE IF NOT EXISTS customers (id BIGSERIAL PRIMARY KEY, name VARCHAR(150) NOT NULL, company VARCHAR(180) NOT NULL DEFAULT '', phone VARCHAR(30) NOT NULL, email VARCHAR(190) NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', status VARCHAR(20) NOT NULL DEFAULT 'active', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
          CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
          CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
          CREATE TABLE IF NOT EXISTS customer_notes (id BIGSERIAL PRIMARY KEY, customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE, note TEXT NOT NULL, admin_id BIGINT REFERENCES admins(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
          CREATE TABLE IF NOT EXISTS service_jobs (id BIGSERIAL PRIMARY KEY, customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT, job_no VARCHAR(40) UNIQUE NOT NULL, device_type VARCHAR(100) NOT NULL DEFAULT '', brand_model VARCHAR(180) NOT NULL DEFAULT '', serial_no VARCHAR(120) NOT NULL DEFAULT '', problem TEXT NOT NULL DEFAULT '', diagnosis TEXT NOT NULL DEFAULT '', status VARCHAR(30) NOT NULL DEFAULT 'received', estimated_cost NUMERIC(12,2) NOT NULL DEFAULT 0, final_cost NUMERIC(12,2) NOT NULL DEFAULT 0, received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), promised_at TIMESTAMPTZ NULL, delivered_at TIMESTAMPTZ NULL, notes TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
          CREATE INDEX IF NOT EXISTS idx_jobs_customer ON service_jobs(customer_id);
          CREATE INDEX IF NOT EXISTS idx_jobs_status ON service_jobs(status);
          CREATE TABLE IF NOT EXISTS quotes (id BIGSERIAL PRIMARY KEY, customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT, quote_no VARCHAR(40) UNIQUE NOT NULL, quote_date DATE NOT NULL DEFAULT CURRENT_DATE, valid_until DATE NULL, status VARCHAR(20) NOT NULL DEFAULT 'draft', subtotal NUMERIC(12,2) NOT NULL DEFAULT 0, tax_percent NUMERIC(5,2) NOT NULL DEFAULT 0, tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0, total NUMERIC(12,2) NOT NULL DEFAULT 0, notes TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
          CREATE TABLE IF NOT EXISTS quote_items (id BIGSERIAL PRIMARY KEY, quote_id BIGINT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE, description VARCHAR(255) NOT NULL, qty NUMERIC(12,2) NOT NULL DEFAULT 1, unit_price NUMERIC(12,2) NOT NULL DEFAULT 0, amount NUMERIC(12,2) NOT NULL DEFAULT 0);
          CREATE TABLE IF NOT EXISTS invoices (id BIGSERIAL PRIMARY KEY, customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT, invoice_no VARCHAR(40) UNIQUE NOT NULL, invoice_date DATE NOT NULL DEFAULT CURRENT_DATE, due_date DATE NULL, status VARCHAR(20) NOT NULL DEFAULT 'draft', subtotal NUMERIC(12,2) NOT NULL DEFAULT 0, tax_percent NUMERIC(5,2) NOT NULL DEFAULT 0, tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0, total NUMERIC(12,2) NOT NULL DEFAULT 0, paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0, notes TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
          CREATE TABLE IF NOT EXISTS invoice_items (id BIGSERIAL PRIMARY KEY, invoice_id BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE, description VARCHAR(255) NOT NULL, qty NUMERIC(12,2) NOT NULL DEFAULT 1, unit_price NUMERIC(12,2) NOT NULL DEFAULT 0, amount NUMERIC(12,2) NOT NULL DEFAULT 0);
          CREATE TABLE IF NOT EXISTS inventory_items (id BIGSERIAL PRIMARY KEY, sku VARCHAR(80) NOT NULL DEFAULT '', name VARCHAR(180) NOT NULL, category VARCHAR(100) NOT NULL DEFAULT '', brand VARCHAR(100) NOT NULL DEFAULT '', qty NUMERIC(12,2) NOT NULL DEFAULT 0, purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0, sale_price NUMERIC(12,2) NOT NULL DEFAULT 0, reorder_level NUMERIC(12,2) NOT NULL DEFAULT 0, supplier VARCHAR(180) NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', status BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
          CREATE INDEX IF NOT EXISTS idx_inventory_qty ON inventory_items(qty);
          CREATE TABLE IF NOT EXISTS inventory_movements (id BIGSERIAL PRIMARY KEY, item_id BIGINT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE, movement_type VARCHAR(20) NOT NULL, qty NUMERIC(12,2) NOT NULL, reference_type VARCHAR(50) NOT NULL DEFAULT '', reference_id BIGINT NULL, note VARCHAR(255) NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
          CREATE SEQUENCE IF NOT EXISTS job_number_seq START 1;
          CREATE SEQUENCE IF NOT EXISTS quote_number_seq START 1;
          CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;
          INSERT INTO site_settings(setting_key, setting_value) VALUES
            ('business_name','Fusiontech Computers'),('phone','8080192024'),('whatsapp','918080192024'),('email',''),('location','Chembur, Mumbai'),('business_hours','Mon–Sat · 10:00 AM–8:00 PM'),('tagline','Computer • Laptop • IT Solutions'),('hero_badge','CHEMBUR, MUMBAI · LOCAL TECH SUPPORT'),('hero_title','Tech problems? We fix them.'),('hero_text','Computer & laptop sales, repair, upgrades, software, CCTV and business IT support — from one local technology partner.'),('meta_description','Fusiontech Computers in Chembur, Mumbai — computer and laptop repair, sales, upgrades, Apple/Mac service, gaming PC builds, CCTV and business IT support.'),('footer_text','Local technology support for homes, students and businesses.'),('hero_image','assets/images/hero-futuristic-computer.jpg')
            ON CONFLICT(setting_key) DO NOTHING;
          INSERT INTO services(name,description,icon,sort_order)
          SELECT v.name,v.description,v.icon,v.sort_order FROM (VALUES
            ('Computer & Laptop Sales','New computers and laptops configured for home, office and business use.','💻',1),('PC & Laptop Repair','Hardware diagnosis, Windows issues, cleaning, upgrades and performance fixes.','🛠️',2),('Apple / Mac Repair','Apple and Mac troubleshooting, software support and hardware service.','',3),('Gaming PC Builds','Custom gaming PCs matched to performance, budget and future upgrades.','🎮',4),('Data Recovery','Support for inaccessible, deleted or failing storage and important data.','💾',5),('CCTV Solutions','CCTV planning, installation, configuration and maintenance.','📹',6),('Home Computer Service','Convenient support at home or office for common computer problems.','🏠',7),('Business IT Support','Software setup, networking, deployments and ongoing technical support.','🏢',8)
          ) AS v(name,description,icon,sort_order)
          WHERE NOT EXISTS (SELECT 1 FROM services s WHERE s.name=v.name);
        `);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    })();
  }
  return schemaPromise;
}

const jsonHeaders = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
function json(data, init = {}) { return new Response(JSON.stringify(data), { ...init, headers: { ...jsonHeaders, ...(init.headers || {}) } }); }
function ok(data = {}) { return json({ ok: true, ...data }); }
function fail(message, status = 400, extra = {}) { return json({ ok: false, error: message, ...extra }, { status }); }

function cookies(req) {
  const header = req.headers.get('cookie') || '';
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function cookie(name, value, maxAge, httpOnly = false, secure = true) {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${httpOnly ? '; HttpOnly' : ''}${secure ? '; Secure' : ''}`;
}
function sameOrigin(req) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  return origin === new URL(req.url).origin;
}
function csrfRequired(req) {
  if (!sameOrigin(req)) return false;
  const c = cookies(req);
  const header = req.headers.get('x-csrf-token') || '';
  if(!c.ft_csrf || !header) return false; const a=Buffer.from(c.ft_csrf), b=Buffer.from(header); return a.length===b.length && crypto.timingSafeEqual(a,b);
}
function randomToken(bytes = 24) { return crypto.randomBytes(bytes).toString('hex'); }
function b64u(value) { return Buffer.from(value).toString('base64url'); }
function ub64(value) { return Buffer.from(value, 'base64url').toString('utf8'); }
function sign(payload) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not configured');
  return `${b64u(JSON.stringify(payload))}.${crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('base64url')}`;
}
function verifyToken(token) {
  try {
    const [body, sig] = String(token || '').split('.');
    if (!body || !sig || !process.env.SESSION_SECRET) return null;
    const payloadText = ub64(body);
    const expected = crypto.createHmac('sha256', process.env.SESSION_SECRET).update(payloadText).digest('base64url');
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(payloadText);
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}
function session(req) { return verifyToken(cookies(req).ft_session); }
function sessionCookie(req, token) { return cookie('ft_session', token, 8 * 60 * 60, true, new URL(req.url).protocol === 'https:'); }
function clearSession(req) { return cookie('ft_session', '', 0, true, new URL(req.url).protocol === 'https:'); }

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}
function verifyPassword(password, stored) {
  try {
    const [kind, salt, hash] = String(stored).split('$');
    if (kind !== 'scrypt' || !salt || !hash) return false;
    const calculated = crypto.scryptSync(password, salt, 64).toString('hex');
    return calculated.length === hash.length && crypto.timingSafeEqual(Buffer.from(calculated), Buffer.from(hash));
  } catch { return false; }
}
async function bodyJson(req) {
  try { return await req.json(); } catch { return {}; }
}
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function clean(v, max = 10000) { return String(v ?? '').trim().slice(0, max); }
function money(v) { return Number(num(v).toFixed(2)); }
function waLink(number, message = '') {
  const n = String(number || '').replace(/\D/g, '');
  return `https://wa.me/${n}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}
function phoneHref(number) { return `tel:${String(number || '').replace(/[^\d+]/g, '')}`; }
function mediaUrl(value) {
  if (!value) return '';
  if (String(value).startsWith('blob:')) return `/api/media/${encodeURIComponent(String(value).slice(5))}`;
  if (/^(https?:)?\//.test(String(value))) return String(value);
  return `/${String(value).replace(/^\//, '')}`;
}
function imageKey(value) { return String(value || '').startsWith('blob:') ? String(value).slice(5) : ''; }
function extFor(file) {
  const map = { 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp' };
  return map[file.type] || '';
}
function settingsMap(rows) { return Object.fromEntries(rows.map(r => [r.setting_key, r.setting_value])); }
async function loadSettings(db) { const r = await db.query('SELECT setting_key,setting_value FROM site_settings ORDER BY setting_key'); return settingsMap(r.rows); }
async function publicPayload(db) {
  const settings = await loadSettings(db);
  const [svc, prod] = await Promise.all([
    db.query('SELECT id,name,description,icon,image,sort_order FROM services WHERE status=TRUE ORDER BY sort_order,id'),
    db.query('SELECT id,name,category,price,description,image FROM products WHERE status=TRUE ORDER BY created_at DESC,id DESC'),
  ]);
  settings.hero_image_url = mediaUrl(settings.hero_image);
  settings.phone_href = phoneHref(settings.phone);
  settings.whatsapp_url = waLink(settings.whatsapp);
  return { settings, services: svc.rows.map(r => ({ ...r, image_url: mediaUrl(r.image) })), products: prod.rows.map(r => ({ ...r, image_url: mediaUrl(r.image) })) };
}
async function requireAdmin(req, db) {
  const s = session(req);
  if (!s?.sub) return null;
  const r = await db.query('SELECT id,name,email FROM admins WHERE id=$1 LIMIT 1', [s.sub]);
  return r.rows[0] || null;
}
async function mutationGate(req) {
  if (!sameOrigin(req)) return 'Blocked cross-origin request.';
  if (!csrfRequired(req)) return 'Security token expired. Refresh the page and try again.';
  return null;
}

async function handleUpload(req, db, admin) {
  const form = await req.formData();
  const file = form.get('file');
  const kind = clean(form.get('kind'), 30) || 'misc';
  if (!(file instanceof File)) return fail('No file received.');
  if (file.size > 5 * 1024 * 1024) return fail('File is larger than 5 MB.');
  const ext = extFor(file);
  if (!ext) return fail('Only JPG, PNG and WEBP images are allowed.');
  const key = `${kind}/${crypto.randomUUID()}.${ext}`;
  const store = getStore('public-media');
  await store.set(key, await file.arrayBuffer(), { metadata: { contentType: file.type, originalName: file.name, uploadedBy: admin.id } });
  return ok({ image: `blob:${key}`, image_url: mediaUrl(`blob:${key}`) });
}

async function login(req, db) {
  const gate = await mutationGate(req); if (gate) return fail(gate, 403);
  const body = await bodyJson(req);
  const email = clean(body.email, 190).toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) return fail('Email and password are required.');
  const found = await db.query('SELECT id,name,email,password_hash FROM admins WHERE LOWER(email)=LOWER($1) LIMIT 1', [email]);
  let admin = found.rows[0];
  if (!admin) {
    const configuredEmail = clean(process.env.ADMIN_EMAIL, 190).toLowerCase();
    const bootstrapPassword = String(process.env.ADMIN_PASSWORD || '');
    if (!configuredEmail || !bootstrapPassword || email !== configuredEmail || password !== bootstrapPassword) return fail('Invalid email or password.', 401);
    const name = clean(process.env.ADMIN_NAME || 'Fusiontech Admin', 100) || 'Fusiontech Admin';
    const created = await db.query('INSERT INTO admins(name,email,password_hash) VALUES($1,$2,$3) RETURNING id,name,email,password_hash', [name, email, hashPassword(password)]);
    admin = created.rows[0];
  } else if (!verifyPassword(password, admin.password_hash)) {
    return fail('Invalid email or password.', 401);
  }
  const token = sign({ sub: admin.id, exp: Date.now() + 8 * 60 * 60 * 1000 });
  return json({ ok: true, admin: { id: admin.id, name: admin.name, email: admin.email } }, { headers: { ...jsonHeaders, 'set-cookie': sessionCookie(req, token) } });
}

function publicAssetResponse(path) {
  return null;
}

export default async function handler(req) {
  try {
    await ensureSchema();
    const db = pool;
    const url = new URL(req.url);
    let path = url.pathname.replace(/^\/\.netlify\/functions\/api/, '/api');
    if (path.endsWith('/') && path !== '/api/') path = path.slice(0, -1);
    if (path === '/api') path = '/api/' + (url.searchParams.get('route') || '');
    const method = req.method.toUpperCase();

    if (path === '/api/csrf' && method === 'GET') {
      const token = randomToken();
      return json({ ok: true, csrf: token }, { headers: { ...jsonHeaders, 'set-cookie': cookie('ft_csrf', token, 2 * 60 * 60, false, url.protocol === 'https:') } });
    }
    if (path === '/api/auth/me' && method === 'GET') {
      const admin = await requireAdmin(req, db);
      return admin ? ok({ admin }) : ok({ admin: null });
    }
    if (path === '/api/auth/login' && method === 'POST') return await login(req, db);
    if (path === '/api/auth/logout' && method === 'POST') {
      const gate = await mutationGate(req); if (gate) return fail(gate, 403);
      return json({ ok: true }, { headers: { ...jsonHeaders, 'set-cookie': clearSession(req) } });
    }
    if (path.startsWith('/api/media/') && method === 'GET') {
      const key = decodeURIComponent(path.slice('/api/media/'.length));
      const store = getStore('public-media');
      const data = await store.getWithMetadata(key, { type: 'arrayBuffer' });
      if (!data?.data) return new Response('Not found', { status: 404 });
      const contentType = data.metadata?.contentType || 'image/jpeg';
      return new Response(data.data, { status: 200, headers: { 'content-type': contentType, 'cache-control': 'public, max-age=31536000, immutable' } });
    }

    if (path === '/api/public' && method === 'GET') return ok(await publicPayload(db));
    if (path === '/api/enquiries' && method === 'POST') {
      const gate = await mutationGate(req); if (gate) return fail(gate, 403);
      const b = await bodyJson(req);
      const name = clean(b.name, 150), phone = clean(b.phone, 30), email = clean(b.email, 190), message = clean(b.message, 5000);
      if (!name || !phone || !message) return fail('Name, phone and message are required.');
      await db.query('INSERT INTO enquiries(name,phone,email,message) VALUES($1,$2,$3,$4)', [name, phone, email, message]);
      return ok({ message: 'Thanks — your enquiry has been received.' });
    }

    const admin = await requireAdmin(req, db);
    if (!admin) return fail('Authentication required.', 401);

    if (path === '/api/admin/upload' && method === 'POST') return handleUpload(req, db, admin);
    if (path === '/api/admin/dashboard' && method === 'GET') {
      const [svc, prod, gal, enq, cust, jobs, due, recent] = await Promise.all([
        db.query('SELECT COUNT(*)::int AS n FROM services WHERE status=TRUE'), db.query('SELECT COUNT(*)::int AS n FROM products WHERE status=TRUE'), db.query('SELECT COUNT(*)::int AS n FROM gallery WHERE status=TRUE'), db.query("SELECT COUNT(*)::int AS n FROM enquiries WHERE status='new'"), db.query("SELECT COUNT(*)::int AS n FROM customers WHERE status='active'"), db.query("SELECT COUNT(*)::int AS n FROM service_jobs WHERE status NOT IN ('delivered','cancelled')"), db.query("SELECT COALESCE(SUM(total-paid_amount),0)::numeric AS n FROM invoices WHERE status NOT IN ('paid','cancelled')"), db.query('SELECT id,name,phone,email,message,status,created_at FROM enquiries ORDER BY created_at DESC LIMIT 10')
      ]);
      return ok({ stats: { services: svc.rows[0].n, products: prod.rows[0].n, gallery: gal.rows[0].n, enquiries: enq.rows[0].n, customers: cust.rows[0].n, jobs: jobs.rows[0].n, invoices_due: Number(due.rows[0].n) }, recent: recent.rows });
    }

    // Site settings
    if (path === '/api/admin/settings' && method === 'GET') return ok({ settings: await loadSettings(db) });
    if (path === '/api/admin/settings' && method === 'POST') {
      const gate = await mutationGate(req); if (gate) return fail(gate, 403);
      const b = await bodyJson(req);
      const allowed = ['business_name','phone','whatsapp','email','location','business_hours','tagline','hero_badge','hero_title','hero_text','meta_description','footer_text','hero_image'];
      for (const key of allowed) if (b[key] !== undefined) await db.query('INSERT INTO site_settings(setting_key,setting_value,updated_at) VALUES($1,$2,NOW()) ON CONFLICT(setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value, updated_at=NOW()', [key, clean(b[key], 5000)]);
      return ok({ settings: await loadSettings(db) });
    }
    if (path === '/api/admin/password' && method === 'POST') {
      const gate = await mutationGate(req); if (gate) return fail(gate, 403);
      const b = await bodyJson(req); const current = String(b.current || ''), next = String(b.next || '');
      const row = await db.query('SELECT password_hash FROM admins WHERE id=$1', [admin.id]);
      if (!row.rows[0] || !verifyPassword(current, row.rows[0].password_hash)) return fail('Current password is incorrect.', 400);
      if (next.length < 10) return fail('New password must be at least 10 characters.');
      await db.query('UPDATE admins SET password_hash=$1 WHERE id=$2', [hashPassword(next), admin.id]);
      return ok({ message: 'Password updated.' });
    }

    // CRUD helpers
    if (path === '/api/admin/services' && method === 'GET') { const r = await db.query('SELECT * FROM services ORDER BY sort_order,id'); return ok({ items: r.rows.map(x => ({ ...x, image_url: mediaUrl(x.image) })) }); }
    if (path === '/api/admin/services' && method === 'POST') { const gate=await mutationGate(req);if(gate)return fail(gate,403);const b=await bodyJson(req);const r=await db.query('INSERT INTO services(name,description,icon,image,sort_order,status) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[clean(b.name,150),clean(b.description,700),clean(b.icon,30)||'💻',clean(b.image,255),Math.trunc(num(b.sort_order)),Boolean(b.status ?? true)]);return ok({item:r.rows[0]}); }
    let m = path.match(/^\/api\/admin\/services\/(\d+)$/);
    if (m && method === 'PUT') { const gate=await mutationGate(req);if(gate)return fail(gate,403);const b=await bodyJson(req);const r=await db.query('UPDATE services SET name=$1,description=$2,icon=$3,image=$4,sort_order=$5,status=$6,updated_at=NOW() WHERE id=$7 RETURNING *',[clean(b.name,150),clean(b.description,700),clean(b.icon,30)||'💻',clean(b.image,255),Math.trunc(num(b.sort_order)),Boolean(b.status),m[1]]);return r.rows[0]?ok({item:r.rows[0]}):fail('Service not found.',404); }
    if (m && method === 'DELETE') { const gate=await mutationGate(req);if(gate)return fail(gate,403);await db.query('DELETE FROM services WHERE id=$1',[m[1]]);return ok(); }

    if (path === '/api/admin/products' && method === 'GET') { const r=await db.query('SELECT * FROM products ORDER BY created_at DESC,id DESC');return ok({items:r.rows.map(x=>({...x,image_url:mediaUrl(x.image)}))}); }
    if (path === '/api/admin/products' && method === 'POST') { const gate=await mutationGate(req);if(gate)return fail(gate,403);const b=await bodyJson(req);const r=await db.query('INSERT INTO products(name,category,price,description,image,status) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[clean(b.name,180),clean(b.category,100),clean(b.price,100),clean(b.description,5000),clean(b.image,255),Boolean(b.status ?? true)]);return ok({item:r.rows[0]}); }
    m = path.match(/^\/api\/admin\/products\/(\d+)$/);
    if (m && method === 'PUT') { const gate=await mutationGate(req);if(gate)return fail(gate,403);const b=await bodyJson(req);const r=await db.query('UPDATE products SET name=$1,category=$2,price=$3,description=$4,image=$5,status=$6,updated_at=NOW() WHERE id=$7 RETURNING *',[clean(b.name,180),clean(b.category,100),clean(b.price,100),clean(b.description,5000),clean(b.image,255),Boolean(b.status),m[1]]);return r.rows[0]?ok({item:r.rows[0]}):fail('Product not found.',404); }
    if (m && method === 'DELETE') { const gate=await mutationGate(req);if(gate)return fail(gate,403);await db.query('DELETE FROM products WHERE id=$1',[m[1]]);return ok(); }

    if (path === '/api/admin/gallery' && method === 'GET') { const r=await db.query('SELECT * FROM gallery ORDER BY sort_order,id');return ok({items:r.rows.map(x=>({...x,image_url:mediaUrl(x.image)}))}); }
    if (path === '/api/admin/gallery' && method === 'POST') { const gate=await mutationGate(req);if(gate)return fail(gate,403);const b=await bodyJson(req);const r=await db.query('INSERT INTO gallery(title,image,sort_order,status) VALUES($1,$2,$3,$4) RETURNING *',[clean(b.title,180),clean(b.image,255),Math.trunc(num(b.sort_order)),Boolean(b.status ?? true)]);return ok({item:r.rows[0]}); }
    m = path.match(/^\/api\/admin\/gallery\/(\d+)$/);
    if (m && method === 'PUT') { const gate=await mutationGate(req);if(gate)return fail(gate,403);const b=await bodyJson(req);const r=await db.query('UPDATE gallery SET title=$1,image=$2,sort_order=$3,status=$4 WHERE id=$5 RETURNING *',[clean(b.title,180),clean(b.image,255),Math.trunc(num(b.sort_order)),Boolean(b.status),m[1]]);return r.rows[0]?ok({item:r.rows[0]}):fail('Gallery item not found.',404); }
    if (m && method === 'DELETE') { const gate=await mutationGate(req);if(gate)return fail(gate,403);await db.query('DELETE FROM gallery WHERE id=$1',[m[1]]);return ok(); }

    if (path === '/api/admin/enquiries' && method === 'GET') { const r=await db.query('SELECT * FROM enquiries ORDER BY created_at DESC');return ok({items:r.rows}); }
    m = path.match(/^\/api\/admin\/enquiries\/(\d+)$/);
    if (m && method === 'PATCH') { const gate=await mutationGate(req);if(gate)return fail(gate,403);const b=await bodyJson(req);const status=['new','contacted','closed'].includes(b.status)?b.status:'new';const r=await db.query('UPDATE enquiries SET status=$1 WHERE id=$2 RETURNING *',[status,m[1]]);return r.rows[0]?ok({item:r.rows[0]}):fail('Enquiry not found.',404); }

    // CRM
    if (path === '/api/admin/customers' && method === 'GET') { const q=clean(url.searchParams.get('q'),100); const r=await db.query(q?'SELECT * FROM customers WHERE name ILIKE $1 OR phone ILIKE $1 OR company ILIKE $1 ORDER BY updated_at DESC':'SELECT * FROM customers ORDER BY updated_at DESC',[q?`%${q}%`:undefined].filter(v=>v!==undefined));return ok({items:r.rows}); }
    if (path === '/api/admin/customers' && method === 'POST') { const gate=await mutationGate(req);if(gate)return fail(gate,403);const b=await bodyJson(req);const r=await db.query('INSERT INTO customers(name,company,phone,email,address,notes,status) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[clean(b.name,150),clean(b.company,180),clean(b.phone,30),clean(b.email,190),clean(b.address,5000),clean(b.notes,5000),b.status==='inactive'?'inactive':'active']);return ok({item:r.rows[0]}); }
    m = path.match(/^\/api\/admin\/customers\/(\d+)$/);
    if (m && method === 'GET') { const id=m[1]; const [c,notes,jobs,quotes,invoices,enq]=await Promise.all([db.query('SELECT * FROM customers WHERE id=$1',[id]),db.query('SELECT * FROM customer_notes WHERE customer_id=$1 ORDER BY created_at DESC',[id]),db.query('SELECT * FROM service_jobs WHERE customer_id=$1 ORDER BY created_at DESC',[id]),db.query('SELECT * FROM quotes WHERE customer_id=$1 ORDER BY created_at DESC',[id]),db.query('SELECT * FROM invoices WHERE customer_id=$1 ORDER BY created_at DESC',[id]),db.query('SELECT e.* FROM enquiries e WHERE e.phone=(SELECT phone FROM customers WHERE id=$1) ORDER BY e.created_at DESC',[id])]);if(!c.rows[0])return fail('Customer not found.',404);return ok({customer:c.rows[0],notes:notes.rows,jobs:jobs.rows,quotes:quotes.rows,invoices:invoices.rows,enquiries:enq.rows}); }
    if (m && method === 'PUT') { const gate=await mutationGate(req);if(gate)return fail(gate,403);const b=await bodyJson(req);const r=await db.query('UPDATE customers SET name=$1,company=$2,phone=$3,email=$4,address=$5,notes=$6,status=$7,updated_at=NOW() WHERE id=$8 RETURNING *',[clean(b.name,150),clean(b.company,180),clean(b.phone,30),clean(b.email,190),clean(b.address,5000),clean(b.notes,5000),b.status==='inactive'?'inactive':'active',m[1]]);return r.rows[0]?ok({item:r.rows[0]}):fail('Customer not found.',404); }
    if (m && method === 'POST') { const gate=await mutationGate(req);if(gate)return fail(gate,403);const b=await bodyJson(req);if(!clean(b.note,5000))return fail('Note is required.');const r=await db.query('INSERT INTO customer_notes(customer_id,note,admin_id) VALUES($1,$2,$3) RETURNING *',[m[1],clean(b.note,5000),admin.id]);return ok({item:r.rows[0]}); }

    // Service jobs
    if (path === '/api/admin/jobs' && method === 'GET') { const r=await db.query('SELECT j.*,c.name customer_name,c.phone customer_phone FROM service_jobs j JOIN customers c ON c.id=j.customer_id ORDER BY j.created_at DESC');return ok({items:r.rows}); }
    if (path === '/api/admin/jobs' && method === 'POST') { const gate=await mutationGate(req);if(gate)return fail(gate,403);const b=await bodyJson(req);const seq=(await db.query("SELECT nextval('job_number_seq') n")).rows[0].n;const jobNo=`JOB-${new Date().getFullYear()}-${String(seq).padStart(4,'0')}`;const r=await db.query('INSERT INTO service_jobs(customer_id,job_no,device_type,brand_model,serial_no,problem,diagnosis,status,estimated_cost,final_cost,promised_at,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',[num(b.customer_id),jobNo,clean(b.device_type,100),clean(b.brand_model,180),clean(b.serial_no,120),clean(b.problem,5000),clean(b.diagnosis,5000),['received','diagnosing','waiting_approval','in_repair','ready','delivered','cancelled'].includes(b.status)?b.status:'received',money(b.estimated_cost),money(b.final_cost),b.promised_at||null,clean(b.notes,5000)]);return ok({item:r.rows[0]}); }
    m=path.match(/^\/api\/admin\/jobs\/(\d+)$/);
    if(m&&method==='PUT'){const gate=await mutationGate(req);if(gate)return fail(gate,403);const b=await bodyJson(req);const status=['received','diagnosing','waiting_approval','in_repair','ready','delivered','cancelled'].includes(b.status)?b.status:'received';const delivered=status==='delivered'?(b.delivered_at||new Date().toISOString()):null;const r=await db.query('UPDATE service_jobs SET customer_id=$1,device_type=$2,brand_model=$3,serial_no=$4,problem=$5,diagnosis=$6,status=$7,estimated_cost=$8,final_cost=$9,promised_at=$10,delivered_at=$11,notes=$12,updated_at=NOW() WHERE id=$13 RETURNING *',[num(b.customer_id),clean(b.device_type,100),clean(b.brand_model,180),clean(b.serial_no,120),clean(b.problem,5000),clean(b.diagnosis,5000),status,money(b.estimated_cost),money(b.final_cost),b.promised_at||null,delivered,clean(b.notes,5000),m[1]]);return r.rows[0]?ok({item:r.rows[0]}):fail('Job not found.',404);}

    // Quotes
    if (path === '/api/admin/quotes' && method === 'GET') { const r=await db.query('SELECT q.*,c.name customer_name,c.phone customer_phone FROM quotes q JOIN customers c ON c.id=q.customer_id ORDER BY q.created_at DESC');return ok({items:r.rows}); }
    if (path === '/api/admin/quotes' && method === 'POST') { const gate=await mutationGate(req);if(gate)return fail(gate,403);const b=await bodyJson(req);const items=Array.isArray(b.items)?b.items:[];if(!num(b.customer_id)||!items.length)return fail('Customer and at least one line item are required.');const client=await pool.connect();try{await client.query('BEGIN');const seq=(await client.query("SELECT nextval('quote_number_seq') n")).rows[0].n;const quoteNo=`QT-${new Date().getFullYear()}-${String(seq).padStart(4,'0')}`;const cleaned=items.map(i=>({description:clean(i.description,255),qty:num(i.qty)||1,unit_price:money(i.unit_price)})).filter(i=>i.description);const subtotal=money(cleaned.reduce((s,i)=>s+i.qty*i.unit_price,0));const taxPercent=money(b.tax_percent);const taxAmount=money(subtotal*taxPercent/100);const total=money(subtotal+taxAmount);const q=await client.query('INSERT INTO quotes(customer_id,quote_no,quote_date,valid_until,status,subtotal,tax_percent,tax_amount,total,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',[num(b.customer_id),quoteNo,b.quote_date||new Date().toISOString().slice(0,10),b.valid_until||null,['draft','sent','approved','rejected','expired'].includes(b.status)?b.status:'draft',subtotal,taxPercent,taxAmount,total,clean(b.notes,5000)]);for(const i of cleaned)await client.query('INSERT INTO quote_items(quote_id,description,qty,unit_price,amount) VALUES($1,$2,$3,$4,$5)',[q.rows[0].id,i.description,i.qty,i.unit_price,money(i.qty*i.unit_price)]);await client.query('COMMIT');return ok({item:q.rows[0]});}catch(e){await client.query('ROLLBACK');throw e}finally{client.release();}}
    m=path.match(/^\/api\/admin\/quotes\/(\d+)$/);
    if(m&&method==='GET'){const [q,i,c]=await Promise.all([db.query('SELECT q.*,c.name customer_name,c.phone customer_phone,c.email customer_email,c.address customer_address FROM quotes q JOIN customers c ON c.id=q.customer_id WHERE q.id=$1',[m[1]]),db.query('SELECT * FROM quote_items WHERE quote_id=$1 ORDER BY id',[m[1]]),db.query('SELECT name,phone,email,address FROM customers WHERE id=(SELECT customer_id FROM quotes WHERE id=$1)',[m[1]])]);return q.rows[0]?ok({item:q.rows[0],items:i.rows,customer:c.rows[0]}):fail('Quote not found.',404);}
    if(m&&method==='PUT'){const gate=await mutationGate(req);if(gate)return fail(gate,403);const b=await bodyJson(req);const items=Array.isArray(b.items)?b.items:[];const cleaned=items.map(i=>({description:clean(i.description,255),qty:num(i.qty)||1,unit_price:money(i.unit_price)})).filter(i=>i.description);const subtotal=money(cleaned.reduce((s,i)=>s+i.qty*i.unit_price,0));const taxPercent=money(b.tax_percent);const taxAmount=money(subtotal*taxPercent/100);const total=money(subtotal+taxAmount);const client=await pool.connect();try{await client.query('BEGIN');const q=await client.query('UPDATE quotes SET customer_id=$1,quote_date=$2,valid_until=$3,status=$4,subtotal=$5,tax_percent=$6,tax_amount=$7,total=$8,notes=$9,updated_at=NOW() WHERE id=$10 RETURNING *',[num(b.customer_id),b.quote_date||new Date().toISOString().slice(0,10),b.valid_until||null,['draft','sent','approved','rejected','expired'].includes(b.status)?b.status:'draft',subtotal,taxPercent,taxAmount,total,clean(b.notes,5000),m[1]]);if(!q.rows[0]){await client.query('ROLLBACK');return fail('Quote not found.',404);}await client.query('DELETE FROM quote_items WHERE quote_id=$1',[m[1]]);for(const i of cleaned)await client.query('INSERT INTO quote_items(quote_id,description,qty,unit_price,amount) VALUES($1,$2,$3,$4,$5)',[m[1],i.description,i.qty,i.unit_price,money(i.qty*i.unit_price)]);await client.query('COMMIT');return ok({item:q.rows[0]});}catch(e){await client.query('ROLLBACK');throw e}finally{client.release();}}

    // Invoices
    if (path === '/api/admin/invoices' && method === 'GET') { const r=await db.query('SELECT i.*,c.name customer_name,c.phone customer_phone FROM invoices i JOIN customers c ON c.id=i.customer_id ORDER BY i.created_at DESC');return ok({items:r.rows}); }
    if (path === '/api/admin/invoices' && method === 'POST') { const gate=await mutationGate(req);if(gate)return fail(gate,403);const b=await bodyJson(req);const items=Array.isArray(b.items)?b.items:[];if(!num(b.customer_id)||!items.length)return fail('Customer and at least one line item are required.');const client=await pool.connect();try{await client.query('BEGIN');const seq=(await client.query("SELECT nextval('invoice_number_seq') n")).rows[0].n;const invoiceNo=`INV-${new Date().getFullYear()}-${String(seq).padStart(4,'0')}`;const cleaned=items.map(i=>({description:clean(i.description,255),qty:num(i.qty)||1,unit_price:money(i.unit_price)})).filter(i=>i.description);const subtotal=money(cleaned.reduce((s,i)=>s+i.qty*i.unit_price,0));const taxPercent=money(b.tax_percent);const taxAmount=money(subtotal*taxPercent/100);const total=money(subtotal+taxAmount);let paid=money(b.paid_amount);if(paid<0)paid=0;if(paid>total)paid=total;let status=['draft','sent','partial','paid','overdue','cancelled'].includes(b.status)?b.status:'draft';if(status!=='cancelled')status=paid>=total&&total>0?'paid':paid>0?'partial':status;const q=await client.query('INSERT INTO invoices(customer_id,invoice_no,invoice_date,due_date,status,subtotal,tax_percent,tax_amount,total,paid_amount,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',[num(b.customer_id),invoiceNo,b.invoice_date||new Date().toISOString().slice(0,10),b.due_date||null,status,subtotal,taxPercent,taxAmount,total,paid,clean(b.notes,5000)]);for(const i of cleaned)await client.query('INSERT INTO invoice_items(invoice_id,description,qty,unit_price,amount) VALUES($1,$2,$3,$4,$5)',[q.rows[0].id,i.description,i.qty,i.unit_price,money(i.qty*i.unit_price)]);await client.query('COMMIT');return ok({item:q.rows[0]});}catch(e){await client.query('ROLLBACK');throw e}finally{client.release();}}
    m=path.match(/^\/api\/admin\/invoices\/(\d+)$/);
    if(m&&method==='GET'){const [q,i,c]=await Promise.all([db.query('SELECT i.*,c.name customer_name,c.phone customer_phone,c.email customer_email,c.address customer_address FROM invoices i JOIN customers c ON c.id=i.customer_id WHERE i.id=$1',[m[1]]),db.query('SELECT * FROM invoice_items WHERE invoice_id=$1 ORDER BY id',[m[1]]),db.query('SELECT name,phone,email,address FROM customers WHERE id=(SELECT customer_id FROM invoices WHERE id=$1)',[m[1]])]);return q.rows[0]?ok({item:q.rows[0],items:i.rows,customer:c.rows[0]}):fail('Invoice not found.',404);}
    if(m&&method==='PUT'){const gate=await mutationGate(req);if(gate)return fail(gate,403);const b=await bodyJson(req);const items=Array.isArray(b.items)?b.items:[];const cleaned=items.map(i=>({description:clean(i.description,255),qty:num(i.qty)||1,unit_price:money(i.unit_price)})).filter(i=>i.description);const subtotal=money(cleaned.reduce((s,i)=>s+i.qty*i.unit_price,0));const taxPercent=money(b.tax_percent);const taxAmount=money(subtotal*taxPercent/100);const total=money(subtotal+taxAmount);let paid=Math.max(0,Math.min(total,money(b.paid_amount)));let status=['draft','sent','partial','paid','overdue','cancelled'].includes(b.status)?b.status:'draft';if(status!=='cancelled')status=paid>=total&&total>0?'paid':paid>0?'partial':status;const client=await pool.connect();try{await client.query('BEGIN');const q=await client.query('UPDATE invoices SET customer_id=$1,invoice_date=$2,due_date=$3,status=$4,subtotal=$5,tax_percent=$6,tax_amount=$7,total=$8,paid_amount=$9,notes=$10,updated_at=NOW() WHERE id=$11 RETURNING *',[num(b.customer_id),b.invoice_date||new Date().toISOString().slice(0,10),b.due_date||null,status,subtotal,taxPercent,taxAmount,total,paid,clean(b.notes,5000),m[1]]);if(!q.rows[0]){await client.query('ROLLBACK');return fail('Invoice not found.',404);}await client.query('DELETE FROM invoice_items WHERE invoice_id=$1',[m[1]]);for(const i of cleaned)await client.query('INSERT INTO invoice_items(invoice_id,description,qty,unit_price,amount) VALUES($1,$2,$3,$4,$5)',[m[1],i.description,i.qty,i.unit_price,money(i.qty*i.unit_price)]);await client.query('COMMIT');return ok({item:q.rows[0]});}catch(e){await client.query('ROLLBACK');throw e}finally{client.release();}}

    // Inventory
    if(path==='/api/admin/inventory'&&method==='GET'){const r=await db.query('SELECT * FROM inventory_items ORDER BY name');return ok({items:r.rows});}
    if(path==='/api/admin/inventory'&&method==='POST'){const gate=await mutationGate(req);if(gate)return fail(gate,403);const b=await bodyJson(req);const r=await db.query('INSERT INTO inventory_items(sku,name,category,brand,qty,purchase_price,sale_price,reorder_level,supplier,notes,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',[clean(b.sku,80),clean(b.name,180),clean(b.category,100),clean(b.brand,100),num(b.qty),money(b.purchase_price),money(b.sale_price),num(b.reorder_level),clean(b.supplier,180),clean(b.notes,5000),Boolean(b.status??true)]);return ok({item:r.rows[0]});}
    m=path.match(/^\/api\/admin\/inventory\/(\d+)$/);
    if(m&&method==='PUT'){const gate=await mutationGate(req);if(gate)return fail(gate,403);const b=await bodyJson(req);const r=await db.query('UPDATE inventory_items SET sku=$1,name=$2,category=$3,brand=$4,qty=$5,purchase_price=$6,sale_price=$7,reorder_level=$8,supplier=$9,notes=$10,status=$11,updated_at=NOW() WHERE id=$12 RETURNING *',[clean(b.sku,80),clean(b.name,180),clean(b.category,100),clean(b.brand,100),num(b.qty),money(b.purchase_price),money(b.sale_price),num(b.reorder_level),clean(b.supplier,180),clean(b.notes,5000),Boolean(b.status),m[1]]);return r.rows[0]?ok({item:r.rows[0]}):fail('Inventory item not found.',404);}
    const mm=path.match(/^\/api\/admin\/inventory\/(\d+)\/movement$/);
    if(mm&&method==='POST'){const gate=await mutationGate(req);if(gate)return fail(gate,403);const b=await bodyJson(req);const type=['in','out','adjustment'].includes(b.movement_type)?b.movement_type:'in';const amount=num(b.qty);if(amount<=0)return fail('Quantity must be greater than zero.');const client=await pool.connect();try{await client.query('BEGIN');const current=await client.query('SELECT qty FROM inventory_items WHERE id=$1 FOR UPDATE',[mm[1]]);if(!current.rows[0]){await client.query('ROLLBACK');return fail('Inventory item not found.',404);}let next=Number(current.rows[0].qty);if(type==='in')next+=amount;else if(type==='out'){next-=amount;if(next<0){await client.query('ROLLBACK');return fail('Stock cannot go below zero.');}}else next=amount;const item=await client.query('UPDATE inventory_items SET qty=$1,updated_at=NOW() WHERE id=$2 RETURNING *',[next,mm[1]]);const mv=await client.query('INSERT INTO inventory_movements(item_id,movement_type,qty,reference_type,reference_id,note) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[mm[1],type,amount,clean(b.reference_type,50),b.reference_id?num(b.reference_id):null,clean(b.note,255)]);await client.query('COMMIT');return ok({item:item.rows[0],movement:mv.rows[0]});}catch(e){await client.query('ROLLBACK');throw e}finally{client.release();}}

    return fail('API route not found.',404);
  } catch (err) {
    console.error(err);
    return fail(process.env.NODE_ENV === 'production' ? 'Server error. Check Netlify function logs.' : (err?.message || 'Server error.'), 500);
  }
}
