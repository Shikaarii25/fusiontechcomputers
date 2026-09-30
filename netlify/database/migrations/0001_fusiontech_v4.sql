CREATE TABLE IF NOT EXISTS site_settings (
  id BIGSERIAL PRIMARY KEY,
  setting_key VARCHAR(120) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(700) NOT NULL DEFAULT '',
  icon VARCHAR(30) NOT NULL DEFAULT '💻',
  image VARCHAR(255) NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  status BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);

CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT '',
  price VARCHAR(100) NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  image VARCHAR(255) NOT NULL DEFAULT '',
  status BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

CREATE TABLE IF NOT EXISTS gallery (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(180) NOT NULL DEFAULT '',
  image VARCHAR(255) NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  status BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enquiries (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(190) NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_created ON enquiries(created_at DESC);

CREATE TABLE IF NOT EXISTS admins (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  company VARCHAR(180) NOT NULL DEFAULT '',
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(190) NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

CREATE TABLE IF NOT EXISTS customer_notes (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  admin_id BIGINT REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_jobs (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  job_no VARCHAR(40) NOT NULL UNIQUE,
  device_type VARCHAR(100) NOT NULL DEFAULT '',
  brand_model VARCHAR(180) NOT NULL DEFAULT '',
  serial_no VARCHAR(120) NOT NULL DEFAULT '',
  problem TEXT NOT NULL DEFAULT '',
  diagnosis TEXT NOT NULL DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'received' CHECK (status IN ('received','diagnosing','waiting_approval','in_repair','ready','delivered','cancelled')),
  estimated_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  final_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  promised_at TIMESTAMPTZ NULL,
  delivered_at TIMESTAMPTZ NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jobs_customer ON service_jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON service_jobs(status);

CREATE TABLE IF NOT EXISTS quotes (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  quote_no VARCHAR(40) NOT NULL UNIQUE,
  quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','approved','rejected','expired')),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quote_items (
  id BIGSERIAL PRIMARY KEY,
  quote_id BIGINT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  qty NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS invoices (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  invoice_no VARCHAR(40) NOT NULL UNIQUE,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','partial','paid','overdue','cancelled')),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id BIGSERIAL PRIMARY KEY,
  invoice_id BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  qty NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id BIGSERIAL PRIMARY KEY,
  sku VARCHAR(80) NOT NULL DEFAULT '',
  name VARCHAR(180) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT '',
  brand VARCHAR(100) NOT NULL DEFAULT '',
  qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  sale_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  reorder_level NUMERIC(12,2) NOT NULL DEFAULT 0,
  supplier VARCHAR(180) NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inventory_qty ON inventory_items(qty);
CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory_items(name);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('in','out','adjustment')),
  qty NUMERIC(12,2) NOT NULL,
  reference_type VARCHAR(50) NOT NULL DEFAULT '',
  reference_id BIGINT NULL,
  note VARCHAR(255) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON inventory_movements(item_id);

INSERT INTO site_settings(setting_key, setting_value) VALUES
('business_name','Fusiontech Computers'),
('phone','8080192024'),
('whatsapp','918080192024'),
('email',''),
('location','Chembur, Mumbai'),
('business_hours','Mon–Sat · 10:00 AM–8:00 PM'),
('tagline','Computer • Laptop • IT Solutions'),
('hero_badge','CHEMBUR, MUMBAI · LOCAL TECH SUPPORT'),
('hero_title','Tech problems? We fix them.'),
('hero_text','Computer & laptop sales, repair, upgrades, software, CCTV and business IT support — from one local technology partner.'),
('meta_description','Fusiontech Computers in Chembur, Mumbai — computer and laptop repair, sales, upgrades, Apple/Mac service, gaming PC builds, CCTV and business IT support.'),
('footer_text','Local technology support for homes, students and businesses.'),
('hero_image','assets/images/hero-futuristic-computer.jpg')
ON CONFLICT(setting_key) DO NOTHING;

INSERT INTO services(name,description,icon,sort_order) VALUES
('Computer & Laptop Sales','New computers and laptops configured for home, office and business use.','💻',1),
('PC & Laptop Repair','Hardware diagnosis, Windows issues, cleaning, upgrades and performance fixes.','🛠️',2),
('Apple / Mac Repair','Apple and Mac troubleshooting, software support and hardware service.','',3),
('Gaming PC Builds','Custom gaming PCs matched to performance, budget and future upgrades.','🎮',4),
('Data Recovery','Support for inaccessible, deleted or failing storage and important data.','💾',5),
('CCTV Solutions','CCTV planning, installation, configuration and maintenance.','📹',6),
('Home Computer Service','Convenient support at home or office for common computer problems.','🏠',7),
('Business IT Support','Software setup, networking, deployments and ongoing technical support.','🏢',8)
ON CONFLICT DO NOTHING;
