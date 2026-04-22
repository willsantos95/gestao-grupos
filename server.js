const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();

const PORT = process.env.PORT || 3000;
const BASE_LINK_URL =
  process.env.BASE_LINK_URL || "https://link.relampagodeofertas.shop";

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl:
    process.env.DB_SSL === "true"
      ? { rejectUnauthorized: false }
      : false,
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/admin", express.static(path.join(__dirname, "public", "admin")));
app.use("/public", express.static(path.join(__dirname, "public")));

/**
 * Helpers
 */
function normalizeStatus(status) {
  return status === "inactive" ? "inactive" : "active";
}

function normalizeNiche(niche) {
  return (niche || "").trim().toLowerCase();
}

/**
 * DB init
 */
async function initDb() {
  console.log("🔧 Inicializando banco...");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS message_origins (
      id SERIAL PRIMARY KEY,
      origin_key VARCHAR(150) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      niche VARCHAR(50) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS target_groups (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      niche VARCHAR(50) NOT NULL,
      group_code VARCHAR(100) NOT NULL UNIQUE,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_message_origins_niche
    ON message_origins(niche);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_message_origins_status
    ON message_origins(status);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_target_groups_niche
    ON target_groups(niche);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_target_groups_status
    ON target_groups(status);
  `);

  console.log("✅ Banco pronto");
}

/**
 * Healthcheck
 */
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.json({
      ok: true,
      app: "relampago-manager",
      db: "connected",
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      app: "relampago-manager",
      db: "disconnected",
      error: error.message,
    });
  }
});

/**
 * HOME
 */
app.get("/", (req, res) => {
  res.send(`
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Relâmpago Manager</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          a { display: inline-block; margin-top: 12px; }
        </style>
      </head>
      <body>
        <h1>Relâmpago Manager</h1>
        <p>Aplicação no ar.</p>
        <a href="/admin">Abrir painel admin</a>
      </body>
    </html>
  `);
});

/**
 * =========================
 * ORIGINS CRUD
 * =========================
 */

// Listar origens
app.get("/api/origins", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, origin_key, name, niche, status, created_at, updated_at
      FROM message_origins
      ORDER BY id DESC
    `);

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao listar origens",
      detail: error.message,
    });
  }
});

// Buscar origem por id
app.get("/api/origins/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT id, origin_key, name, niche, status, created_at, updated_at
      FROM message_origins
      WHERE id = $1
      LIMIT 1
      `,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Origem não encontrada" });
    }

    return res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao buscar origem",
      detail: error.message,
    });
  }
});

// Criar origem
app.post("/api/origins", async (req, res) => {
  try {
    const origin_key = (req.body.origin_key || "").trim();
    const name = (req.body.name || "").trim();
    const niche = normalizeNiche(req.body.niche);
    const status = normalizeStatus(req.body.status);

    if (!origin_key || !name || !niche) {
      return res.status(400).json({
        error: "Campos obrigatórios: origin_key, name, niche",
      });
    }

    const { rows } = await pool.query(
      `
      INSERT INTO message_origins (origin_key, name, niche, status)
      VALUES ($1, $2, $3, $4)
      RETURNING id, origin_key, name, niche, status, created_at, updated_at
      `,
      [origin_key, name, niche, status]
    );

    return res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: "Já existe uma origem com essa chave",
      });
    }

    return res.status(500).json({
      error: "Erro ao criar origem",
      detail: error.message,
    });
  }
});

// Atualizar origem
app.put("/api/origins/:id", async (req, res) => {
  try {
    const { rows: existingRows } = await pool.query(
      `SELECT * FROM message_origins WHERE id = $1 LIMIT 1`,
      [req.params.id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ error: "Origem não encontrada" });
    }

    const existing = existingRows[0];

    const origin_key = (req.body.origin_key || existing.origin_key).trim();
    const name = (req.body.name || existing.name).trim();
    const niche = normalizeNiche(req.body.niche || existing.niche);
    const status = normalizeStatus(req.body.status || existing.status);

    const { rows } = await pool.query(
      `
      UPDATE message_origins
      SET origin_key = $1,
          name = $2,
          niche = $3,
          status = $4,
          updated_at = NOW()
      WHERE id = $5
      RETURNING id, origin_key, name, niche, status, created_at, updated_at
      `,
      [origin_key, name, niche, status, req.params.id]
    );

    return res.json(rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: "Já existe uma origem com essa chave",
      });
    }

    return res.status(500).json({
      error: "Erro ao atualizar origem",
      detail: error.message,
    });
  }
});

// Excluir origem
app.delete("/api/origins/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      DELETE FROM message_origins
      WHERE id = $1
      RETURNING id, origin_key, name, niche, status
      `,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Origem não encontrada" });
    }

    return res.json({
      success: true,
      removed: rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao excluir origem",
      detail: error.message,
    });
  }
});

/**
 * =========================
 * GROUPS CRUD
 * =========================
 */

// Listar grupos
app.get("/api/groups", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, slug, name, niche, group_code, status, created_at, updated_at
      FROM target_groups
      ORDER BY id DESC
    `);

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao listar grupos",
      detail: error.message,
    });
  }
});

// Buscar grupo por id
app.get("/api/groups/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT id, slug, name, niche, group_code, status, created_at, updated_at
      FROM target_groups
      WHERE id = $1
      LIMIT 1
      `,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Grupo não encontrado" });
    }

    return res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao buscar grupo",
      detail: error.message,
    });
  }
});

