/**
 * @description: PHP 风格兼容入口 (/api) - 接收 ?types=url&id=123 形式的请求并派发到对应 endpoint
 *               让前端 ajax.js 只需把 mkPlayer.api 从 'api.php' 改成 '/api' 即可继续用 types= 参数风格
 *               同时 functions/api/url.js 等仍然提供 /api/url RESTful 路径，两套并存
 * @author: UG - 一个斗码大陆苦逼的三段码之气的少年，并没有神秘戒指中码老的帮助，但总有一天，我会成为斗码大陆中码帝一样的存在。三十年河东，三十年河西，莫欺少年穷。
 * @date: 2026-04-25
 */

import { errorResponse, handleOptions, parseParams } from './_lib/cors.js';
import { onRequest as onUrl } from './api/url.js';
import { onRequest as onPic } from './api/pic.js';
import { onRequest as onLyric } from './api/lyric.js';
import { onRequest as onSearch } from './api/search.js';
import { onRequest as onPlaylist } from './api/playlist.js';
import { onRequest as onComments } from './api/comments.js';
import { onRequest as onUserinfo } from './api/userinfo.js';
import { onRequest as onUserlist } from './api/userlist.js';
import { onRequest as onLike } from './api/like.js';
import { onRequest as onCheckLike } from './api/check_like.js';
import { onRequest as onDownload } from './api/download.js';

const ROUTES = {
  url: onUrl,
  pic: onPic,
  lyric: onLyric,
  search: onSearch,
  playlist: onPlaylist,
  comments: onComments,
  userinfo: onUserinfo,
  userlist: onUserlist,
  like: onLike,
  check_like: onCheckLike,
  download: onDownload,
};

export async function onRequest(context) {
  const { request } = context;
  if (request.method === 'OPTIONS') return handleOptions();

  const params = await parseParams(request);
  const types = params.types;
  if (!types || !ROUTES[types]) {
    return errorResponse(`unknown types: ${types || '(missing)'}. expected one of: ${Object.keys(ROUTES).join(', ')}`, 400);
  }

  // 把解析好的参数重新拼成 GET query 转发，避免下游再读一次 body 时 ReadableStream 已被消费
  // 删除 types 自身（不需要传给下游）
  const forwardParams = { ...params };
  delete forwardParams.types;

  const newUrl = new URL(request.url);
  newUrl.search = new URLSearchParams(forwardParams).toString();
  const newReq = new Request(newUrl.toString(), {
    method: 'GET',
    headers: request.headers,
  });

  return await ROUTES[types]({ ...context, request: newReq });
}
