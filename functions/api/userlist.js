/**
 * @description: /api/userlist 端点 - 获取网易云用户的歌单列表
 *               对齐原 api.php case 'userlist'，cookie 可选（无 cookie 仅返回公开歌单）
 *               cookie 来自前端 localStorage，通过 query/POST 参数 cookie 或 header x-music-cookie 传入
 * @author: UG - 一个斗码大陆苦逼的三段码之气的少年，并没有神秘戒指中码老的帮助，但总有一天，我会成为斗码大陆中码帝一样的存在。三十年河东，三十年河西，莫欺少年穷。
 * @date: 2026-04-25
 */

import { jsonResponse, errorResponse, handleOptions, parseParams } from '../_lib/cors.js';
import * as netease from '../_lib/sources/netease.js';

export async function onRequest(context) {
  const { request } = context;
  if (request.method === 'OPTIONS') return handleOptions();

  const params = await parseParams(request);
  const uid = params.uid;
  const cookie = params.cookie || request.headers.get('x-music-cookie') || null;

  if (!uid) return errorResponse('missing uid', 400);

  try {
    const data = await netease.getUserPlaylists(uid, cookie);
    return jsonResponse(data);
  } catch (err) {
    return errorResponse(`userlist failed: ${err.message}`, 500);
  }
}
