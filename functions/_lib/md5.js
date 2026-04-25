/**
 * @description: 纯 JS MD5 (RFC 1321) 实现 - 用于酷狗 url 二步 key 计算 (key=MD5(hash+'kgcloudv2'))
 *               Web Crypto API 不支持 MD5 (W3C 已弃用)，因此自实现
 *               支持 UTF-8 字符串输入；输出 32 字符小写 hex
 * @author: UG - 一个斗码大陆苦逼的三段码之气的少年，并没有神秘戒指中码老的帮助，但总有一天，我会成为斗码大陆中码帝一样的存在。三十年河东，三十年河西，莫欺少年穷。
 * @date: 2026-04-25
 */

const _encoder = new TextEncoder();

// 每轮位移量
const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

// 预计算 K 常量 K[i] = floor(2^32 * |sin(i+1)|)
const K = new Uint32Array(64);
for (let i = 0; i < 64; i++) {
  K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0;
}

function rotl(x, n) {
  return ((x << n) | (x >>> (32 - n))) >>> 0;
}

/**
 * MD5 哈希
 * @param {string|Uint8Array} input UTF-8 字符串或字节数组
 * @returns {string} 32 字符小写 hex 摘要
 */
export function md5(input) {
  const bytes = typeof input === 'string' ? _encoder.encode(input) : input;
  const len = bytes.length;
  // padding: bytes + 0x80 + 0..0 直到长度 ≡ 56 (mod 64), 加 8 字节小端长度
  const blockCount = Math.ceil((len + 9) / 64);
  const padded = new Uint8Array(blockCount * 64);
  padded.set(bytes);
  padded[len] = 0x80;
  const lenBits = BigInt(len) * 8n;
  for (let i = 0; i < 8; i++) {
    padded[blockCount * 64 - 8 + i] = Number((lenBits >> BigInt(i * 8)) & 0xffn);
  }

  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  const M = new Uint32Array(16);
  for (let block = 0; block < blockCount; block++) {
    const off = block * 64;
    for (let i = 0; i < 16; i++) {
      M[i] =
        (padded[off + i * 4] |
          (padded[off + i * 4 + 1] << 8) |
          (padded[off + i * 4 + 2] << 16) |
          (padded[off + i * 4 + 3] << 24)) >>>
        0;
    }

    let A = a, B = b, C = c, D = d;
    for (let i = 0; i < 64; i++) {
      let f, g;
      if (i < 16) {
        f = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        f = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        f = C ^ (B | ~D);
        g = (7 * i) % 16;
      }
      const temp = D;
      D = C;
      C = B;
      B = (B + rotl((A + (f >>> 0) + K[i] + M[g]) >>> 0, S[i])) >>> 0;
      A = temp;
    }
    a = (a + A) >>> 0;
    b = (b + B) >>> 0;
    c = (c + C) >>> 0;
    d = (d + D) >>> 0;
  }

  // 输出小端 hex
  return [a, b, c, d]
    .map((x) =>
      [x & 0xff, (x >>> 8) & 0xff, (x >>> 16) & 0xff, (x >>> 24) & 0xff]
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join(''),
    )
    .join('');
}
