CREATE TABLE IF NOT EXISTS message_origins (
    id SERIAL PRIMARY KEY,
    origin_key VARCHAR(150) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    niche VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS target_groups (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    niche VARCHAR(50) NOT NULL,
    group_code VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_origins_niche ON message_origins(niche);
CREATE INDEX IF NOT EXISTS idx_message_origins_status ON message_origins(status);
CREATE INDEX IF NOT EXISTS idx_target_groups_niche ON target_groups(niche);
CREATE INDEX IF NOT EXISTS idx_target_groups_status ON target_groups(status);

INSERT INTO target_groups (slug, name, niche, group_code, status)
SELECT 'principal', 'Grupo Geral', 'geral', '120363424011546207@g.us', 'active'
WHERE NOT EXISTS (SELECT 1 FROM target_groups WHERE slug = 'principal');

INSERT INTO target_groups (slug, name, niche, group_code, status)
SELECT 'pet', 'Grupo Pet', 'pet', '120363424011546208@g.us', 'active'
WHERE NOT EXISTS (SELECT 1 FROM target_groups WHERE slug = 'pet');

INSERT INTO target_groups (slug, name, niche, group_code, status)
SELECT 'bebe', 'Grupo Bebê', 'bebe', '120363424011546209@g.us', 'active'
WHERE NOT EXISTS (SELECT 1 FROM target_groups WHERE slug = 'bebe');

INSERT INTO message_origins (origin_key, name, niche, status)
SELECT 'origem_geral', 'Origem Geral', 'geral', 'active'
WHERE NOT EXISTS (SELECT 1 FROM message_origins WHERE origin_key = 'origem_geral');

INSERT INTO message_origins (origin_key, name, niche, status)
SELECT 'origem_pet', 'Origem Pet', 'pet', 'active'
WHERE NOT EXISTS (SELECT 1 FROM message_origins WHERE origin_key = 'origem_pet');

INSERT INTO message_origins (origin_key, name, niche, status)
SELECT 'origem_bebe', 'Origem Bebê', 'bebe', 'active'
WHERE NOT EXISTS (SELECT 1 FROM message_origins WHERE origin_key = 'origem_bebe');
