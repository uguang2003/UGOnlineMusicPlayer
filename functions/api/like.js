/**
 * @description: /api/like 端点 - 给网易云歌曲打喜欢/取消喜欢
 *               对齐原 api.php case 'like'，需要 cookie + CSRF
 *               cookie 通过 query/POST 参数 cookie 或 header x-music-cookie 传入
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
  const like = params.like === '1' || params.like === 1 || params.like === true;
  const cookie = params.cookie || request.headers.get('x-music-cookie') || null;

  if (!id) return errorResponse('missing track id', 400);
  if (!cookie) return errorResponse('cookie required for like', 401, { needLogin: true });

  try {
    const data = await netease.likeSong(id, like, cookie);
    return jsonResponse({ code: data?.code || 200, msg: data?.msg || '', result: data });
  } catch (err) {
    return errorResponse(`like failed: ${err.message}`, 500);
  }
}
