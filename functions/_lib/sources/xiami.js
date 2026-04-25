/**
 * @description: 虾米音乐 fetcher - 占位实现
 *               虾米已于 2021 年 2 月正式停服 (https://www.thepaper.cn/newsDetail_forward_11410907)
 *               所有接口直接返回空，避免无意义的网络请求
 *               原 PHP 实现走 mtop.alimusic.* + MD5 签名 (Meting.php:1145-1176)
 *               若服务恢复，请参考 legacy-php/plugns-php/Meting.php case 'xiami' 重新实现
 * @author: UG - 一个斗码大陆苦逼的三段码之气的少年，并没有神秘戒指中码老的帮助，但总有一天，我会成为斗码大陆中码帝一样的存在。三十年河东，三十年河西，莫欺少年穷。
 * @date: 2026-04-25
 */

const SHUTDOWN_NOTICE = 'xiami service shut down (2021-02)';

export async function getUrl(_id, _br) {
  return { url: '', size: 0, br: -1, error: SHUTDOWN_NOTICE };
}

export async function search(_keyword, _count, _page) {
  return [];
}

export async function getLyric(_id) {
  return { lyric: '', tlyric: '' };
}

export function getPic(_id, _size) {
  return { url: '' };
}

export const SERVICE_GONE = SHUTDOWN_NOTICE;
