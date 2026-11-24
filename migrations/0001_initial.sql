PRAGMA foreign_keys = ON;
CREATE TABLE admin_users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, salt TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, admin_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE categories (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(json_valid(data)), revision INTEGER NOT NULL, slug TEXT GENERATED ALWAYS AS (json_extract(data,'$.slug')) STORED UNIQUE);
CREATE TABLE products (
 id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(json_valid(data)), revision INTEGER NOT NULL,
 sku TEXT GENERATED ALWAYS AS (json_extract(data,'$.sku')) STORED NOT NULL UNIQUE,
 slug TEXT GENERATED ALWAYS AS (json_extract(data,'$.slug')) STORED NOT NULL UNIQUE,
 category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
 status TEXT GENERATED ALWAYS AS (json_extract(data,'$.status')) STORED CHECK(status IN ('draft','published','archived')),
 price_krw INTEGER GENERATED ALWAYS AS (json_extract(data,'$.price_krw')) STORED CHECK(typeof(price_krw)='integer' AND price_krw>0),
 sale_price_krw INTEGER GENERATED ALWAYS AS (json_extract(data,'$.sale_price_krw')) STORED CHECK(sale_price_krw IS NULL OR (typeof(sale_price_krw)='integer' AND sale_price_krw>0 AND sale_price_krw<price_krw)),
 CHECK(json_extract(data,'$.availability') IN ('available','preorder','out_of_stock')),
 CHECK(json_extract(data,'$.sale_starts_at') IS NULL OR json_extract(data,'$.sale_ends_at') IS NULL OR json_extract(data,'$.sale_ends_at')>json_extract(data,'$.sale_starts_at'))
);
CREATE INDEX products_catalog ON products(status, json_extract(data,'$.sort_order'));
CREATE INDEX products_category ON products(category_id);
CREATE INDEX products_created ON products(json_extract(data,'$.created_at'));
CREATE TABLE featured (id TEXT PRIMARY KEY CHECK(id='1'), data TEXT NOT NULL CHECK(json_valid(data)), revision INTEGER NOT NULL, product_id TEXT REFERENCES products(id) ON DELETE SET NULL);
CREATE TABLE settings (id TEXT PRIMARY KEY CHECK(id='1'), data TEXT NOT NULL CHECK(json_valid(data)), revision INTEGER NOT NULL);
INSERT INTO settings VALUES ('1','{"store_name":"Tempe Segar","contact_display":"+821065653524","whatsapp_number":"821065653524","whatsapp_enabled":true,"line_enabled":false,"line_mode":"official_account","line_official_id":"","line_url":"","about_id":"Tempe untuk meja makan Anda. Pilih produk, lalu pesan langsung melalui chat.","about_ko":"식탁을 위한 템페. 상품을 선택하고 채팅으로 직접 주문하세요.","about_en":"Tempe for your table. Choose a product and order directly through chat.","logo_id":null,"revision":1}',1);
CREATE TABLE translations (entity_type TEXT NOT NULL CHECK(entity_type IN ('products','categories','featured')), entity_id TEXT NOT NULL, locale TEXT NOT NULL CHECK(locale IN ('ko','en')), data TEXT NOT NULL CHECK(json_valid(data)), PRIMARY KEY(entity_type,entity_id,locale));
CREATE TABLE media (id TEXT PRIMARY KEY, storage_path TEXT NOT NULL UNIQUE, width INTEGER NOT NULL CHECK(width>0), height INTEGER NOT NULL CHECK(height>0), alt_id TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, owner_id TEXT NOT NULL REFERENCES admin_users(id));
CREATE TABLE product_media (product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE, media_id TEXT NOT NULL REFERENCES media(id), sort_order INTEGER NOT NULL, PRIMARY KEY(product_id,media_id), UNIQUE(product_id,sort_order));
CREATE INDEX product_media_lookup ON product_media(media_id);
CREATE TABLE rate_limits (key TEXT NOT NULL, window INTEGER NOT NULL, count INTEGER NOT NULL DEFAULT 1, PRIMARY KEY(key,window));
CREATE TABLE translation_attempts (key TEXT PRIMARY KEY, started_at INTEGER NOT NULL, status TEXT NOT NULL CHECK(status IN ('pending','ready','failed')));
