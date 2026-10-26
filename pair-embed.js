const alpha = String.fromCharCode(...[...Array(26).keys()].map(x => x + 97));
const latin = [...alpha].filter(x => !/[uwj]/.test(x)).join``;

const pairs = [...new Set([...alpha].map(x => [...alpha].map(y => y + x)).flat())];
const pairsSmall = [...new Set([...alpha].flatMap((x, i) => [...alpha].slice(i).map(y => x <= y ? x + y : y + x)))];
const pairsLatin = [...new Set([...latin].map(x => [...latin].map(y => y + x)).flat())];
const pairsLatinSmall = [...new Set([...latin].flatMap((x, i) => [...latin].slice(i).map(y => x <= y ? x + y : y + x)))];

const encode = TextEncoder.prototype.encode.bind(new TextEncoder());

const l2 = (v) => {
  const norm = Math.hypot(...v);
  return norm ? v.map(x => x / norm) : v;
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
  return l2(embed.map(Math.log1p));
};

const pairIndex = new Map(pairs.map((p, i) => [p, i]));
const pairSmallIndex = new Map(pairsSmall.map((p, i) => [p, i]));
const pairLatinIndex = new Map(pairsLatin.map((p, i) => [p, i]));
const pairLatinSmallIndex = new Map(pairsLatinSmall.map((p, i) => [p, i]));

const pairEmbed = (str) => {
  const counts = Array(pairs.length).fill(0);
  const text = str.toLowerCase();
  for (let i = 0; i < text.length - 1; ++i) {
    const idx = pairIndex.get(text[i] + text[i + 1]);
    if (idx !== undefined) ++counts[idx];
  }
  return [...l2(counts.map(Math.log1p)), ...bitEmbed(str)];
};

const pairEmbedSmall = (str) => {
  const counts = Array(pairsSmall.length).fill(0);
  const text = str.toLowerCase();
  for (let i = 0; i < text.length - 1; ++i) {
    const a = text[i];
    const b = text[i + 1];
    if (!/[a-z]/.test(a) || !/[a-z]/.test(b)) continue;
    const key = a < b ? a + b : b + a;
    const idx = pairSmallIndex.get(key);
    if (idx !== undefined) ++counts[idx];
  }
  return [...l2(counts.map(Math.log1p)), ...bitEmbed(str)];
};

const pairLatinEmbed = (str) => {
  const counts = Array(pairsLatin.length).fill(0);
  const text = str.toLowerCase()
    .replaceAll('u', 'v')
    .replaceAll('w', 'vv')
    .replaceAll('j', 'i');
  for (let i = 0; i < text.length - 1; ++i) {
    const idx = pairLatinIndex.get(text[i] + text[i + 1]);
    if (idx !== undefined) ++counts[idx];
  }
  return [...l2(counts.map(Math.log1p)), ...bitEmbed(str)];
};

const pairLatinEmbedSmall = (str) => {
  const counts = Array(pairsLatinSmall.length).fill(0);
  const text = str.toLowerCase()
    .replaceAll('u', 'v')
    .replaceAll('w', 'vv')
    .replaceAll('j', 'i');
  for (let i = 0; i < text.length - 1; ++i) {
    const a = text[i];
    const b = text[i + 1];
    if (!/[a-z]/.test(a) || !/[a-z]/.test(b)) continue;
    const key = a < b ? a + b : b + a;
    const idx = pairLatinSmallIndex.get(key);
    if (idx !== undefined) ++counts[idx];
  }
  return [...l2(counts.map(Math.log1p)), ...bitEmbed(str)];
};
