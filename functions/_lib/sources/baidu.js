/**
 * @description: 百度音乐 fetcher - url(AES 加密 e 参数) / search / lyric / pic
 *               对齐 Meting.php case 'baidu'，e 参数走 baidu_AESCBC
 * @author: UG - 一个斗码大陆苦逼的三段码之气的少年，并没有神秘戒指中码老的帮助，但总有一天，我会成为斗码大陆中码帝一样的存在。三十年河东，三十年河西，莫欺少年穷。
 * @date: 2026-04-25
 */

import { aesCbcEncrypt, BAIDU_KEY, BAIDU_VI } from '../crypto.js';

function randomHex(len) {
  const chars = '0123456789abcdef';
  const buf = new Uint8Array(len);
  globalThis.crypto.getRandomValues(buf);
  let s = '';
  for (let i = 0; i < len; i++) s += chars[buf[i] & 0xf];
  return s;
}

// 与 Meting.php:1015-1022 对齐
function buildHeaders() {
  return {
    Cookie: 'BAIDUID=' + randomHex(32) + ':FG=1',
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) baidu-music/1.2.1 Chrome/66.0.3359.181 Electron/3.0.5 Safari/537.36',
    Accept: '*/*',
    'Content-type': 'application/json;charset=UTF-8',
    'Accept-Language': 'zh-CN',
  };
}

const BASE_URL = 'http://musicapi.taihe.com/v1/restserver/ting';

async function fetchJson(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { ...buildHeaders(), ...(init.headers || {}) } });
  if (!res.ok) throw new Error(`baidu ${url} HTTP ${res.status}`);
  return await res.json();
}

/**
 * 获取播放链接（Meting.php:720-734 + baidu_url:1359-1391）
 * 关键：e 参数 = AES('songid=ID&ts=毫秒时间戳', BAIDU_KEY, BAIDU_VI)
 */
export async function getUrl(id, br = 320) {
  const ts = Date.now();
  const e = await aesCbcEncrypt(`songid=${id}&ts=${ts}`, BAIDU_KEY, BAIDU_VI);
  const params = new URLSearchParams({
    from: 'qianqianmini',
    method: 'baidu.ting.song.getInfos',
    songid: String(id),
    res: '1',
    platform: 'darwin',
    version: '1.0.0',
    e,
  });
  const data = await fetchJson(`${BASE_URL}?${params}`);
  const list = data?.songurl?.url || [];

  let bestBr = 0;
  let bestUrl = '';
  let bestSize = 0;
  for (const item of list) {
    const itemBr = parseInt(item.file_bitrate, 10) || 0;
    if (itemBr <= br && itemBr > bestBr) {
      bestBr = itemBr;
      bestUrl = item.file_link || item.show_link || '';
      bestSize = parseInt(item.file_size, 10) || 0;
    }
  }
  if (!bestUrl) return { url: '', size: 0, br: -1 };
  return { url: bestUrl, size: bestSize, br: bestBr };
}

/**
 * 搜索（Meting.php:248-259）
 */
export async function search(keyword, count = 20, page = 1) {
  const params = new URLSearchParams({
    from: 'qianqianmini',
    method: 'baidu.ting.search.merge',
    isNew: '1',
    platform: 'darwin',
    page_no: String(page),
    query: keyword,
    version: '11.2.1',
    page_size: String(count),
  });
  const data = await fetchJson(`${BASE_URL}?${params}`);
  return data?.result?.song_info?.song_list || [];
}

/**
 * 获取歌词（Meting.php:907-913 + baidu_lyric:1576-1583）
 */
export async function getLyric(id) {
  const params = new URLSearchParams({
    from: 'qianqianmini',
    method: 'baidu.ting.song.lry',
    songid: String(id),
    platform: 'darwin',
    version: '1.0.0',
  });
  const data = await fetchJson(`${BASE_URL}?${params}`);
  return {
    lyric: data?.lrcContent || '',
    tlyric: '',
  };
}

/**
 * 封面 - 通过 song info 提取 pic_radio / pic_small
 * Meting.php:959-964
 */
export async function getPic(id, _size = 300) {
  // 调用 song info 获取图片（不使用 e 加密，因为不必要）
  const params = new URLSearchParams({
    from: 'qianqianmini',
    method: 'baidu.ting.song.getInfos',
    songid: String(id),
    res: '1',
    platform: 'darwin',
    version: '1.0.0',
  });
  try {
    const data = await fetchJson(`${BASE_URL}?${params}`);
    const url = data?.songinfo?.pic_radio || data?.songinfo?.pic_small || '';
    return { url };
  } catch {
    return { url: '' };
  }
}
