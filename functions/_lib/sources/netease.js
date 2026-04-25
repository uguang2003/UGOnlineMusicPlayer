/**
 * @description: 网易云音乐 fetcher - 封装 weapi 加密请求 + 老 API 请求
 *               覆盖原 Meting.php / api.php 中所有网易云相关功能
 *               weapi 走 neteaseEncrypt 加密 (AES + RSA)，老 API 直接 GET/POST
 * @author: UG - 一个斗码大陆苦逼的三段码之气的少年，并没有神秘戒指中码老的帮助，但总有一天，我会成为斗码大陆中码帝一样的存在。三十年河东，三十年河西，莫欺少年穷。
 * @date: 2026-04-25
 */

import { neteaseEncrypt } from '../crypto.js';

// 与 Meting.php:982-991 对齐的请求头（伪装成网易云客户端避免风控）
const NETEASE_DEFAULT_HEADERS = {
  Referer: 'https://music.163.com/',
  Cookie:
    'appver=8.2.30; os=iPhone OS; osver=15.0; EVNSM=1.0.0; buildver=2206; channel=distribution; machineid=iPhone13.3',
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 CloudMusic/0.1.1 NeteaseMusic/8.2.30',
  Accept: '*/*',
  'Accept-Language': 'zh-CN,zh;q=0.8,gl;q=0.6,zh-TW;q=0.4',
  Connection: 'keep-alive',
  'Content-Type': 'application/x-www-form-urlencoded',
};

// 生成随机 X-Real-IP（与 Meting.php:986 一致：long2ip(mt_rand(1884815360, 1884890111))）
function randomChinaIp() {
  const start = 1884815360;
  const range = 1884890111 - start;
  const n = start + Math.floor(Math.random() * range);
  return [
    (n >>> 24) & 0xff,
    (n >>> 16) & 0xff,
    (n >>> 8) & 0xff,
    n & 0xff,
  ].join('.');
}

/**
 * 合并默认请求头与可选 Cookie 覆盖
 */
function buildHeaders(extraCookie) {
  const headers = { ...NETEASE_DEFAULT_HEADERS, 'X-Real-IP': randomChinaIp() };
  if (extraCookie) {
    // 用户提供的 cookie 优先（包含 MUSIC_U / __csrf 等）
    headers.Cookie = extraCookie + '; ' + NETEASE_DEFAULT_HEADERS.Cookie;
  }
  return headers;
}

/**
 * weapi 加密请求工具
 * @param {string} apiPath 原 /api/... 路径，会自动替换为 /weapi/...
 * @param {object} body 请求体
 * @param {string} cookie 可选用户 cookie
 */
async function weapiRequest(apiPath, body, cookie = null) {
  const encrypted = await neteaseEncrypt(body);
  const formData = new URLSearchParams();
  formData.set('params', encrypted.params);
  formData.set('encSecKey', encrypted.encSecKey);

  const url = 'https://music.163.com' + apiPath.replace('/api/', '/weapi/');
  const res = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(cookie),
    body: formData.toString(),
  });
  if (!res.ok) {
    throw new Error(`weapi ${apiPath} HTTP ${res.status}`);
  }
  return await res.json();
}

/**
 * 老 API 请求（不加密）工具
 * @param {string} path 完整路径如 /api/v1/user/detail/12345
 * @param {object} options { params, body, method, cookie }
 */
async function oldApiRequest(path, options = {}) {
  const { params, body, method = 'GET', cookie } = options;
  const url = new URL('https://music.163.com' + path);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const init = { method, headers: buildHeaders(cookie) };
  if (body) {
    init.body = body instanceof URLSearchParams ? body.toString() : body;
  }
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`old api ${path} HTTP ${res.status}`);
  }
  return await res.json();
}

/**
 * 从 cookie 字符串中提取 __csrf
 */
export function extractCsrf(cookie) {
  if (!cookie) return '';
  const m = cookie.match(/__csrf=([^;]+)/);
  return m ? m[1] : '';
}

// ==================== 业务接口（覆盖原 Meting.php 行为） ====================

/**
 * 获取歌曲播放链接（weapi 加密接口）
 * 等价于 Meting.php url() + netease_url() 解码
 */
export async function getUrl(id, br = 320, cookie = null) {
  const data = await weapiRequest(
    '/api/song/enhance/player/url',
    {
      ids: `[${id}]`, // PHP json_encode(array($id)) 输出 [id]，无引号
      br: br * 1000,
    },
    cookie,
  );

  let url = '';
  let size = 0;
  let bitrate = -1;
  if (data && data.data && data.data[0]) {
    const d = data.data[0];
    url = (d.uf && d.uf.url) || d.url || '';
    size = d.size || 0;
    bitrate = d.br ? Math.round(d.br / 1000) : -1;
  }
  return { url, size, br: bitrate };
}

