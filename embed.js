const encode = TextEncoder.prototype.encode.bind(new TextEncoder());
const segmenter = Intl.Segmenter.prototype.segment.bind(new Intl.Segmenter("en", { granularity: "grapheme" }));
const segment = x => [...segmenter(x)].map(x=>x.segment);
const BigNumber = BigInt(Number.MAX_VALUE);
const getCode = x =>{
  if(!x)return 0;
  x = String(x);
  if(x.length === 1){
    return x.codePointAt(0);
  }
  x = x.normalize('NFC');
  if(x.length === 1){
    return x.codePointAt(0);
  }
  x = x.normalize('NFKC');
  if(x.length === 1){
    return x.codePointAt(0);
  }
  return Number(BigInt(x.split('').reverse().map(y=>y.codePointAt(0)).join('')) % BigNumber);
};

const bitEmbed = (str) => {
  const embed = Array(256).fill(0);
  const bits = encode(str);
  const len = bits.length;
  if (!len) return embed;
  for (let i = 0; i !== len; ++i) {
    const bit = bits[i];
    embed[bit] = Math.min(embed[bit] + 1, Number.MAX_VALUE);
  }
  return embed.map(x => x / len);
};

const charEmbed = (str) => {
  const embed = Array(256).fill(0);
  const arr = str.split('');
  const len = arr.length;
  if (!len) return embed;
  for (let i = 0; i !== len; ++i) {
    const slot = (getCode(arr[i]) % 256);
    embed[slot] = Math.min(embed[slot] + 1, Number.MAX_VALUE);
  }
  return embed.map(x => x / len);
};

const codeEmbed = (str) => {
  const embed = Array(256).fill(0);
  const arr = [...str];
  const len = arr.length;
  if (!len) return embed;
  for (let i = 0; i !== len; ++i) {
    const slot = (getCode(arr[i]) % 256);
    embed[slot] = Math.min(embed[slot] + 1, Number.MAX_VALUE);
  }
  return embed.map(x => x / len);
};

const graphemeEmbed = (str) => {
  const embed = Array(256).fill(0);
  const arr = segment(str);
  const len = arr.length;
  if (!len) return embed;
  for (let i = 0; i !== len; ++i) {
    const slot = (getCode(arr[i]) % 256);
    embed[slot] = Math.min(embed[slot] + 1, Number.MAX_VALUE);
  }
  return embed.map(x => x / len);
};

const edgeEmbed = (str, options) => {
  const bits = bitEmbed(str, options);
  const chars = charEmbed(str,options);
  const codes = codeEmbed(str, options);
  const graphemes = graphemeEmbed(str, options);
  const zip = bits.map((x, i) => [x, chars[i],codes[i],graphemes[i]]).flat();
  return Float32Array.from(zip);
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

const stringify = x =>{
  try{
    if(isString(x)){
      return String(x);
    }
    return String(JSON.stringify(x));
  }catch{
    return String(x);
  }
};

async function getRequestValue(request, key) {
  for (const parser of [
    r => r.clone().json(),
    async () => Object.fromEntries(new URL(request.url).searchParams),
    async r => Object.fromEntries(await r.clone().formData()),
    async r => Object.fromEntries(r.headers),
  ]) {
    try {
      const obj = await parser(request);
      if (Object.hasOwn(obj, key)) return obj[key];
    } catch {}
  }
}
// Cloudflare Worker handler
export default {
  edgeEmbed,
  async fetch(request, env, ctx) {
    try {
      let text, type;

      if (request.method === 'GET') {

        const url = new URL(request.url);
        const textParam = url.searchParams.get('text');

        text = textParam ? parseArray(textParam) : parseArray(await getRequestValue(request,'text'));

        if (text && text.length === 1) {
          text = text[0];
        }

      } else if (request.method === 'POST') {
        text = parseArray(await getRequestValue(request,'text'));
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

      if (!text){
        if(request.body){
          text = await request.text();
        }
      }
      
      if(!isString(text) && !isArray(text)) {
        text = stringify(text);
      }

      // Normalize to array for uniform processing
      const textArray = (isString(text) ? [text] : text).map(stringify);

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
