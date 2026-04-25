/**
 * @description: /api/search 端点 - 搜索歌曲
 *               对齐原 api.php case 'search'
 *               将各源响应通过 formatSongBySource 统一成前端期望格式（artist 必须是数组）
 * @author: UG - 一个斗码大陆苦逼的三段码之气的少年，并没有神秘戒指中码老的帮助，但总有一天，我会成为斗码大陆中码帝一样的存在。三十年河东，三十年河西，莫欺少年穷。
 * @date: 2026-04-25
 */

import { jsonResponse, errorResponse, handleOptions, parseParams } from '../_lib/cors.js';
import { getSource } from '../_lib/sources/index.js';
import { formatSongBySource } from '../_lib/format.js';

export async function onRequest(context) {
  const { request } = context;
  if (request.method === 'OPTIONS') return handleOptions();

  const params = await parseParams(request);
  // 兼容前端两种命名: 'name' (主) / 'keyword'
  const keyword = params.name || params.keyword;
  const source = params.source || 'netease';
  const count = parseInt(params.count, 10) || 20;
  const page = parseInt(params.pages, 10) || parseInt(params.page, 10) || 1;

  if (!keyword) return errorResponse('missing search keyword (name)', 400);
  const fetcher = getSource(source);
  if (!fetcher) return errorResponse(`unknown source: ${source}`, 400);

  try {
    const rawList = await fetcher.search(keyword, count, page);
    const formatted = (Array.isArray(rawList) ? rawList : []).map((raw) => {
      try {
        return formatSongBySource(raw, source);
      } catch {
        return null;
      }
    }).filter(Boolean);
    return jsonResponse(formatted);
  } catch (err) {
    return errorResponse(`search failed: ${err.message}`, 500);
  }
}