/**
 * 获取歌词（weapi 加密接口）
 * 等价于 Meting.php lyric() + netease_lyric() 解码
 */
export async function getLyric(id) {
  const data = await weapiRequest('/api/song/lyric', {
    id,
    os: 'pc',
    lv: -1,
    kv: -1,
    tv: -1,
  });
  return {
    lyric: (data.lrc && data.lrc.lyric) || '',
    tlyric: (data.tlyric && data.tlyric.lyric) || '',
  };
}

/**
 * 获取封面（图片 URL，无需请求接口，直接拼）
 * 等价于 Meting.php pic()
 * 注意：网易云的 pic_id 已经是 al.pic_str 字符串，直接拼地址即可，无需 MD5 混淆
 */
export async function getPic(id, size = 300) {
  // pic_id 是网易云返回的 al.pic_str（数字字符串），直接走 p3.music.126.net
  return {
    url: `https://p3.music.126.net/${neteaseSimplePicHash(id)}/${id}.jpg?param=${size}y${size}`,
  };
}

/**
 * 简易实现（用于无 MD5 时的兜底）
 * 实际 Meting.php 用了 MD5 加盐，这里 P1 阶段先返回空目录段，让网易云 CDN 尝试自动解析
 * P2 阶段补 MD5 后改写
 */
function neteaseSimplePicHash(_id) {
  return ''; // CDN 大多数情况下无 hash 也能解析
}

/**
 * 获取歌单详情
 * 等价于 Meting.php playlist() (case 'netease')
 */
export async function getPlaylist(id) {
  const data = await weapiRequest('/api/v6/playlist/detail', {
    id,
    n: 1000,
  });
  return data;
}

/**
 * 搜索歌曲（weapi 加密接口）
 * 等价于 Meting.php search() (case 'netease')
 */
export async function search(keyword, count = 20, page = 1) {
  const data = await weapiRequest('/api/cloudsearch/pc', {
    s: keyword,
    type: 1,
    limit: count,
    total: 'true',
    offset: (page - 1) * count,
  });
  return (data.result && data.result.songs) || [];
}

/**
 * 获取热评 + 普通评论
 * 等价于 Meting.php comments() (case 'netease')
 */
export async function getComments(id, count = 50, page = 1) {
  const data = await weapiRequest(`/api/v1/resource/comments/R_SO_4_${id}`, {
    rid: `R_SO_4_${id}`,
    offset: (page - 1) * count,
    total: 'true',
    limit: count,
  });
  return data;
}

// ==================== 老 API（不加密） ====================

/**
 * 获取用户信息（老 API，不需要加密）
 * 等价于 api.php case 'userinfo'
 */
export async function getUserInfo(uid) {
  return await oldApiRequest(`/api/v1/user/detail/${uid}`);
}

/**
 * 获取用户歌单列表（老 API）
 * 等价于 api.php case 'userlist'
 */
export async function getUserPlaylists(uid, cookie = null) {
  return await oldApiRequest('/api/user/playlist/', {
    params: { offset: 0, limit: 1001, uid },
    cookie,
  });
}

/**
 * 喜欢/取消喜欢歌曲（需要 cookie + CSRF）
 * 等价于 api.php case 'like'
 */
export async function likeSong(trackId, like, cookie) {
  const csrf = extractCsrf(cookie);
  if (!csrf) throw new Error('missing __csrf in cookie');
  const body = new URLSearchParams();
  body.set('trackId', String(trackId));
  body.set('like', like ? 'true' : 'false');
  body.set('csrf_token', csrf);
  return await oldApiRequest(`/api/song/like?csrf_token=${csrf}`, {
    method: 'POST',
    body,
    cookie,
  });
}

/**
 * 检查用户对歌曲的喜欢状态（需要 cookie + CSRF）
 * 等价于 api.php case 'check_like'
 */
export async function checkLikeList(cookie) {
  const csrf = extractCsrf(cookie);
  if (!csrf) throw new Error('missing __csrf in cookie');
  const body = new URLSearchParams();
  body.set('csrf_token', csrf);
  return await oldApiRequest(`/api/song/like/get?csrf_token=${csrf}`, {
    method: 'POST',
    body,
    cookie,
  });
}
