/**
 * @description: 酷狗音乐 fetcher - url(两步+MD5) / search / lyric(两步) / pic
 *               对齐 Meting.php case 'kugou'
 *               url 第二步 key = MD5(hash + 'kgcloudv2')，因此依赖 md5.js
 * @author: UG - 一个斗码大陆苦逼的三段码之气的少年，并没有神秘戒指中码老的帮助，但总有一天，我会成为斗码大陆中码帝一样的存在。三十年河东，三十年河西，莫欺少年穷。
 * @date: 2026-04-25
 */

import { md5 } from '../md5.js';

const KUGOU_HEADERS = {
  'User-Agent': 'IPhone-8990-searchSong',
  'UNI-UserAgent': 'iOS11.4-Phone8990-1009-0-WiFi',
};

async function fetchJson(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { ...KUGOU_HEADERS, ...(init.headers || {}) } });
  if (!res.ok) throw new Error(`kugou ${url} HTTP ${res.status}`);
  return await res.json();
}

/**
 * 获取播放链接（两步请求 + MD5 签名）
 * Meting.php:697-718 + kugou_url:1326-1357
 */
export async function getUrl(id, br = 320) {
  // 第一步：拿特权信息（含可用码率列表）
  const step1 = await fetch('http://media.store.kugou.com/v1/get_res_privilege', {
    method: 'POST',
    headers: { ...KUGOU_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      relate: 1,
      userid: '0',
      vip: 0,
      appid: 1000,
      token: '',
      behavior: 'download',
      area_code: '1',
      clientver: '8990',
      resource: [{ id: 0, type: 'audio', hash: id }],
    }),
  });
  if (!step1.ok) throw new Error(`kugou step1 HTTP ${step1.status}`);
  const data1 = await step1.json();
  const goods = data1?.data?.[0]?.relate_goods || [];

  let bestBr = 0;
  let bestUrl = '';
  let bestSize = 0;

  // 选 ≤ br 的最大码率
  for (const item of goods) {
    const itemBr = item?.info?.bitrate || 0;
    if (itemBr <= br && itemBr > bestBr) {
      const hash = item.hash;
      const params = new URLSearchParams({
        hash,
        key: md5(hash + 'kgcloudv2'),
        pid: '3',
        behavior: 'play',
        cmd: '25',
        version: '8990',
      });
      try {
        const data2 = await fetchJson(`http://trackercdn.kugou.com/i/v2/?${params}`);
        if (Array.isArray(data2?.url) && data2.url[0]) {
          bestBr = Math.round((data2.bitRate || itemBr * 1000) / 1000);
          bestUrl = data2.url[0];
          bestSize = data2.fileSize || 0;
        }
      } catch {
        /* 单个失败不影响其他档位 */
      }
    }
  }

  if (!bestUrl) return { url: '', size: 0, br: -1 };
  return { url: bestUrl, size: bestSize, br: bestBr };
}

/**
 * 搜索（Meting.php:228-241）
 */
export async function search(keyword, count = 20, page = 1) {
  const params = new URLSearchParams({
    api_ver: '1',
    area_code: '1',
    correct: '1',
    pagesize: String(count),
    plat: '2',
    tag: '1',
    sver: '5',
    showtype: '10',
    page: String(page),
    keyword,
    version: '8990',
  });
  const data = await fetchJson(`http://mobilecdn.kugou.com/api/v3/search/song?${params}`);
  return data?.data?.info || [];
}

/**
 * 获取歌词（两步：先 search 拿 accesskey，再 download 取 lrc）
 * Meting.php:893-901 + kugou_lyric:1559-1574
 */
export async function getLyric(id) {
  const params1 = new URLSearchParams({
    keyword: ' - ',
    ver: '1',
    hash: id,
    client: 'mobi',
    man: 'yes',
  });
  const data1 = await fetchJson(`http://krcs.kugou.com/search?${params1}`);
  const cand = data1?.candidates?.[0];
  if (!cand) return { lyric: '', tlyric: '' };

  const params2 = new URLSearchParams({
    charset: 'utf8',
    accesskey: cand.accesskey,
    id: cand.id,
    client: 'mobi',
    fmt: 'lrc',
    ver: '1',
  });
  const data2 = await fetchJson(`http://lyrics.kugou.com/download?${params2}`);
  let lyric = '';
  if (data2?.content) {
    try {
      // base64 解码（content 是 base64 lrc 文本）
      const bin = atob(data2.content);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      lyric = new TextDecoder('utf-8').decode(bytes);
    } catch {
      /* 解码失败返回空 */
    }
  }
  return { lyric, tlyric: '' };
}

/**
 * 封面 - 通过 song(id) 拿 imgUrl, 替换 {size} 为 400
 * Meting.php:951-957 + Meting.php song() (酷狗 case 在 282-291)
 */
export async function getPic(id, size = 400) {
  try {
    const data = await fetchJson(
      `http://m.kugou.com/app/i/getSongInfo.php?cmd=playInfo&hash=${id}`,
      { method: 'GET' },
    );
    let url = data?.imgUrl || data?.album_img || '';
    if (url) url = url.replace('{size}', String(size));
    return { url };
  } catch {
    return { url: '' };
  }
}
