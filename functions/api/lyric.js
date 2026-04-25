/**
 * @description: /api/lyric 端点 - 获取歌词
 *               对齐原 api.php case 'lyric'：调对应源的 getLyric(id)
 *               返回 { lyric, tlyric } 与前端 ajaxLyric 期望一致
 * @author: UG - 一个斗码大陆苦逼的三段码之气的少年，并没有神秘戒指中码老的帮助，但总有一天，我会成为斗码大陆中码帝一样的存在。三十年河东，三十年河西，莫欺少年穷。
 * @date: 2026-04-25
 */

import { jsonResponse, errorResponse, handleOptions, parseParams } from '../_lib/cors.js';
import { getSource } from '../_lib/sources/index.js';

export async function onRequest(context) {
  const { request } = context;
  if (request.method === 'OPTIONS') return handleOptions();

  const params = await parseParams(request);
  const id = params.id;
  const source = params.source || 'netease';

  if (!id) return errorResponse('missing id', 400);
  const fetcher = getSource(source);
  if (!fetcher) return errorResponse(`unknown source: ${source}`, 400);

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
