# Edge Embed - Cloudflare Worker

Cloudflare Worker expose `edgeEmbed` fn as API, match Cloudflare Workers AI embedding schema.

Example host: https://edge-embed.language-models.workers.dev/

## API Schema

### GET
```
GET /?text=your+text+to+embed
GET /?text=hello,world,test
```

**Params:**
- `text` (required) — string or comma-separated strings

### POST
```json
POST /
Content-Type: application/json

{ "text": "your text to embed" }
```
or array:
```json
{ "text": ["hello", "world", "test"] }
```

### Response — single
```json
{ "shape": [512], "data": [...512 floats] }
```

### Response — multi
```json
{
  "shape": [3, 512],
  "data": [[...], [...], [...]]
}
```

## Setup

```bash
npm install -g @cloudflare/wrangler
npm install
```

Configure `wrangler.toml`: set `route`, add `zone_id` for prod.

## Development

```bash
npm run dev
```

GET:
```bash
curl "http://localhost:8787?text=hello%20world"
curl "http://localhost:8787?text=hello,world,test"
```

POST:
```bash
curl -X POST http://localhost:8787 -H "Content-Type: application/json" -d '{"text": "hello world"}'
curl -X POST http://localhost:8787 -H "Content-Type: application/json" -d '{"text": ["hello", "world", "test"]}'
```

## Deploy

```bash
npm run deploy
```

## How It Works

`edgeEmbed` combine two strategy, each 256-dim, interleave → 512-dim vector:
1. **bitEmbed** — histogram UTF-8 byte values, normalize by length
2. **codeEmbed** — histogram Unicode code points mod 256, normalize by length

Empty string → zero vector, no div-by-zero.
