/**
 * @description: 各音源响应格式化工具 - 把不同源的歌曲对象统一成前端期望的字段集
 *               前端 (js/ajax.js) 期望的字段:
 *                 { id, name, artist[], album, source, url_id, pic_id, lyric_id }
 *               注意 artist 必须是数组 (ajaxSearch 第 97 行硬编码访问 artist[0])
 * @author: UG - 一个斗码大陆苦逼的三段码之气的少年，并没有神秘戒指中码老的帮助，但总有一天，我会成为斗码大陆中码帝一样的存在。三十年河东，三十年河西，莫欺少年穷。
 * @date: 2026-04-25
 */

/**
 * 网易云歌曲对象 → 前端格式
 * 输入: cloudsearch 接口返回的 result.songs[i]
 */
export function formatNeteaseSong(raw) {
  return {
    id: raw.id,
    name: raw.name,
    artist: (raw.ar || raw.artists || []).map((a) => a.name),
    album: (raw.al || raw.album || {}).name || '',
    pic_id: (raw.al || raw.album || {}).pic_str || (raw.al || raw.album || {}).pic || '',
    url_id: raw.id,
    lyric_id: raw.id,
    source: 'netease',
  };
}

/**
 * QQ 音乐搜索结果格式化
 */
export function formatTencentSong(raw) {
  return {
    id: raw.songmid || raw.mid,
    name: raw.songname || raw.title || raw.name,
    artist: (raw.singer || []).map((s) => s.name),
    album: raw.albumname || (raw.album && raw.album.name) || '',
    pic_id: raw.albummid || (raw.album && raw.album.mid) || '',
    url_id: raw.songmid || raw.mid,
    lyric_id: raw.songid || raw.id,
    source: 'tencent',
  };
}

/**
 * 酷狗搜索结果格式化
 */
export function formatKugouSong(raw) {
  // 酷狗 SongName 格式 "歌手 - 歌曲名"
  const fullName = raw.SongName || raw.filename || '';
  const parts = fullName.split(' - ');
  return {
    id: raw.hash || raw.FileHash,
    name: parts.length > 1 ? parts.slice(1).join(' - ') : fullName,
    artist: parts.length > 1 ? [parts[0]] : (raw.SingerName ? [raw.SingerName] : []),
    album: raw.AlbumName || '',
    pic_id: raw.AlbumID || '',
    url_id: raw.hash || raw.FileHash,
    lyric_id: raw.hash || raw.FileHash,
    source: 'kugou',
  };
}

/**
 * 百度音乐结果格式化
 */
export function formatBaiduSong(raw) {
  return {
    id: raw.song_id || raw.songid,
    name: raw.title || raw.songname,
    artist: (raw.author || raw.singer || '').split(','),
    album: raw.album_title || raw.albumname || '',
    pic_id: raw.pic_big || raw.pic || '',
    url_id: raw.song_id || raw.songid,
    lyric_id: raw.song_id || raw.songid,
    source: 'baidu',
  };
}

/**
 * 酷我音乐结果格式化
 */
export function formatKuwoSong(raw) {
  return {
    id: raw.rid || raw.musicrid,
    name: raw.name || raw.songname,
    artist: [raw.artist || raw.artistName || ''],
    album: raw.album || '',
    pic_id: raw.pic || raw.albumpic || '',
    url_id: raw.rid || raw.musicrid,
    lyric_id: raw.rid || raw.musicrid,
    source: 'kuwo',
  };
}

/**
 * 虾米音乐结果格式化
 */
export function formatXiamiSong(raw) {
  return {
    id: raw.songId || raw.song_id,
    name: raw.songName || raw.song_name,
    artist: [raw.singers || raw.artist_name || ''],
    album: raw.albumName || raw.album_name || '',
    pic_id: raw.albumLogo || raw.album_logo || '',
    url_id: raw.songId || raw.song_id,
    lyric_id: raw.songId || raw.song_id,
    source: 'xiami',
  };
}

/**
 * 按 source 派发到对应 formatter
 */
export function formatSongBySource(raw, source) {
  switch (source) {
    case 'netease':
      return formatNeteaseSong(raw);
    case 'tencent':
      return formatTencentSong(raw);
    case 'kugou':
      return formatKugouSong(raw);
    case 'baidu':
      return formatBaiduSong(raw);
    case 'kuwo':
      return formatKuwoSong(raw);
    case 'xiami':
      return formatXiamiSong(raw);
    default:
      throw new Error(`unknown source: ${source}`);
  }
}

/**
 * 统一的 url 响应格式（前端 ajaxUrl 期望 { url, size, br }）
 */
export function formatUrlResponse(url, size = 0, br = 320) {
  if (!url) return { url: '', size: 0, br: -1 };
  return { url, size, br };
}
