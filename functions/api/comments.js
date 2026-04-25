/**
 * @description: /api/comments 端点 - 获取歌曲热评 + 普通评论（仅网易云支持）
 *               对齐原 api.php case 'comments'，返回 weapi 原始响应
 *               前端读取 jsonData.hotComments / jsonData.comments
 * @author: UG - 一个斗码大陆苦逼的三段码之气的少年，并没有神秘戒指中码老的帮助，但总有一天，我会成为斗码大陆中码帝一样的存在。三十年河东，三十年河西，莫欺少年穷。
 * @date: 2026-04-25
 */

import { jsonResponse, errorResponse, handleOptions, parseParams } from '../_lib/cors.js';
import * as netease from '../_lib/sources/netease.js';

// http://p1.music.126.net/... → https://...
// 网易云老 API 头像/图片 URL 用 http，HTTPS 页面会触发 Mixed Content 警告
function toHttps(url) {
  return typeof url === 'string' ? url.replace(/^http:\/\//, 'https://') : url || '';
}

// 把网易云 weapi 响应的评论项简化成前端期望的格式
// 前端 functions.js:589-591 读 jsonData.hot_comment / .comment（单数）
// 前端 functions.js:627 读 c.user.avatar（不是 avatarUrl）
function formatComment(c) {
  if (!c) return null;
  const user = c.user || {};
  return {
    user: {
      nickname: user.nickname || '',
      avatar: toHttps(user.avatarUrl || ''),
      userId: user.userId,
    },
    content: c.content || '',
    time: c.time,
    timeStr: c.timeStr,
    likedCount: c.likedCount || 0,
  };
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method === 'OPTIONS') return handleOptions();

  const params = await parseParams(request);
  const id = params.id;
  const source = params.source || 'netease';
  const count = parseInt(params.count, 10) || 50;
  const page = parseInt(params.pages, 10) || parseInt(params.page, 10) || 1;

  if (!id) return errorResponse('missing song id', 400);
  if (source !== 'netease') {
    return errorResponse(`comments only supported for netease (got: ${source})`, 501);
  }

  try {
    const data = await netease.getComments(id, count, page);
    // 把 weapi 字段名转成前端期望的格式（hotComments → hot_comment, avatarUrl → avatar）
    return jsonResponse({
      code: data?.code || 200,
      hot_comment: (data?.hotComments || []).map(formatComment).filter(Boolean),
      comment: (data?.comments || []).map(formatComment).filter(Boolean),
      total: data?.total || 0,
      more: data?.more || false,
    });
  } catch (err) {
    return errorResponse(`comments fetch failed: ${err.message}`, 500);
  }
}
