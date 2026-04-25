/**
 * @description: /api/playlist 端点 - 获取歌单详情（仅网易云支持）
 *               对齐原 api.php case 'playlist'，返回 weapi 原始响应
 *               前端 ajaxPlayList 直接读取 jsonData.playlist.tracks[i].ar[0].name 等字段
 * @author: UG - 一个斗码大陆苦逼的三段码之气的少年，并没有神秘戒指中码老的帮助，但总有一天，我会成为斗码大陆中码帝一样的存在。三十年河东，三十年河西，莫欺少年穷。
 * @date: 2026-04-25
 */

import { jsonResponse, errorResponse, handleOptions, parseParams } from '../_lib/cors.js';
import * as netease from '../_lib/sources/netease.js';

export async function onRequest(context) {
  const { request } = context;
  if (request.method === 'OPTIONS') return handleOptions();

  const params = await parseParams(request);
  const id = params.id;
  const source = params.source || 'netease';

  if (!id) return errorResponse('missing playlist id', 400);
  if (source !== 'netease') {
    return errorResponse(`playlist only supported for netease (got: ${source})`, 501);
  }

  try {
    const data = await netease.getPlaylist(id);
    return jsonResponse(data);
  } catch (err) {
    return errorResponse(`playlist fetch failed: ${err.message}`, 500);
  }
}
