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
    max: 65504
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

const strats = {
  clamp = (num,max)=>Math.min(num,max),
  mod = (num,max)=>num % (max + 1),
  dim = (num,max)=>num < (max + 1) ? num : (num + max)/2;
}

const encode = TextEncoder.prototype.encode.bind(new TextEncoder());

const edgeEmbed = (str, options) => {
  const type = = types[String(options?.type).toLowerCase()] || types.default;
  const {
    array,
    max
  } = type;
  const embed = new array(256);
  const bits = encode(str);
  const len = bits.length;
  for (let i = 0; i !== len; ++i) {
    const bit = 255 - bits[i];
    embed[bit] = ((embed[bit] + 1) % max);
  }
  return embed;
};


