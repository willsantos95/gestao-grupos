require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = Number(process.env.PORT || 3000);
const BASE_LINK_URL = (process.env.BASE_LINK_URL || 'https://link.relampagodeofertas.shop').replace(/\/$/, '');
const ADMIN_TITLE = process.env.ADMIN_TITLE || 'Relâmpago Manager';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  res.setHeader('X-App-Name', ADMIN_TITLE);
  next();
});

function buildWebLink(slug) {
  return `${BASE_LINK_URL}/${slug}`;
}

function normalizeStatus(value) {
  return value === 'inactive' ? 'inactive' : 'active';
}

function normalizeNiche(value) {
  return String(value || '').trim().toLowerCase();
}

async function healthDb() {
  await pool.query('SELECT 1');
}

app.get('/api/health', async (req, res) => {
  try {
    await healthDb();
    res.json({ ok: true, db: true, app: ADMIN_TITLE });
  } catch (error) {
    res.status(500).json({ ok: false, db: false, error: error.message });
  }
});

app.get('/api/meta', (req, res) => {
  res.json({
    appTitle: ADMIN_TITLE,
    baseLinkUrl: BASE_LINK_URL,
    niches: ['geral', 'pet', 'bebe'],
    statuses: ['active', 'inactive'],
  });
});

app.get('/api/origins', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, origin_key, name, niche, status, created_at, updated_at
       FROM message_origins
       ORDER BY id DESC`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar origens', detail: error.message });
  }
});

app.post('/api/origins', async (req, res) => {
  const originKey = String(req.body.origin_key || '').trim();
  const name = String(req.body.name || '').trim();
  const niche = normalizeNiche(req.body.niche);
  const status = normalizeStatus(req.body.status);

  if (!originKey || !name || !niche) {
    return res.status(400).json({ error: 'Campos obrigatórios: origin_key, name e niche' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO message_origins (origin_key, name, niche, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, origin_key, name, niche, status, created_at, updated_at`,
      [originKey, name, niche, status]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    const code = error.code === '23505' ? 409 : 500;
    res.status(code).json({ error: 'Erro ao criar origem', detail: error.message });
  }
});

