# Relâmpago Manager

Aplicação Node.js com Express + PostgreSQL para cadastro e manutenção de:
- origens de mensagens
- grupos de destino

Também inclui:
- endpoint para resolver o grupo correto pelo `origin_key`
- página admin para cadastro/manutenção
- redirect por slug

## Requisitos

- Node.js 18+
- PostgreSQL

## 1. Configurar ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite os dados do banco.

## 2. Criar banco e tabelas

No PostgreSQL da VPS, rode o script:

```bash
psql -U postgres -d relampago -f db/schema.sql
```

## 3. Instalar dependências

```bash
npm install
```

## 4. Rodar aplicação

```bash
npm start
```

Servidor padrão:

```text
http://localhost:3000
```

Painel admin:

```text
http://localhost:3000/admin
```

## Endpoints

### Health

```http
GET /api/health
```

### Origens

```http
GET /api/origins
POST /api/origins
PUT /api/origins/:id
DELETE /api/origins/:id
```

Body exemplo:

```json
{
  "origin_key": "origem_pet",
  "name": "Origem Pet",
  "niche": "pet",
  "status": "active"
}
```

### Grupos

```http
GET /api/groups
POST /api/groups
PUT /api/groups/:id
DELETE /api/groups/:id
GET /api/groups/slug/:slug
```

Body exemplo:

```json
{
  "slug": "pet",
  "name": "Grupo Pet",
  "niche": "pet",
  "group_code": "120363424011546207@g.us",
  "status": "active"
}
```

### Resolver grupo a partir da origem

```http
GET /api/resolve?origin_key=origem_pet
```

Resposta exemplo:

```json
{
  "matched": true,
  "niche": "pet",
  "origin": {
    "id": 2,
    "origin_key": "origem_pet",
    "name": "Origem Pet",
    "niche": "pet",
    "status": "active"
  },
  "group": {
    "id": 2,
    "slug": "pet",
    "name": "Grupo Pet",
    "niche": "pet",
    "group_code": "120363424011546208@g.us",
    "status": "active",
    "web": "https://link.relampagodeofertas.shop/pet"
  }
}
```

### Redirect por slug

```http
GET /r/pet
```

## Como usar no n8n

No node HTTP Request:

```text
GET https://seu-dominio/api/resolve?origin_key={{ $json.origin_key }}
```

Depois use:
- `{{$json.group.niche}}`
- `{{$json.group.group_code}}`
- `{{$json.group.web}}`

## Deploy na VPS

Sugestão:
- subir os arquivos via Git ou SFTP
- instalar dependências
- configurar `.env`
- criar as tabelas com `db/schema.sql`
- rodar com PM2, systemd ou EasyPanel

Exemplo com PM2:

```bash
npm install -g pm2
pm2 start server.js --name relampago-manager
pm2 save
pm2 startup
```
