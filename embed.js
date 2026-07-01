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
    const bit = 255 - bits[i];
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
    const slot = 255 - (arr[i].codePointAt() % 256);
    embed[slot] = strat(embed[slot] + 1, max);
  }
  return embed;
};

const edgeEmbed = (str, options) => {
  const a = bitEmbed(str, options);
  const b = codeEmbed(str, options);
  const zip = a.map((x,i)=>[x.b[i]]);
  const out = new(types[String(options?.type).toLowerCase()]?.array || NumberArray)(512);
  zip.forEach((x,i)=>{out[i]=x});
  return out;
};
