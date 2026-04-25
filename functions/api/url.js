/**
 * @description: /api/url 端点 - 获取歌曲播放链接
 *               与原 PHP api.php case 'url' 行为一致：
 *                 - 默认返回 obdo.cc 第三方代理 URL（让浏览器直拉，省服务器流量）
 *                 - 前端 use_local=1 时走加密本地实现
 *               EdgeOne Pages Functions 入口约定：export async function onRequest(context)
 *               与 Cloudflare Pages Functions 兼容
 * @author: UG - 一个斗码大陆苦逼的三段码之气的少年，并没有神秘戒指中码老的帮助，但总有一天，我会成为斗码大陆中码帝一样的存在。三十年河东，三十年河西，莫欺少年穷。
 * @date: 2026-04-25
 */

import { jsonResponse, errorResponse, handleOptions, parseParams } from '../_lib/cors.js';
import { formatUrlResponse } from '../_lib/format.js';
import * as netease from '../_lib/sources/netease.js';
import * as tencent from '../_lib/sources/tencent.js';
import * as kugou from '../_lib/sources/kugou.js';
import * as baidu from '../_lib/sources/baidu.js';
import * as kuwo from '../_lib/sources/kuwo.js';
import * as xiami from '../_lib/sources/xiami.js';

const SOURCES = { netease, tencent, kugou, baidu, kuwo, xiami };

// Meting 第三方代理候选
// - api.obdo.cc 已于 2026 年挂（Cloudflare 525 SSL 失败），删除
// - api.qijieya.cn 主选：⭐ 支持解析网易云 VIP 歌曲 (https://qijieya.cn/archives/service)
// - api.injahow.cn 备用：项目仍维护 (https://github.com/injahow/meting-api)
const PROXY_PRIMARY = 'https://api.qijieya.cn/meting/';
const PROXY_FALLBACK = 'https://api.injahow.cn/meting/';

// 80% 流量走主选（qijieya，有 VIP），20% 走备用（保持备用实例的活性）
// 用 id 哈希分配，同一个 id 永远走同一个实例（避免播放失败时前端切换造成抖动）
function pickProxyBase(id) {
  const s = String(id);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 5 === 0 ? PROXY_FALLBACK : PROXY_PRIMARY;
}

/**
 * EdgeOne Pages Functions / Cloudflare Pages Functions 入口
 */
export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') return handleOptions();
  if (request.method !== 'GET' && request.method !== 'POST') {
    return errorResponse('method not allowed', 405);
  }

  const params = await parseParams(request);
  const id = params.id;
  const source = params.source || 'netease';
  const useLocal = params.use_local === '1' || params.use_local === 1;
  const br = parseInt(params.br, 10) || 320;
  const cookie = params.cookie || request.headers.get('x-music-cookie') || null;

  if (!id) return errorResponse('missing id', 400);

  // 路线 A: 走本地加密实现 (前端在第三方失败后会带 use_local=1 重试)
  if (useLocal) {
    return await fetchLocal(source, id, br, cookie);
  }

  // 路线 B: 默认返回 Meting 第三方代理 URL
  // 这与原 PHP requestThirdPartyApi 行为完全一致：
  //   仅返回拼好的 URL，让浏览器拿去拉真实音频
  //   (api.php:709-714 直接 return URL，从未 curl_exec)
  const proxyBase = pickProxyBase(id);
  const proxyUrl = `${proxyBase}?server=${encodeURIComponent(source)}&type=url&id=${encodeURIComponent(id)}`;
  return jsonResponse({
    url: proxyUrl,
    size: 0,
    br: 0,
    type: 'audio',
  });
}

/**
 * 调用本地实现获取歌曲 URL（加密走官方接口）
 */
async function fetchLocal(source, id, br, cookie) {
  const fetcher = SOURCES[source];
  if (!fetcher) return errorResponse(`unknown source: ${source}`, 400);
  if (typeof fetcher.getUrl !== 'function') {
    return errorResponse(`source '${source}' has no getUrl`, 501);
  }
  try {
    const result =
      source === 'netease'
        ? await fetcher.getUrl(id, br, cookie)
        : await fetcher.getUrl(id, br);
    return jsonResponse(formatUrlResponse(result.url, result.size, result.br));
  } catch (err) {
    return errorResponse(`local fetch failed: ${err.message}`, 500);
  }
}
