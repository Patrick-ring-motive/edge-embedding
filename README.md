# Edge Embed - Cloudflare Worker

Edge Embed is a lightweight, deterministic embedding model implemented entirely in JavaScript and deployed as a Cloudflare Worker. It exposes the `edgeEmbed()` function as an HTTP API and returns responses compatible with the Cloudflare Workers AI embedding schema.

Example deployment:

https://edge-embed.language-models.workers.dev/

---

# API

The API accepts input from multiple locations, checked in the following order:

1. JSON request body
2. URL query parameters
3. Form data
4. Request headers

The value of `text` may be:

* a string
* a JSON array of strings
* a comma-separated list

---

## GET

```http
GET /?text=hello%20world
GET /?text=hello,world,test
GET /?text=["hello","world","test"]
```

---

## POST

JSON

```http
POST /
Content-Type: application/json
```

```json
{
  "text": "hello world"
}
```

or

```json
{
  "text": [
    "hello",
    "world",
    "test"
  ]
}
```

Form data

```http
POST /
Content-Type: application/x-www-form-urlencoded
```

```
text=hello world
```

Multipart form data is also supported.

---

## Responses

### Single input

```json
{
  "shape": [1024],
  "data": [
    ...
  ]
}
```

### Multiple inputs

```json
{
  "shape": [3,1024],
  "data": [
    [...],
    [...],
    [...]
  ]
}
```

The response format matches the Cloudflare Workers AI embedding API.

---

# Development

Install Wrangler:

```bash
npm install -g @cloudflare/wrangler
```

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Examples

GET

```bash
curl "http://localhost:8787?text=hello%20world"

curl "http://localhost:8787?text=hello,world,test"

curl "http://localhost:8787?text=[\"hello\",\"world\"]"
```

POST

```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{"text":"hello world"}'
```

```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{"text":["hello","world","test"]}'
```

---

# Deployment

Configure your `wrangler.toml` as desired (route, zone ID, compatibility date, etc.), then deploy:

```bash
npm run deploy
```

---

# Embedding Algorithm

Edge Embed builds a deterministic 1024-dimensional embedding by combining four independent 256-dimensional histograms.

Each histogram is normalized by the length of the input before being interleaved into the final vector.

## 1. Byte embedding (`bitEmbed`)

Counts UTF-8 byte frequencies (0–255).

Captures encoding-level similarity and works well for arbitrary binary text.

---

## 2. UTF-16 embedding (`charEmbed`)

Counts UTF-16 code units modulo 256.

This preserves characteristics of JavaScript's native string representation.

---

## 3. Unicode code point embedding (`codeEmbed`)

Counts Unicode code points modulo 256.

Unlike `charEmbed`, surrogate pairs are treated as a single Unicode character.

---

## 4. Grapheme embedding (`graphemeEmbed`)

Segments text into grapheme clusters using `Intl.Segmenter` and hashes each grapheme into one of 256 buckets.

This captures user-perceived characters such as:

* emoji
* accented letters
* combining marks
* zero-width joiner sequences

---

The four normalized histograms are interleaved to produce a fixed-length 1024-dimensional embedding.

The algorithm is:

* deterministic
* language agnostic
* zero-allocation aside from the output vector
* requires no model files
* requires no network access
* runs entirely at the edge

Empty input produces a zero vector.
