/**
 * @description: /api/lyric 端点 - 获取歌词
 *               同 playlist：EdgeOne 上 weapi 可能被风控，改走 Meting 代理 ?type=lrc
 *               Meting 代理返回的是纯 lrc 文本，包装成 { lyric, tlyric: '' } 给前端
 *               其他源（tencent/baidu/kuwo 等）走本地 fetcher
 * @author: UG - 一个斗码大陆苦逼的三段码之气的少年，并没有神秘戒指中码老的帮助，但总有一天，我会成为斗码大陆中码帝一样的存在。三十年河东，三十年河西，莫欺少年穷。
 * @date: 2026-04-25
 */

import { jsonResponse, errorResponse, handleOptions, parseParams } from '../_lib/cors.js';
import { getSource } from '../_lib/sources/index.js';

const PROXY_BASES = [
  'https://api.qijieya.cn/meting/',
  'https://api.injahow.cn/meting/',
];

async function fetchNeteaseLyricViaProxy(id) {
  for (const base of PROXY_BASES) {
    try {
      const url = `${base}?server=netease&type=lrc&id=${encodeURIComponent(id)}`;
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) continue;
      const text = await r.text();
      if (text && text.trim().length > 0) return text;
    } catch {
      // 试下一个
    }
  }
  return null;
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method === 'OPTIONS') return handleOptions();

  const params = await parseParams(request);
  const id = params.id;
  const source = params.source || 'netease';

  if (!id) return errorResponse('missing id', 400);
  const fetcher = getSource(source);
  if (!fetcher) return errorResponse(`unknown source: ${source}`, 400);

  // netease 走 Meting 代理（避免 EdgeOne 边缘 IP 被风控）
  if (source === 'netease') {
    const lyric = await fetchNeteaseLyricViaProxy(id);
    if (lyric) {
      return jsonResponse({ lyric, tlyric: '' });
    }
    // 代理失败 → 走本地加密 weapi 兜底
  }

  try {
    const result = await fetcher.getLyric(id);
    return jsonResponse({
      lyric: result?.lyric || '',
      tlyric: result?.tlyric || '',
    });
  } catch (err) {
    return errorResponse(`lyric fetch failed: ${err.message}`, 500);
  }
}
