/**
 * @description: 加密内核 - 网易云 weapi (AES-128-CBC + RSA-2048) 与百度 (AES-128-CBC)
 *               严格等价于 plugns/Meting.php 中的 netease_AESCBC / baidu_AESCBC
 *               使用 Web Crypto API + BigInt，零依赖，可在 EdgeOne Functions / Cloudflare Workers / Node 20+ 直接运行
 * @author: UG - 一个斗码大陆苦逼的三段码之气的少年，并没有神秘戒指中码老的帮助，但总有一天，我会成为斗码大陆中码帝一样的存在。三十年河东，三十年河西，莫欺少年穷。
 * @date: 2026-04-25
 */

// ==================== 常量 ====================

// 网易云加密常量（与 Meting.php:1084-1087 对齐）
export const NETEASE_NONCE = '0CoJUm6Qyw8W8jud';
export const NETEASE_VI = '0102030405060708';
export const NETEASE_PUBKEY = 65537n;
export const NETEASE_MODULUS =
  157794750267131502212476817800345498121872783333389747424011531025366277535262539913701806290766479189477533597854989606803194253978660329941980786072432806427833685472618792592200595694346872951301770580765135349259590167490536138082469680638514416594216629258349130257685001248172188325316586707301643237607n;

// 百度加密常量（与 Meting.php:1128-1129 对齐）
export const BAIDU_KEY = 'DBEECF8C50FD160E';
export const BAIDU_VI = '1231021386755796';

// ==================== 工具函数 ====================

const _encoder = new TextEncoder();

function utf8Encode(str) {
  return _encoder.encode(str);
}

function bytesToBase64(bytes) {
  let bin = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function bytesToHex(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i].toString(16).padStart(2, '0');
  }
  return s;
}

// ==================== AES-128-CBC ====================

/**
 * AES-128-CBC 加密，等价于 PHP openssl_encrypt($data, 'aes-128-cbc', $key, false, $iv)
 * 第 4 个参数 false 表示返回 base64 编码字符串
 * @param {string} plaintext 明文（任意 UTF-8 字符串）
 * @param {string} keyStr 16 字节 ASCII 密钥
 * @param {string} ivStr 16 字节 ASCII IV
 * @returns {Promise<string>} Base64 编码的密文
 */
export async function aesCbcEncrypt(plaintext, keyStr, ivStr) {
  const keyBytes = utf8Encode(keyStr);
  const ivBytes = utf8Encode(ivStr);
  const dataBytes = utf8Encode(plaintext);

  if (keyBytes.length !== 16) throw new Error(`AES key must be 16 bytes, got ${keyBytes.length}`);
  if (ivBytes.length !== 16) throw new Error(`AES IV must be 16 bytes, got ${ivBytes.length}`);

  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-CBC' },
    false,
    ['encrypt'],
  );
  const encrypted = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: ivBytes },
    cryptoKey,
    dataBytes,
  );
  return bytesToBase64(new Uint8Array(encrypted));
}

// ==================== RSA-2048 模幂 ====================

/**
 * 模幂运算 base^exp mod m，等价于 PHP bcpowmod
 */
export function modPow(base, exp, mod) {
  let result = 1n;
  base = ((base % mod) + mod) % mod;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod;
    exp >>= 1n;
    base = (base * base) % mod;
  }
  return result;
}

/**
 * 网易云 skey 的 textbook RSA 加密
 * 等价于 Meting.php:1107-1112:
 *   $skey = strrev(utf8_encode($skey));
 *   $skey = bchexdec(str2hex($skey));
 *   $skey = bcpowmod($skey, $pubkey, $modulus);
 *   $skey = bcdechex($skey);
 *   $skey = str_pad($skey, 256, '0', STR_PAD_LEFT);
 */
export function rsaEncrypt(text, pubkey = NETEASE_PUBKEY, modulus = NETEASE_MODULUS) {
  const reversed = text.split('').reverse().join('');
  const bytes = utf8Encode(reversed);
  const hex = bytesToHex(bytes);
  const num = BigInt('0x' + hex);
  const encrypted = modPow(num, pubkey, modulus);
  return encrypted.toString(16).padStart(256, '0');
}

// ==================== 随机密钥 ====================

const RANDOM_HEX_CHARS = '0123456789abcdef';

/**
 * 生成 16 字符随机 hex 字符串（等价于 PHP getRandomHex(16)）
 * 用作网易云 weapi 的临时 AES 密钥 skey
 */
export function getRandomKey() {
  const buf = new Uint8Array(16);
  globalThis.crypto.getRandomValues(buf);
  let s = '';
  for (let i = 0; i < 16; i++) {
    s += RANDOM_HEX_CHARS[buf[i] & 0x0f];
  }
  return s;
}

// ==================== 网易云 weapi 加密主函数 ====================

/**
 * 网易云 weapi 请求体加密，等价于 Meting.php netease_AESCBC
 * @param {object} body 请求体对象（会做 JSON.stringify）
 * @returns {Promise<{params: string, encSecKey: string}>}
 */
export async function neteaseEncrypt(body) {
  const skey = getRandomKey();
  const bodyStr = JSON.stringify(body);
  const layer1 = await aesCbcEncrypt(bodyStr, NETEASE_NONCE, NETEASE_VI);
  const layer2 = await aesCbcEncrypt(layer1, skey, NETEASE_VI);
  const encSecKey = rsaEncrypt(skey);
  return { params: layer2, encSecKey };
}

// ==================== 百度加密 ====================

/**
 * 百度 songlink 加密，等价于 Meting.php baidu_AESCBC
 * @param {string|number} songid
 * @returns {Promise<string>} Base64 编码的 e 参数
 */
export async function baiduEncrypt(songid) {
  const data = `songid=${songid}&ts=${Date.now()}`;
  return await aesCbcEncrypt(data, BAIDU_KEY, BAIDU_VI);
}

// ==================== 网易云歌曲 ID 混淆（pic_id 用） ====================

/**
 * 网易云图片 ID 混淆（用于歌曲封面）
 * 等价于 Meting.php netease_encryptId
 */
export function neteaseEncryptId(id) {
  const magic = '3go8&$8*3*3h0k(2)2';
  const idStr = String(id);
  let mixed = '';
  for (let i = 0; i < idStr.length; i++) {
    mixed += String.fromCharCode(idStr.charCodeAt(i) ^ magic.charCodeAt(i % magic.length));
  }
  // MD5(mixed, raw) → base64 → 把 / + 换成 _ -
  // 注意：Web Crypto API 不支持 MD5，需要外部 MD5 实现
  // 这里抛出错误提示 P2 阶段补 MD5
  throw new Error('neteaseEncryptId requires MD5; implement in P2 with crypto-md5.js');
}
