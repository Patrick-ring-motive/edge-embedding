class NumberArray extends Array {
  constructor(...args) {
    const arr = super(...args);
    const len = arr.length;
    for (let i = 0; i !== len; ++i) {
      arr[i] = +arr[i] || 0;
    }
    return arr;
  }
}

const types = {
  int8: {
    array: Uint8Array,
    max: 255
  },
  int16: {
    array: Uint16Array,
    max: 65535
  },
  int32: {
    array: Uint32Array,
    max: 4294967295
  },
  int64: {
    array: BigUint64Array,
    max: Infinity
  },
  float16: {
    array: Float16Array,
    max: 65504,
    strat: "dim"
  },
  float32: {
    array: Float32Array,
    max: Infinity
  },
  float64: {
    array: Float64Array,
    max: Infinity
  },
  default: {
    array: NumberArray,
    max: Infinity
  }
}

const encode = TextEncoder.prototype.encode.bind(new TextEncoder());

const strats = {
  clamp: (num, max) => Math.min(num, max),
  mod: (num, max) => num % (max + 1),
  dim: (num, max) => num < (max + 1) ? num : (num + max) / 2
}

const bitEmbed = (str, options) => {
  const type = types[String(options?.type).toLowerCase()] || types.default;
  const {
    array,
    max
  } = type;
  const strat = strats[options?.strat || type.strat] || strats.clamp;
  const embed = new array(256);
  const bits = encode(str);
  const len = bits.length;
  for (let i = 0; i !== len; ++i) {
    const bit = bits[i];
    embed[bit] = strat(embed[bit] + 1, max);
  }
  return embed;
};

const codeEmbed = (str, options) => {
  const type = types[String(options?.type).toLowerCase()] || types.default;
  const {
    array,
    max
  } = type;
  const strat = strats[options?.strat || type.strat] || strats.clamp;
  const embed = new array(256);
  const arr = [...str];
  const len = arr.length;
  for (let i = 0; i !== len; ++i) {
    const slot = (arr[i].codePointAt(0) % 256);
    embed[slot] = strat(embed[slot] + 1, max);
  }
  return embed;
};

const edgeEmbed = (str, options) => {
  const a = bitEmbed(str, options);
  const b = codeEmbed(str, options);
  const zip = a.map((x, i) => [x, b[i]]).flat();
  const out = new(types[String(options?.type).toLowerCase()]?.array || NumberArray)(512);
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

        type = url.searchParams.get('type');
      } else if (request.method === 'POST') {
        // Extract from JSON body
        const body = await request.json();
        text = body.text;
        type = body.type;
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
      const embeddingType = type;

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
      const embeddings = textArray.map(t => Array.from(edgeEmbed(t, {
        type: embeddingType
      })));

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
