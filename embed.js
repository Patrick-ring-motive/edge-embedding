

const embed = (str)=>{
  const bits = new TextEncoder().encode(str);
  const embed = new Uint32Array(256);
  const len = bits.length;
  for(let i = 0;i !== len;++i){
    embed[bits[i]]++;
  }
  return embed;
};
