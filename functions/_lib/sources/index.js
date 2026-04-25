/**
 * @description: 6 源汇总入口 - 让所有 endpoint 通过 SOURCES[source] 统一派发
 * @author: UG - 一个斗码大陆苦逼的三段码之气的少年，并没有神秘戒指中码老的帮助，但总有一天，我会成为斗码大陆中码帝一样的存在。三十年河东，三十年河西，莫欺少年穷。
 * @date: 2026-04-25
 */

import * as netease from './netease.js';
import * as tencent from './tencent.js';
import * as kugou from './kugou.js';
import * as baidu from './baidu.js';
import * as kuwo from './kuwo.js';
import * as xiami from './xiami.js';

export const SOURCES = { netease, tencent, kugou, baidu, kuwo, xiami };

export function getSource(name) {
  return SOURCES[name] || null;
}
