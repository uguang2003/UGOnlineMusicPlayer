/**
 * @description: HTTP 响应工具 - CORS 头、JSON 响应、错误响应、OPTIONS 预检
 * @author: UG - 一个斗码大陆苦逼的三段码之气的少年，并没有神秘戒指中码老的帮助，但总有一天，我会成为斗码大陆中码帝一样的存在。三十年河东，三十年河西，莫欺少年穷。
 * @date: 2026-04-25
 */

/**
 * 生成 CORS 头（默认允许所有源，前端在同域时同样有效）
 */
export function corsHeaders(origin = '*') {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With, Cookie',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * 标准 JSON 响应（自动加 CORS 头）
 */
export function jsonResponse(data, init = {}) {
  return new Response(JSON.stringify(data), {
    status: init.status ?? 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders(),
      ...(init.headers ?? {}),
    },
  });
}

/**
 * 错误响应
 */
export function errorResponse(message, status = 500, extra = {}) {
  return jsonResponse({ error: message, code: status, ...extra }, { status });
}

/**
 * OPTIONS 预检响应
 */
export function handleOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

/**
 * 解析请求参数，兼容 GET query 与 POST x-www-form-urlencoded / JSON / multipart
 *
 * 重要：不要对 urlencoded 调 request.formData()，EdgeOne / 部分 V8 isolate 实现
 * 对 application/x-www-form-urlencoded 的 formData() 行为不一致（可能解析失败但不抛错）
 * 改用 text() + URLSearchParams，兼容性最稳
 */
export async function parseParams(request) {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());

  if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
    const ct = (request.headers.get('content-type') || '').toLowerCase();
    try {
      if (ct.includes('application/json')) {
        const body = await request.json();
        if (body && typeof body === 'object') Object.assign(params, body);
      } else if (ct.includes('multipart/form-data')) {
        // multipart 必须用 formData()
        const fd = await request.formData();
        for (const [k, v] of fd.entries()) {
          params[k] = typeof v === 'string' ? v : v.name;
        }
      } else {
        // urlencoded、空 content-type、任意未知 → 按 urlencoded 文本解析
        const text = await request.text();
        if (text) {
          const sp = new URLSearchParams(text);
          for (const [k, v] of sp.entries()) params[k] = v;
        }
      }
    } catch {
      // 解析失败保持 GET 参数即可
    }
  }
  return params;
}
