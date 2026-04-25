/**
 * @description: QQ 音乐 fetcher - 实现 url(两步) / search / lyric / pic 四个核心接口
 *               严格对齐 plugns-php/Meting.php 中 case 'tencent' 的行为
 *               注意 url 接口是两步请求：先 fcg_play_single_song 拿 songInfo，再 musicu.fcg 拿 vkey
 * @author: UG - 一个斗码大陆苦逼的三段码之气的少年，并没有神秘戒指中码老的帮助，但总有一天，我会成为斗码大陆中码帝一样的存在。三十年河东，三十年河西，莫欺少年穷。
 * @date: 2026-04-25
 */

// 与 Meting.php:992-1001 对齐的 QQ 音乐请求头
const TENCENT_HEADERS = {
  Referer: 'http://y.qq.com',
  Cookie:
    'pgv_pvi=22038528; pgv_si=s3156287488; pgv_pvid=5535248600; yplayer_open=1; ts_last=y.qq.com/portal/player.html; ts_uid=4847550686; yq_index=0; qqmusic_fromtag=66; player_exist=1',
  'User-Agent':
    'QQ%E9%9F%B3%E4%B9%90/54409 CFNetwork/901.1 Darwin/17.6.0 (x86_64)',
  Accept: '*/*',
  'Accept-Language': 'zh-CN,zh;q=0.8,gl;q=0.6,zh-TW;q=0.4',
  Connection: 'keep-alive',
};

// 码率档位映射（Meting.php:1219-1227）
// [文件大小字段, 码率, 文件名前缀, 扩展名]
const TENCENT_QUALITIES = [
  ['size_flac', 999, 'F000', 'flac'],
  ['size_320mp3', 320, 'M800', 'mp3'],
  ['size_192aac', 192, 'C600', 'm4a'],
  ['size_128mp3', 128, 'M500', 'mp3'],
  ['size_96aac', 96, 'C400', 'm4a'],
  ['size_48aac', 48, 'C200', 'm4a'],
  ['size_24aac', 24, 'C100', 'm4a'],
];

async function fetchJson(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { ...TENCENT_HEADERS, ...(init.headers || {}) } });
  if (!res.ok) throw new Error(`tencent ${url} HTTP ${res.status}`);
  return await res.json();
}

/**
 * 获取播放链接（两步请求）
 */
export async function getUrl(id, br = 320) {
  // 第一步：拿 songInfo
  const params1 = new URLSearchParams({ songmid: id, platform: 'yqq', format: 'json' });
  const songData = await fetchJson(
    `https://c.y.qq.com/v8/fcg-bin/fcg_play_single_song.fcg?${params1}`,
  );
  const song = songData?.data?.[0];
  if (!song) return { url: '', size: 0, br: -1 };
  const mid = song.mid;
  const mediaMid = song.file?.media_mid;
  if (!mediaMid) return { url: '', size: 0, br: -1 };

  // 第二步：拿 vkey
  const guid = String(Math.floor(Math.random() * 1e10));
  const payload = {
    req_0: {
      module: 'vkey.GetVkeyServer',
      method: 'CgiGetVkey',
      param: {
        guid,
        songmid: TENCENT_QUALITIES.map(() => mid),
        filename: TENCENT_QUALITIES.map((q) => q[2] + mediaMid + '.' + q[3]),
        songtype: TENCENT_QUALITIES.map(() => song.type),
        uin: '0',
        loginflag: 1,
        platform: '20',
      },
    },
  };
  const params2 = new URLSearchParams({
    format: 'json',
    platform: 'yqq.json',
    needNewCode: '0',
    data: JSON.stringify(payload),
  });
  const vkeyData = await fetchJson(`https://u.y.qq.com/cgi-bin/musicu.fcg?${params2}`);

  const sip = vkeyData?.req_0?.data?.sip?.[0];
  const midurlinfo = vkeyData?.req_0?.data?.midurlinfo;
  if (!sip || !midurlinfo) return { url: '', size: 0, br: -1 };

  // 选择 ≤ br 的最大可用码率（Meting.php:1270-1281）
  for (let i = 0; i < TENCENT_QUALITIES.length; i++) {
    const [sizeKey, brKbps] = TENCENT_QUALITIES[i];
    if (song.file?.[sizeKey] && brKbps <= br && midurlinfo[i]?.vkey && midurlinfo[i]?.purl) {
      return {
        url: sip + midurlinfo[i].purl,
        size: song.file[sizeKey],
        br: brKbps,
      };
    }
  }
  return { url: '', size: 0, br: -1 };
}

/**
 * 搜索歌曲（Meting.php:193-204）
 */
export async function search(keyword, count = 20, page = 1) {
  const params = new URLSearchParams({
    format: 'json',
    p: String(page),
    n: String(count),
    w: keyword,
    aggr: '1',
    lossless: '1',
    cr: '1',
    new_json: '1',
  });
  const data = await fetchJson(`https://c.y.qq.com/soso/fcgi-bin/client_search_cp?${params}`);
  return data?.data?.song?.list || [];
}

/**
 * 获取歌词（响应是 JSONP 包装，需剥离）
 * Meting.php:868-871 + tencent_lyric:1509-1519
 */
export async function getLyric(id) {
  const params = new URLSearchParams({ songmid: id, g_tk: '5381' });
  const res = await fetch(
    `https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?${params}`,
    { headers: TENCENT_HEADERS },
  );
  if (!res.ok) throw new Error(`tencent lyric HTTP ${res.status}`);
  let text = await res.text();
  // 形如 "MusicJsonCallback(...)\n" 需剥离
  const start = text.indexOf('(');
  const end = text.lastIndexOf(')');
  if (start > 0 && end > start) text = text.slice(start + 1, end);
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    return { lyric: '', tlyric: '' };
  }
  const decode = (b64) => {
    if (!b64) return '';
    try {
      return atob(b64.replace(/\s/g, ''));
    } catch {
      return '';
    }
  };
  return {
    lyric: decode(data.lyric),
    tlyric: decode(data.trans),
  };
}

/**
 * 封面 URL 直拼（Meting.php:941）
 */
export function getPic(id, size = 300) {
  return {
    url: `https://y.gtimg.cn/music/photo_new/T002R${size}x${size}M000${id}.jpg?max_age=2592000`,
  };
}
