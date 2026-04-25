/**
 * @description: /api/playlist 端点 - 获取歌单详情（仅网易云）
 *               EdgeOne 边缘节点直连网易云 weapi 容易被风控（境外 IP），改走国内 Meting 代理：
 *                 1. 优先调 qijieya / injahow 的 ?type=playlist 拿到 [{name, artist, url, pic, lrc}]
 *                 2. 从 url 字段中提取歌曲 id，重塑成 weapi 兼容格式给前端
 *                 3. 代理失败兜底走 weapi 加密接口（EdgeOne 上不一定能通）
 *               前端 ajaxPlayList 期望 jsonData.playlist.tracks[i].{id,name,ar[0].name,al.name,al.picUrl}
 * @author: UG - 一个斗码大陆苦逼的三段码之气的少年，并没有神秘戒指中码老的帮助，但总有一天，我会成为斗码大陆中码帝一样的存在。三十年河东，三十年河西，莫欺少年穷。
 * @date: 2026-04-25
 */

import { jsonResponse, errorResponse, handleOptions, parseParams } from '../_lib/cors.js';
import * as netease from '../_lib/sources/netease.js';

const PROXY_BASES = [
  'https://api.qijieya.cn/meting/',
  'https://api.injahow.cn/meting/',
];

async function fetchPlaylistViaProxy(id) {
  for (const base of PROXY_BASES) {
    try {
      const url = `${base}?server=netease&type=playlist&id=${encodeURIComponent(id)}`;
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) continue;
      const list = await r.json();
      if (Array.isArray(list) && list.length > 0) return list;
    } catch {
      // 试下一个
    }
  }
  return null;
}

function metingItemToTrack(item) {
  const m = (item.url || '').match(/[?&]id=(\d+)/);
  return {
    id: m ? Number(m[1]) : null,
    name: item.name || '',
    ar: [{ name: item.artist || '' }],
    al: {
      name: '',
      // picUrl 留空避免前端拼 ?param=300y300 撞坏代理 URL
      picUrl: '',
    },
  };
}

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

  // 优先 Meting 代理（国内 IP，不被风控）
  const list = await fetchPlaylistViaProxy(id);
  if (list) {
    return jsonResponse({
      playlist: {
        id: Number(id),
        name: '',
        coverImgUrl: '',
        creator: { nickname: '', avatarUrl: '' },
        tracks: list.map(metingItemToTrack).filter((t) => t.id != null),
      },
    });
  }

  // 兜底加密 weapi（EdgeOne 边缘 IP 上可能仍失败）
  try {
    const data = await netease.getPlaylist(id);
    return jsonResponse(data);
  } catch (err) {
    return errorResponse(`playlist fetch failed (proxy + weapi 都失败): ${err.message}`, 500);
  }
}
