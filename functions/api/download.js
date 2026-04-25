/**
 * @description: /api/download 端点 - 歌曲下载
 *               对齐原 api.php case 'download'，但已砍掉服务端缓存模式（direct=0 的 temp/ 缓存）
 *               - direct=1: 流式代理远程音频，加 Content-Disposition 让浏览器下载
 *               - 其他: 直接返回 { url } 让前端自己拉（省边缘流量）
 *               注意 EdgeOne Functions 30s 超时，>15MB 大文件可能被截断，建议前端用 direct=0 路径
 * @author: UG - 一个斗码大陆苦逼的三段码之气的少年，并没有神秘戒指中码老的帮助，但总有一天，我会成为斗码大陆中码帝一样的存在。三十年河东，三十年河西，莫欺少年穷。
 * @date: 2026-04-25
 */

import { errorResponse, handleOptions, parseParams, corsHeaders, jsonResponse } from '../_lib/cors.js';

function safeFilename(name, artist) {
  const s = `${name || 'download'}${artist ? ' - ' + artist : ''}.mp3`;
  // 去掉路径分隔符等危险字符
  return s.replace(/[\\/:*?"<>|\r\n]/g, '_');
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method === 'OPTIONS') return handleOptions();

  const params = await parseParams(request);
  const url = params.url;
  const name = params.name || 'download';
  const artist = params.artist || '';
  const direct = params.direct === '1' || params.direct === 1;

  if (!url) return errorResponse('missing url', 400);
  // 严格校验 url 协议（避免被滥用为通用代理）
  if (!/^https?:\/\//i.test(url)) {
    return errorResponse('invalid url protocol', 400);
  }

  if (!direct) {
    // 兼容旧 direct=0 路径：直接把 url 透给前端，前端自己拉，省边缘流量
    return jsonResponse({ url, downpath: url });
  }

  // direct=1: 流式代理
  try {
    const upstream = await fetch(url);
    if (!upstream.ok || !upstream.body) {
      return errorResponse(`upstream HTTP ${upstream.status}`, 502);
    }
    const filename = safeFilename(name, artist);
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': upstream.headers.get('content-length') || '',
        'Cache-Control': 'no-cache, must-revalidate',
        ...corsHeaders(),
      },
    });
  } catch (err) {
    return errorResponse(`download failed: ${err.message}`, 500);
  }
}
