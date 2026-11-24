ALTER TABLE featured ADD COLUMN image_id TEXT REFERENCES media(id) ON DELETE RESTRICT;
ALTER TABLE settings ADD COLUMN logo_id TEXT REFERENCES media(id) ON DELETE RESTRICT;
ALTER TABLE rate_limits ADD COLUMN expires_at INTEGER NOT NULL DEFAULT 0;
CREATE INDEX rate_limits_expiry ON rate_limits(expires_at);
CREATE TRIGGER translation_status_insert BEFORE INSERT ON translations WHEN json_extract(NEW.data,'$.status') NOT IN ('missing','pending','ready','failed','needs_review') OR json_extract(NEW.data,'$.origin') NOT IN ('machine','manual') BEGIN SELECT RAISE(ABORT,'Invalid translation state'); END;
CREATE TRIGGER translation_status_update BEFORE UPDATE ON translations WHEN json_extract(NEW.data,'$.status') NOT IN ('missing','pending','ready','failed','needs_review') OR json_extract(NEW.data,'$.origin') NOT IN ('machine','manual') BEGIN SELECT RAISE(ABORT,'Invalid translation state'); END;
