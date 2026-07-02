const encode = TextEncoder.prototype.encode.bind(new TextEncoder());

const bitEmbed = (str) => {
  const embed = Array(256).fill(0);
  const bits = encode(str);
  const len = bits.length;
  if(!len)return embed;
  for (let i = 0; i !== len; ++i) {
    const bit = bits[i];
    embed[bit] = Math.min(embed[bit] + 1, Number.MAX_VALUE);
  }
  return embed.map(x=>x/len);
};

const codeEmbed = (str) => {
  const embed = Array(256).fill(0);
  const arr = [...str];
  const len = arr.length;
  if(!len)return embed;
  for (let i = 0; i !== len; ++i) {
    const slot = (arr[i].codePointAt(0) % 256);
    embed[slot] = Math.min(embed[slot] + 1,  Number.MAX_VALUE);
  }
  return embed.map(x=>x/len);
};

const edgeEmbed = (str, options) => {
  const a = bitEmbed(str, options);
  const b = codeEmbed(str, options);
  const zip = a.map((x, i) => [x, b[i]]).flat();
  const out = Array(512);
  zip.forEach((x, i) => {
    out[i] = x
  });
  return out;
};

const isString = x => typeof x === 'string' || x instanceof String;
const isArray = x => Array.isArray(x) || x instanceof Array;

const parseArray = x => {
  try {
    return JSON.parse(x).map(t => t.trim()).filter(Boolean);
  } catch {
    return String(x).split(',').map(t => t.trim()).filter(Boolean);
  }
};

const prettyPrint = x => {
  return JSON.stringify(x, null, 2);
};

// Cloudflare Worker handler
export default {
  async fetch(request, env, ctx) {
    try {
      let text, type;

      if (request.method === 'GET') {

        const url = new URL(request.url);
        const textParam = url.searchParams.get('text');

        text = textParam ? parseArray(textParam) : null;

        if (text && text.length === 1) {
          text = text[0];
        }
        
      } else if (request.method === 'POST') {
        // Extract from JSON body
        const body = await request.json();
        text = body.text;
      } else {
        return new Response(prettyPrint({
          error: 'Method not allowed. Use GET or POST.'
        }), {
          status: 405,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }

      // Validate text parameter
      if (!text || (!isString(text) && !isArray(text))) {
        return new Response(prettyPrint({
          error: 'Missing or invalid "text" parameter. Must be a string or array of strings.'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }

      // Normalize to array for uniform processing
      const textArray = isString(text) ? [text] : text;

      // Validate all items are strings
      if (!textArray.every(isString)) {
        return new Response(prettyPrint({
          error: 'All text values must be strings.'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }

      // Generate embeddings
      const embeddings = textArray.map(edgeEmbed);

      // Return response matching Cloudflare Workers AI schema
      const isSingle = isString(text);
      const response = {
        shape: isSingle ? [embeddings[0].length] : [embeddings.length, embeddings[0].length],
        data: isSingle ? embeddings[0] : embeddings
      };

      return new Response(prettyPrint(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });

    } catch (error) {
      return new Response(prettyPrint({
        error: 'Internal server error',
        message: error.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  }
};