app.put('/api/origins/:id', async (req, res) => {
  const id = Number(req.params.id);
  const originKey = String(req.body.origin_key || '').trim();
  const name = String(req.body.name || '').trim();
  const niche = normalizeNiche(req.body.niche);
  const status = normalizeStatus(req.body.status);

  if (!id || !originKey || !name || !niche) {
    return res.status(400).json({ error: 'Campos obrigatórios: origin_key, name e niche' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE message_origins
          SET origin_key = $1,
              name = $2,
              niche = $3,
              status = $4,
              updated_at = NOW()
        WHERE id = $5
      RETURNING id, origin_key, name, niche, status, created_at, updated_at`,
      [originKey, name, niche, status, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Origem não encontrada' });
    }

    res.json(rows[0]);
  } catch (error) {
    const code = error.code === '23505' ? 409 : 500;
    res.status(code).json({ error: 'Erro ao atualizar origem', detail: error.message });
  }
});

app.delete('/api/origins/:id', async (req, res) => {
  const id = Number(req.params.id);

  try {
    const { rows } = await pool.query(
      `DELETE FROM message_origins WHERE id = $1 RETURNING id, origin_key, name, niche, status`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Origem não encontrada' });
    }

    res.json({ success: true, removed: rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir origem', detail: error.message });
  }
});

app.get('/api/groups', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, slug, name, niche, group_code, status, created_at, updated_at
       FROM target_groups
       ORDER BY id DESC`
    );
    res.json(rows.map(row => ({ ...row, web: buildWebLink(row.slug) })));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar grupos', detail: error.message });
  }
});

app.post('/api/groups', async (req, res) => {
  const slug = String(req.body.slug || '').trim().toLowerCase();
  const name = String(req.body.name || '').trim();
  const niche = normalizeNiche(req.body.niche);
  const groupCode = String(req.body.group_code || '').trim();
  const status = normalizeStatus(req.body.status);

  if (!slug || !name || !niche || !groupCode) {
    return res.status(400).json({ error: 'Campos obrigatórios: slug, name, niche e group_code' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO target_groups (slug, name, niche, group_code, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, slug, name, niche, group_code, status, created_at, updated_at`,
      [slug, name, niche, groupCode, status]
    );
    res.status(201).json({ ...rows[0], web: buildWebLink(rows[0].slug) });
  } catch (error) {
    const code = error.code === '23505' ? 409 : 500;
    res.status(code).json({ error: 'Erro ao criar grupo', detail: error.message });
  }
});

app.put('/api/groups/:id', async (req, res) => {
  const id = Number(req.params.id);
  const slug = String(req.body.slug || '').trim().toLowerCase();
  const name = String(req.body.name || '').trim();
  const niche = normalizeNiche(req.body.niche);
  const groupCode = String(req.body.group_code || '').trim();
  const status = normalizeStatus(req.body.status);

  if (!id || !slug || !name || !niche || !groupCode) {
    return res.status(400).json({ error: 'Campos obrigatórios: slug, name, niche e group_code' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE target_groups
          SET slug = $1,
              name = $2,
              niche = $3,
              group_code = $4,
              status = $5,
              updated_at = NOW()
        WHERE id = $6
      RETURNING id, slug, name, niche, group_code, status, created_at, updated_at`,
      [slug, name, niche, groupCode, status, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Grupo não encontrado' });
    }

    res.json({ ...rows[0], web: buildWebLink(rows[0].slug) });
  } catch (error) {
    const code = error.code === '23505' ? 409 : 500;
    res.status(code).json({ error: 'Erro ao atualizar grupo', detail: error.message });
  }
});

app.delete('/api/groups/:id', async (req, res) => {
  const id = Number(req.params.id);

  try {
    const { rows } = await pool.query(
      `DELETE FROM target_groups WHERE id = $1 RETURNING id, slug, name, niche, group_code, status`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Grupo não encontrado' });
    }

    res.json({ success: true, removed: rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir grupo', detail: error.message });
  }
});

app.get('/api/groups/slug/:slug', async (req, res) => {
  const slug = String(req.params.slug || '').trim().toLowerCase();

  try {
    const { rows } = await pool.query(
      `SELECT id, slug, name, niche, group_code, status, created_at, updated_at
       FROM target_groups
       WHERE slug = $1
       LIMIT 1`,
      [slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Grupo não encontrado' });
    }

    res.json({ ...rows[0], web: buildWebLink(rows[0].slug) });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar grupo por slug', detail: error.message });
  }
});

app.get('/api/resolve', async (req, res) => {
  const originKey = String(req.query.origin_key || '').trim();

  try {
    let origin = null;
    let niche = 'geral';

    if (originKey) {
      const originResult = await pool.query(
        `SELECT id, origin_key, name, niche, status
         FROM message_origins
         WHERE origin_key = $1 AND status = 'active'
         LIMIT 1`,
        [originKey]
      );

      if (originResult.rows.length > 0) {
        origin = originResult.rows[0];
        niche = origin.niche;
      }
    }

    let groupResult = await pool.query(
      `SELECT id, slug, name, niche, group_code, status
       FROM target_groups
       WHERE niche = $1 AND status = 'active'
       ORDER BY id ASC
       LIMIT 1`,
      [niche]
    );

    if (groupResult.rows.length === 0) {
      groupResult = await pool.query(
        `SELECT id, slug, name, niche, group_code, status
         FROM target_groups
         WHERE niche = 'geral' AND status = 'active'
         ORDER BY id ASC
         LIMIT 1`
      );
    }

    const group = groupResult.rows[0] || null;

    res.json({
      matched: !!origin,
      niche,
      origin,
      group: group ? { ...group, web: buildWebLink(group.slug) } : null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao resolver origem', detail: error.message });
  }
});

app.get('/r/:slug', async (req, res) => {
  const slug = String(req.params.slug || '').trim().toLowerCase();

  try {
    const { rows } = await pool.query(
      `SELECT slug, status FROM target_groups WHERE slug = $1 LIMIT 1`,
      [slug]
    );

    if (rows.length === 0 || rows[0].status !== 'active') {
      return res.status(404).send('Grupo não encontrado ou inativo.');
    }

    return res.redirect(buildWebLink(rows[0].slug));
  } catch (error) {
    res.status(500).send('Erro ao redirecionar.');
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.listen(port, () => {
  console.log(`${ADMIN_TITLE} rodando na porta ${port}`);
});
