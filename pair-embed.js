const ALPHA = 'abcdefghijklmnopqrstuvwxyz';
const enc = new TextEncoder();

const FOLDS = {
  none: (s) => s,
  latin: (s) => s.replaceAll('u', 'v').replaceAll('w', 'vv').replaceAll('j', 'i'),
};

const norm2 = (v) => {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  return s;
};

const l2 = (v) => {
  const s = norm2(v);
  if (!s) return v;
  const inv = 1 / Math.sqrt(s);
  for (let i = 0; i < v.length; i++) v[i] *= inv;
  return v;
};

const cosine = (a, b) => {
  let d = 0, x = 0, y = 0;
  for (let i = 0; i < a.length; i++) {
    d += a[i] * b[i];
    x += a[i] * a[i];
    y += b[i] * b[i];
  }
  return x && y ? d / Math.sqrt(x * y) : 0;
};

const fnv = (...arrays) => {
  let h = 0x811c9dc5;
  for (const a of arrays) {
    const bytes = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
    for (let i = 0; i < bytes.length; i++) {
      h ^= bytes[i];
      h = Math.imul(h, 0x01000193);
    }
  }
  return (h >>> 0).toString(16);
};

const makeEmbedder = ({ name, fold = 'none', ordered = true, alpha = 0.7, stats = null }) => {
  const foldFn = FOLDS[fold];
  const letters = [...ALPHA].filter((c) => fold !== 'latin' || !'uwj'.includes(c));
  const L = letters.length;
  const slot = new Map(letters.map((c, i) => [c, i]));
  const pairDim = ordered ? L * L : (L * (L + 1)) / 2;
  const dim = pairDim + 256;
  const sP = Math.sqrt(alpha);
  const sB = Math.sqrt(1 - alpha);

  const pairIdx = (a, b) => {
    if (ordered) return a * L + b;
    if (a > b) [a, b] = [b, a];
    return a * L - (a * (a - 1)) / 2 + (b - a);
  };

  const count = (str) => {
    const out = new Float32Array(dim);
    const text = foldFn(str.toLowerCase());
    let prev = -1;
    for (let i = 0; i < text.length; i++) {
      const s = slot.get(text[i]);
      if (s !== undefined && prev !== -1) out[pairIdx(prev, s)]++;
      prev = s === undefined ? -1 : s;
    }
    const bytes = enc.encode(str);
    for (let i = 0; i < bytes.length; i++) out[pairDim + bytes[i]]++;
    return out;
  };

  // sublinear tf, optional idf, then L2 per block
  const weigh = (raw, idf) => {
    for (let i = 0; i < dim; i++) {
      if (raw[i]) raw[i] = Math.log1p(raw[i]) * (idf ? idf[i] : 1);
    }
    l2(raw.subarray(0, pairDim));
    l2(raw.subarray(pairDim));
    return raw;
  };

  // subtract corpus mean per block, skipping blocks with no signal
  const center = (v, mean) => {
    for (const [lo, hi] of [[0, pairDim], [pairDim, dim]]) {
      const block = v.subarray(lo, hi);
      if (!norm2(block)) continue;
      for (let i = 0; i < block.length; i++) block[i] -= mean[lo + i];
      l2(block);
    }
    return v;
  };

  const embed = (str) => {
    const v = weigh(count(str), stats && stats.idf);
    if (stats) center(v, stats.mean);
    for (let i = 0; i < pairDim; i++) v[i] *= sP;
    for (let i = pairDim; i < dim; i++) v[i] *= sB;
    return v;
  };

  const fit = (corpus) => {
    const n = corpus.length;
    if (!n) throw new Error('fit needs a non-empty corpus');
    const raws = corpus.map(count);
    const df = new Float32Array(dim);
    for (const r of raws) for (let i = 0; i < dim; i++) if (r[i]) df[i]++;
    const idf = df.map((d) => Math.log((n + 1) / (d + 1)) + 1);
    const acc = new Float64Array(dim);
    for (const r of raws) {
      weigh(r, idf);
      for (let i = 0; i < dim; i++) acc[i] += r[i] / n;
    }
    return makeEmbedder({
      name, fold, ordered, alpha,
      stats: { idf, mean: Float32Array.from(acc) },
    });
  };

  const fingerprint =
    `lex1|${name}|fold=${fold}|ordered=${ordered}|alpha=${alpha}|dim=${dim}|` +
    (stats ? fnv(stats.idf, stats.mean) : 'unfit');

  return { name, dim, fingerprint, embed, fit };
};

const variants = {
  pair:           makeEmbedder({ name: 'pair' }),                                          // 932
  pairSmall:      makeEmbedder({ name: 'pairSmall', ordered: false }),                     // 607
  pairLatin:      makeEmbedder({ name: 'pairLatin', fold: 'latin' }),                      // 785
  pairLatinSmall: makeEmbedder({ name: 'pairLatinSmall', fold: 'latin', ordered: false }), // 532
};
