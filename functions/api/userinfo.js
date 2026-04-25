/**
 * @description: /api/userinfo 端点 - 获取网易云用户公开信息
 *               对齐原 api.php case 'userinfo'，老 API 不需要加密、不需要 cookie
 *               响应直传 weapi 原始格式（前端期望 jsonData.profile.nickname / .avatarUrl）
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
  if (!uid) return errorResponse('missing uid', 400);

  try {
    const data = await netease.getUserInfo(uid);
    return jsonResponse(data);
  } catch (err) {
    return errorResponse(`userinfo failed: ${err.message}`, 500);
  }
}
