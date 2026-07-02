# Edge Embed - Cloudflare Worker

A Cloudflare Worker that exposes the `edgeEmbed` function as an API, matching the Cloudflare Workers AI embedding model schema.

Example host: https://edge-embed.language-models.workers.dev/

## API Schema

### GET Request
```
# Single text
GET /?text=your+text+to+embed&type=float32

# Multiple texts (comma-separated)
GET /?text=hello,world,test&type=float32
```

**Parameters:**
- `text` (required) - Single string or comma-separated strings to embed
- `type` (optional) - Embedding type (default: `float32`)

### POST Request
```json
# Single text (string)
POST /
Content-Type: application/json

{
  "text": "your text to embed",
  "type": "float32"
}

# Multiple texts (array)
POST /
Content-Type: application/json

{
  "text": ["hello", "world", "test"],
  "type": "float32"
}
```

### Response - Single text
```json
{
  "shape": [512],
  "data": [array of 512 values]
}
```

### Response - Multiple texts
```json
{
  "shape": [3, 512],
  "data": [
    [512 values for "hello"],
    [512 values for "world"],
    [512 values for "test"]
  ]
}
```

## Setup

1. Install Wrangler CLI:
   ```bash
   npm install -g @cloudflare/wrangler
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure `wrangler.toml`:
   - Update the `route` with your actual domain
   - Add your Cloudflare `zone_id` for production deployment

## Development

Run the worker locally:
```bash
npm run dev
```

### GET Request Examples:

Single text:
```bash
curl "http://localhost:8787?text=hello%20world"
```

Multiple texts (comma-separated):
```bash
curl "http://localhost:8787?text=hello,world,test"
```

With custom type:
```bash
curl "http://localhost:8787?text=hello&type=int8"
```

### POST Request Examples:

Single text:
```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{"text": "hello world"}'
```

Multiple texts:
```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{"text": ["hello", "world", "test"]}'
```

With custom type:
```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{"text": ["hello", "world"], "type": "int16"}'
```

## Deployment

Deploy to Cloudflare:
```bash
npm run deploy
```

## Options

### Type Parameter
Supported embedding types (default: `float32`):
- `int8` - 8-bit integers (0-255)
- `int16` - 16-bit integers (0-65535)
- `int32` - 32-bit integers (0-4294967295)
- `int64` - 64-bit integers
- `float16` - 16-bit floats
- `float32` - 32-bit floats
- `float64` - 64-bit floats

Example:
```json
{
  "text": "your text",
  "type": "int8"
}
```

## How It Works

The `edgeEmbed` function combines two embedding strategies:
1. **bitEmbed**: Creates a 256-dimensional embedding based on UTF-8 byte values
2. **codeEmbed**: Creates a 256-dimensional embedding based on Unicode code points

The final embedding is a 512-dimensional vector formed by interleaving both strategies.
