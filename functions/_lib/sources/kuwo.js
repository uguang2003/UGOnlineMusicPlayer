/**
 * @description: 酷我音乐 fetcher - 全部接口都是简单 GET（不加密）
 *               对齐 Meting.php case 'kuwo'
 * @author: UG - 一个斗码大陆苦逼的三段码之气的少年，并没有神秘戒指中码老的帮助，但总有一天，我会成为斗码大陆中码帝一样的存在。三十年河东，三十年河西，莫欺少年穷。
 * @date: 2026-04-25
 */

// 与 Meting.php:1023-1030 对齐
const KUWO_HEADERS = {
  Cookie:
    'Hm_lvt_cdb524f42f0ce19b169a8071123a4797=1623339177,1623339183; _ga=GA1.2.1195980605.1579367081; Hm_lpvt_cdb524f42f0ce19b169a8071123a4797=1623339982; kw_token=3E7JFQ7MRPL; _gid=GA1.2.747985028.1623339179; _gat=1',
  csrf: '3E7JFQ7MRPL',
  Host: 'www.kuwo.cn',
  Referer: 'http://www.kuwo.cn/',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36',
};

async function fetchJson(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { ...KUWO_HEADERS, ...(init.headers || {}) } });
  if (!res.ok) throw new Error(`kuwo ${url} HTTP ${res.status}`);
  return await res.json();
}

/**
 * 获取播放链接（Meting.php:736-746 + kuwo_url:1478-1495）
 * 注意：kuwo API 不支持码率选择，固定返回 128 kbps
 */
export async function getUrl(id, _br = 320) {
  const params = new URLSearchParams({ mid: id, type: 'music', httpsStatus: '1' });
  const data = await fetchJson(`http://www.kuwo.cn/api/v1/www/music/playUrl?${params}`);
  if (data?.code !== 200 || !data?.data?.url) {
    return { url: '', size: 0, br: -1 };
  }
  return { url: data.data.url, size: 0, br: 128 };
}

/**
 * 搜索（Meting.php:265-272）
 */
export async function search(keyword, count = 20, page = 1) {
  const params = new URLSearchParams({
    key: keyword,
    pn: String(page),
    rn: String(count),
    httpsStatus: '1',
  });
  const data = await fetchJson(`http://www.kuwo.cn/api/www/search/searchMusicBykeyWord?${params}`);
  return data?.data?.list || [];
}

/**
 * 获取歌词（Meting.php:921-924 + kuwo_lyric:1589-1614）
 */
export async function getLyric(id) {
  const params = new URLSearchParams({ musicId: id, httpsStatus: '1' });
  const data = await fetchJson(`http://m.kuwo.cn/newh5/singles/songinfoandlrc?${params}`);
  const lrcList = data?.data?.lrclist;
  if (!Array.isArray(lrcList)) return { lyric: '', tlyric: '' };

  // 拼接 [MM:SS.xx] lrcContent 格式
  const lines = lrcList.map((item) => {
    const time = parseFloat(item.time);
    if (isNaN(time)) return item.lineLyric || '';
    const min = String(Math.floor(time / 60)).padStart(2, '0');
    const sec = String(Math.floor(time % 60)).padStart(2, '0');
    const ms = String(Math.floor((time * 100) % 100)).padStart(2, '0');
    return `[${min}:${sec}.${ms}]${item.lineLyric || ''}`;
  });
  return { lyric: lines.join('\n'), tlyric: '' };
}

/**
 * 封面 - 通过 musicId 调 song info（Meting.php:966-972）
 */
export async function getPic(id, _size = 300) {
  try {
    const params = new URLSearchParams({ mid: id, httpsStatus: '1' });
    const data = await fetchJson(
      `http://www.kuwo.cn/api/www/music/musicInfo?${params}`,
    );
    const url = data?.data?.pic || data?.data?.albumpic || '';
    return { url };
  } catch {
    return { url: '' };
  }
}
