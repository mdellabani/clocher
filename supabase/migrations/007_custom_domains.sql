ALTER TABLE communes ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;
ALTER TABLE communes ADD COLUMN IF NOT EXISTS domain_verified BOOLEAN DEFAULT false;

CREATE INDEX idx_communes_custom_domain ON communes(custom_domain) WHERE custom_domain IS NOT NULL;
