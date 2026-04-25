/**
 * @description: /api/check_like 端点 - 拉取用户已喜欢的歌曲 ID 列表
 *               对齐原 api.php case 'check_like'，需要 cookie + CSRF
 *               前端拿到 ids[] 后自行匹配本地播放列表标记红心
 * @author: UG - 一个斗码大陆苦逼的三段码之气的少年，并没有神秘戒指中码老的帮助，但总有一天，我会成为斗码大陆中码帝一样的存在。三十年河东，三十年河西，莫欺少年穷。
 * @date: 2026-04-25
 */

import { jsonResponse, errorResponse, handleOptions, parseParams } from '../_lib/cors.js';
import * as netease from '../_lib/sources/netease.js';

export async function onRequest(context) {
  const { request } = context;
  if (request.method === 'OPTIONS') return handleOptions();

  const params = await parseParams(request);
  const cookie = params.cookie || request.headers.get('x-music-cookie') || null;
  const id = params.id; // 可选：传入则附带 liked 字段

  if (!cookie) return errorResponse('cookie required for check_like', 401, { needLogin: true });

  try {
    const data = await netease.checkLikeList(cookie);
    const ids = Array.isArray(data?.ids) ? data.ids : [];
    const result = { code: data?.code || 200, ids };
    if (id) result.liked = ids.includes(Number(id)) || ids.includes(String(id));
    return jsonResponse(result);
  } catch (err) {
    return errorResponse(`check_like failed: ${err.message}`, 500);
  }
}