// Buscar grupo por slug
app.get("/api/groups/slug/:slug", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT id, slug, name, niche, group_code, status, created_at, updated_at
      FROM target_groups
      WHERE slug = $1
      LIMIT 1
      `,
      [req.params.slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Grupo não encontrado" });
    }

    const group = rows[0];

    return res.json({
      ...group,
      web: `${BASE_LINK_URL}/${group.slug}`,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao buscar grupo por slug",
      detail: error.message,
    });
  }
});

// Criar grupo
app.post("/api/groups", async (req, res) => {
  try {
    const slug = (req.body.slug || "").trim().toLowerCase();
    const name = (req.body.name || "").trim();
    const niche = normalizeNiche(req.body.niche);
    const group_code = (req.body.group_code || "").trim();
    const status = normalizeStatus(req.body.status);

    if (!slug || !name || !niche || !group_code) {
      return res.status(400).json({
        error: "Campos obrigatórios: slug, name, niche, group_code",
      });
    }

    const { rows } = await pool.query(
      `
      INSERT INTO target_groups (slug, name, niche, group_code, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, slug, name, niche, group_code, status, created_at, updated_at
      `,
      [slug, name, niche, group_code, status]
    );

    return res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: "Já existe um grupo com esse slug ou group_code",
      });
    }

    return res.status(500).json({
      error: "Erro ao criar grupo",
      detail: error.message,
    });
  }
});

// Atualizar grupo
app.put("/api/groups/:id", async (req, res) => {
  try {
    const { rows: existingRows } = await pool.query(
      `SELECT * FROM target_groups WHERE id = $1 LIMIT 1`,
      [req.params.id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ error: "Grupo não encontrado" });
    }

    const existing = existingRows[0];

    const slug = (req.body.slug || existing.slug).trim().toLowerCase();
    const name = (req.body.name || existing.name).trim();
    const niche = normalizeNiche(req.body.niche || existing.niche);
    const group_code = (req.body.group_code || existing.group_code).trim();
    const status = normalizeStatus(req.body.status || existing.status);

    const { rows } = await pool.query(
      `
      UPDATE target_groups
      SET slug = $1,
          name = $2,
          niche = $3,
          group_code = $4,
          status = $5,
          updated_at = NOW()
      WHERE id = $6
      RETURNING id, slug, name, niche, group_code, status, created_at, updated_at
      `,
      [slug, name, niche, group_code, status, req.params.id]
    );

    return res.json(rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: "Já existe um grupo com esse slug ou group_code",
      });
    }

    return res.status(500).json({
      error: "Erro ao atualizar grupo",
      detail: error.message,
    });
  }
});

// Excluir grupo
app.delete("/api/groups/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      DELETE FROM target_groups
      WHERE id = $1
      RETURNING id, slug, name, niche, group_code, status
      `,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Grupo não encontrado" });
    }

    return res.json({
      success: true,
      removed: rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao excluir grupo",
      detail: error.message,
    });
  }
});

/**
 * =========================
 * RESOLVE PARA N8N
 * =========================
 *
 * Exemplo:
 * GET /api/resolve?origin_key=origem_pet
 */
app.get("/api/resolve", async (req, res) => {
  const origin_key = (req.query.origin_key || "").trim();

  try {
    let origin = null;
    let niche = "geral";

    if (origin_key) {
      const originResult = await pool.query(
        `
        SELECT id, origin_key, name, niche, status
        FROM message_origins
        WHERE origin_key = $1
          AND status = 'active'
        LIMIT 1
        `,
        [origin_key]
      );

      if (originResult.rows.length > 0) {
        origin = originResult.rows[0];
        niche = origin.niche;
      }
    }

    let groupResult = await pool.query(
      `
      SELECT id, slug, name, niche, group_code, status
      FROM target_groups
      WHERE niche = $1
        AND status = 'active'
      ORDER BY id ASC
      LIMIT 1
      `,
      [niche]
    );

    if (groupResult.rows.length === 0) {
      groupResult = await pool.query(
        `
        SELECT id, slug, name, niche, group_code, status
        FROM target_groups
        WHERE niche = 'geral'
          AND status = 'active'
        ORDER BY id ASC
        LIMIT 1
        `
      );
    }

    const group = groupResult.rows[0] || null;

    return res.json({
      matched: !!origin,
      origin,
      niche,
      group: group
        ? {
            ...group,
            web: `${BASE_LINK_URL}/${group.slug}`,
          }
        : null,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao resolver origem",
      detail: error.message,
    });
  }
});

/**
 * =========================
 * REDIRECT POR SLUG
 * =========================
 *
 * Exemplo:
 * GET /r/pet
 */
app.get("/r/:slug", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT slug, name, niche, group_code, status
      FROM target_groups
      WHERE slug = $1
        AND status = 'active'
      LIMIT 1
      `,
      [req.params.slug]
    );

    if (rows.length === 0) {
      return res.status(404).send("Grupo não encontrado");
    }

    const group = rows[0];
    return res.redirect(`${BASE_LINK_URL}/${group.slug}`);
  } catch (error) {
    return res.status(500).send("Erro interno ao redirecionar");
  }
});

/**
 * 404 API
 */
app.use("/api", (req, res) => {
  return res.status(404).json({ error: "Endpoint não encontrado" });
});

/**
 * Start
 */
initDb()
  .then(async () => {
    try {
      await pool.query("SELECT 1");
      console.log("✅ Conexão com PostgreSQL OK");
    } catch (error) {
      console.error("❌ Falha no teste de conexão com PostgreSQL:", error.message);
      process.exit(1);
    }

    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`🌐 Admin: /admin`);
      console.log(`🩺 Health: /health`);
    });
  })
  .catch((err) => {
    console.error("❌ Erro ao inicializar banco:", err);
    process.exit(1);
  });
