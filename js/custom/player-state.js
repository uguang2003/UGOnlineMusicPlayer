/**
 * UG音乐播放器 - 播放状态保存与恢复
 * 功能：
 * 1. 保存上次播放的歌曲
 * 2. 保存播放进度
 * 3. 保存音量大小
 * 4. 保存播放状态（播放/暂停）
 * 5. 在暂停状态下也高亮显示当前歌曲
 * 6. 确保进度条可拖动
 * 7. 修复切换歌单后的高亮问题
 */

// 保存当前播放状态（歌曲ID、播放位置、音量、暂停状态等）
function savePlayerState() {
  // 如果没有正在播放的歌曲，直接返回
  if (rem.playlist === undefined || rem.playid === undefined) return;

  // 获取当前歌曲
  var currentMusic = musicList[1].item[rem.playid];
  if (!currentMusic) return;
  // 保存播放信息
  var playerState = {
    playlist: rem.playlist,
    playid: rem.playid,
    currentTime: rem.audio[0] ? rem.audio[0].currentTime : 0,
    duration: rem.audio[0] ? rem.audio[0].duration : 0,
    paused: rem.paused,
    volume: volume_bar ? volume_bar.percent : mkPlayer.volume,
    order: rem.order || 2, // 保存播放顺序状态（默认为列表循环）
    musicInfo: currentMusic,
    timestamp: new Date().getTime()
  };

  // 保存到本地存储
  playerSavedata('playerState', playerState);

  if (mkPlayer.debug) {
    console.log('[UG Music Player] 已保存播放状态:', playerState);
  }
}

// 恢复上次播放的歌曲
function restorePlayerState() {
  var playerState = playerReaddata('playerState');
  if (!playerState) return;

  if (mkPlayer.debug) {
    console.log('[UG Music Player] 正在恢复播放状态:', playerState);
  }
  // 如果有上次播放的歌曲信息
  if (playerState && playerState.musicInfo) {
    // 设置播放列表和ID
    rem.playlist = playerState.playlist || 1;
    rem.playid = playerState.playid || 0;    // 恢复音量设置
    if (playerState.volume !== undefined && volume_bar) {
      volume_bar.goto(playerState.volume);
      if (playerState.volume === 0) $(".btn-quiet").addClass("btn-state-quiet"); // 添加静音样式
    }

    // 恢复播放顺序设置
    if (playerState.order !== undefined) {
      rem.order = playerState.order;
      updateOrderButtonUI(rem.order); // 更新播放顺序按钮的UI
      if (mkPlayer.debug) {
        console.log('[UG Music Player] 恢复播放顺序状态:', rem.order);
      }
    }

    // 如果是暂停状态或者不自动播放
    if (playerState.paused || !mkPlayer.autoplay) {
      // 不自动播放，只准备歌曲但不播放
      if (mkPlayer.debug) {
        console.log('[UG Music Player] 恢复为暂停状态或自动播放已关闭');
      }

      // 设置相关信息但不实际播放
      var music = musicList[1].item[rem.playid];
      if (music) {
        // 更新界面信息
        changeCover(music);  // 更新封面
        ajaxLyric(music, lyricCallback); // 获取歌词

        // 更新标题
        document.title = music.name + ' - ' + music.artist + ' - UG音乐播放器';
        rem.webTitle = document.title; // 保存网页标题        // 设置音频源但不播放
        if (music.url && music.url !== "err") {
          rem.audio.attr('src', music.url);

          // 设置音频元素的加载完成事件
          $(rem.audio[0]).one('loadedmetadata', function () {
            // 解锁进度条，确保可以拖动调整
            music_bar.lock(false);
            updateProgress(playerState.currentTime);
          });
        } else {
          // 如果没有URL，先获取
          ajaxUrl(music, function (m) {
            rem.audio.attr('src', m.url);

            // 设置音频元素的加载完成事件
            $(rem.audio[0]).one('loadedmetadata', function () {
              // 解锁进度条，确保可以拖动调整
              music_bar.lock(false);
              updateProgress(playerState.currentTime);
            });
          });
        }        // 使用setTimeout作为备用方案，如果loadedmetadata事件没有触发
        if (playerState.currentTime > 0) {
          setTimeout(function () {
            if (rem.audio && rem.audio[0] && rem.audio[0].duration) {
              // 无论如何都确保解锁进度条
              music_bar.lock(false);
              updateProgress(playerState.currentTime);
            }
          }, 1500); // 给予更长的时间加载
        }

        // 确保进度条在恢复播放时解锁
        music_bar.lock(false);

        // 设置为暂停状态
        rem.paused = true;

        // 高亮显示当前歌曲
        highlightNowPlaying();
      }
    } else {
      // 自动播放模式，从播放列表中播放歌曲
      playList(rem.playid);

      // 如果有保存播放位置，设置播放位置
      if (playerState.currentTime > 0 && rem.audio && rem.audio[0]) {
        // 等待音频加载完成后设置播放位置
        $(rem.audio[0]).one('canplay', function () {
          if (playerState.currentTime < rem.audio[0].duration) {
            rem.audio[0].currentTime = playerState.currentTime;
            highlightNowPlaying();
          }
        });
      }

      // 无论如何都高亮当前歌曲
      setTimeout(highlightNowPlaying, 800);
    }
  }
}

// 更新播放顺序按钮的UI显示
function updateOrderButtonUI(order) {
  var orderDiv = $(".btn-order");
  orderDiv.removeClass(); // 清除所有class

  switch (order) {
    case 1: // 单曲循环
      orderDiv.addClass("player-btn btn-order btn-order-single");
      orderDiv.attr("title", "单曲循环");
      break;
    case 2: // 列表循环
      orderDiv.addClass("player-btn btn-order btn-order-list");
      orderDiv.attr("title", "列表循环");
      break;
    case 3: // 随机播放
      orderDiv.addClass("player-btn btn-order btn-order-random");
      orderDiv.attr("title", "随机播放");
      break;
    default: // 默认为列表循环
      orderDiv.addClass("player-btn btn-order btn-order-list");
      orderDiv.attr("title", "列表循环");
      break;
  }
}

// 更新进度条和播放位置，但不影响进度条拖动功能
function updateProgress(currentTime) {
  if (!rem.audio[0]) return;

  // 验证currentTime是有效数值
  if (typeof currentTime !== 'number' || isNaN(currentTime) || !isFinite(currentTime)) {
    if (mkPlayer.debug) {
      console.log('[UG Music Player] 无效的时间值:', currentTime);
    }
    return;
  }

  // 确保时间在有效范围内
  if (!rem.audio[0].duration) {
    if (mkPlayer.debug) {
      console.log('[UG Music Player] 音频时长未知，无法设置进度');
    }
    return;
  }

  if (currentTime > rem.audio[0].duration) {
    currentTime = 0;
  }

  try {
    // 更新播放位置
    rem.audio[0].currentTime = currentTime;

    // 更新进度条显示，但仅在非拖动状态下
    var percent = currentTime / rem.audio[0].duration;
    if (!isNaN(percent) && isFinite(percent) && music_bar && typeof music_bar.dragging !== 'undefined' && !music_bar.dragging) {
      music_bar.goto(percent);

      // 强制更新歌词显示，确保歌词与进度同步
      if (typeof scrollLyric === 'function') {
        var timeInt = parseInt(currentTime);
        scrollLyric(timeInt);

        // 立即检查下一秒歌词
        if (rem.lyric && rem.lyric[timeInt + 1] !== undefined) {
          var nextLyricTime = (currentTime - timeInt) * 1000; // 毫秒
          if (nextLyricTime > 900) { // 接近下一秒
            scrollLyric(timeInt + 1);
          }
        }
      }
    }
  } catch (e) {
    console.error('[UG Music Player] 设置播放进度失败:', e);
  }

  if (mkPlayer.debug) {
    console.log('[UG Music Player] 更新进度条位置: ' + currentTime + '/' + rem.audio[0].duration + ' = ' + percent);
  }

  // 高亮显示当前歌曲
  highlightNowPlaying();
}

// 高亮当前播放/暂停的歌曲
function highlightNowPlaying() {
  // 如果没有正在播放/暂停的歌曲，直接返回
  if (rem.playlist === undefined || rem.playid === undefined) return;

  // 移除所有其他元素的高亮效果
  $(".list-item").removeClass("list-highlight");
  $(".list-item").removeClass("list-playing");

  // 获取当前播放的歌曲信息
  var currentMusic = musicList[1].item[rem.playid];
  if (!currentMusic || !currentMusic.id) return;

  var currentSong = null;

  // 在显示的列表中查找与当前播放歌曲匹配的元素（基于ID而不是位置）
  for (var i = 0; i < musicList[rem.dislist].item.length; i++) {
    var listMusic = musicList[rem.dislist].item[i];
    if (!listMusic || !listMusic.id) continue;

    // 比较歌曲ID和来源以确定是否为同一首歌
    if (listMusic.id == currentMusic.id &&
      listMusic.source == currentMusic.source) {
      currentSong = $(".list-item[data-no='" + i + "']");
      break; // 找到了就退出循环
    }
  }

  // 如果找到了元素
  if (currentSong && currentSong.length) {
    // 给当前歌曲添加高亮效果，无论是播放还是暂停状态
    currentSong.addClass("list-highlight");

    // 如果是播放状态，添加播放样式
    if (!rem.paused) {
      currentSong.addClass("list-playing");
    }

    if (mkPlayer.debug) {
      console.log('[UG Music Player] 高亮当前歌曲，ID:', currentMusic.id, '来源:', currentMusic.source, '状态:', rem.paused ? '暂停' : '播放');
    }
  }
}

// 确保进度条解锁状态的辅助函数
function ensureProgressBarUnlocked() {
  if (music_bar) {
    if (music_bar.locked) {
      music_bar.lock(false);
      if (mkPlayer.debug) {
        console.log('[UG Music Player] 强制解锁进度条');
      }
    }
  }
}

// 页面卸载前保存播放状态
window.addEventListener('beforeunload', function () {
  savePlayerState();
});

// 定期保存播放状态（每30秒保存一次）
setInterval(savePlayerState, 30000);

// 监听播放、暂停等事件，保持高亮状态
function setupStateListeners() {
  // 确保进度条解锁
  if (music_bar) {
    music_bar.lock(false);
    if (mkPlayer.debug) {
      console.log('[UG Music Player] 强制解锁进度条');
    }
  }

  // 监听播放事件
  rem.audio[0].addEventListener('play', function () {
    rem.paused = false;
    // 确保播放时进度条解锁
    if (music_bar) music_bar.lock(false);
    highlightNowPlaying();
    // 播放时保存状态
    savePlayerState();
  });

  // 监听暂停事件
  rem.audio[0].addEventListener('pause', function () {
    rem.paused = true;
    // 即使暂停，也保持进度条解锁
    if (music_bar) music_bar.lock(false);
    highlightNowPlaying();
    // 暂停时保存状态
    savePlayerState();
  });
  // 监听播放进度变化事件
  rem.audio[0].addEventListener('timeupdate', function () {
    // 这里不需要频繁保存，已经有定时器在保存了
    // 但确保进度条是解锁的
    if (music_bar && music_bar.locked) {
      music_bar.lock(false);
    }

    // 更新进度条位置
    if (music_bar && !music_bar.dragging && rem.audio[0] && rem.audio[0].duration) {
      var currentTime = rem.audio[0].currentTime;
      var percent = currentTime / rem.audio[0].duration;
      if (!isNaN(percent) && isFinite(percent)) {
        music_bar.goto(percent);
      }
    }

    // 强制同步歌词，确保歌词与进度条同步
    if (typeof scrollLyric === 'function' && rem.audio[0].currentTime) {
      var timeInt = parseInt(rem.audio[0].currentTime);
      if (rem.lastScrollLyricTime !== timeInt) {
        scrollLyric(timeInt);
        rem.lastScrollLyricTime = timeInt;
      }
    }
  });

  // 监听音频可播放事件，确保进度条解锁
  rem.audio[0].addEventListener('canplay', function () {
    if (music_bar) {
      music_bar.lock(false);

      // 在移动设备上添加额外的进度条点击支持
      if (rem.isMobile && $("#music-progress")) {
        $("#music-progress").off('click.mobile').on('click.mobile', function (e) {
          // 确保音频已加载且进度条未锁定
          if (rem.audio[0] && rem.audio[0].duration && !music_bar.locked) {
            var width = $(this).width();
            var offset = $(this).offset().left;
            var clickX = e.clientX || (e.originalEvent && e.originalEvent.changedTouches && e.originalEvent.changedTouches[0].clientX);

            if (clickX && width) {
              // 计算点击位置对应的百分比
              var percent = Math.max(0, Math.min(1, (clickX - offset) / width));

              // 应用新时间
              var newTime = rem.audio[0].duration * percent;
              rem.audio[0].currentTime = newTime;

              // 更新进度条和歌词
              music_bar.goto(percent);
              if (typeof scrollLyric === 'function') {
                scrollLyric(parseInt(newTime));
              }

              if (mkPlayer.debug) {
                console.log('[UG Music Player] 移动端点击进度条: ' + Math.round(percent * 100) + '%');
              }
            }
          }
        });
      }
    }
  });

  // 监听音量变化
  $("#volume-progress").on('click', function () {
    // 音量变化时保存状态
    setTimeout(savePlayerState, 100); // 短暂延迟等音量更新完成
  });

  // 监听静音按钮
  $(".btn-quiet").on('click', function () {
    // 静音状态改变时保存状态
    setTimeout(savePlayerState, 100); // 短暂延迟等音量更新完成
  });

  // 监听歌曲切换事件
  $(document).on('playlist_change', function () {
    highlightNowPlaying();
    // 歌曲切换时保存状态
    savePlayerState();
  });
}

// 修复进度条拖动功能
function enhanceProgressBar() {
  // 扩展原始的 mkpgb 原型
  if (mkpgb && mkpgb.prototype) {
    // 添加拖动状态标志
    mkpgb.prototype.dragging = false;

    // 保存原始的初始化方法
    var originalInit = mkpgb.prototype.init;

    // 覆盖初始化方法
    mkpgb.prototype.init = function () {
      var result = originalInit.apply(this, arguments);
      var mk = this;

      // 增强鼠标事件处理
      $(mk.bar).off('mousedown').on('mousedown', function (e) {
        if (!mk.locked) {
          mk.dragging = true;
          $(mk.bar).addClass("mkpgb-dragging"); // 添加拖动中样式

          var percent = calculateBarPercent(e, mk);

          // 调用回调函数，传入新的百分比
          if (mk.callback) mk.callback(percent);

          // 更新进度条显示
          mk.goto(percent);

          // 拖动时更新歌词
          if (rem.audio[0] && rem.audio[0].duration && typeof scrollLyric === 'function') {
            var currentTime = rem.audio[0].duration * percent;
            scrollLyric(parseInt(currentTime));
          }
        }
      });

      // 鼠标移动事件，处理拖动
      $(document).off('mousemove.mkpgb').on('mousemove.mkpgb', function (e) {
        if (mk.dragging && !mk.locked) {
          var percent = calculateBarPercent(e, mk);

          // 调用回调函数，传入新的百分比
          if (mk.callback) mk.callback(percent);

          // 更新进度条显示
          mk.goto(percent);

          // 拖动时更新歌词
          if (rem.audio[0] && rem.audio[0].duration && typeof scrollLyric === 'function') {
            var currentTime = rem.audio[0].duration * percent;
            scrollLyric(parseInt(currentTime));
          }
        }
      });

      // 鼠标抬起事件，结束拖动
      $(document).off('mouseup.mkpgb').on('mouseup.mkpgb', function () {
        if (mk.dragging) {
          mk.dragging = false;
          $(mk.bar).removeClass("mkpgb-dragging"); // 移除拖动中样式
        }
      });      // 移动设备触摸事件支持 - 增强版
      if (rem.isMobile) {
        // 为整个进度条区域添加触摸事件，不仅仅是进度条本身
        $('#music-progress').off('touchstart').on('touchstart', function (e) {
          if (!mk.locked) {
            e.preventDefault(); // 阻止默认行为
            e.stopPropagation(); // 阻止冒泡

            mk.dragging = true;
            $(mk.bar).addClass("mkpgb-dragging"); // 添加拖动中样式

            // 获取触摸点
            var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
            var percent = calculateBarPercentTouch(touch, mk);

            // 调用回调函数
            if (mk.callback) mk.callback(percent);

            // 更新进度条显示
            mk.goto(percent);

            // 触摸时更新歌词
            if (rem.audio[0] && rem.audio[0].duration && typeof scrollLyric === 'function') {
              var currentTime = rem.audio[0].duration * percent;
              scrollLyric(parseInt(currentTime));
            }

            if (mkPlayer.debug) {
              console.log('[UG Music Player] 移动端进度条触摸开始:', Math.round(percent * 100) + '%');
            }
          }
        });

        // 触摸移动事件 - 增强版
        $(document).off('touchmove.mkpgb').on('touchmove.mkpgb', function (e) {
          if (mk.dragging && !mk.locked) {
            e.preventDefault(); // 阻止默认滚动
            e.stopPropagation(); // 阻止冒泡            // 获取触摸点
            var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
            var percent = calculateBarPercentTouch(touch, mk);

            // 调用回调函数
            if (mk.callback) mk.callback(percent);

            // 更新进度条显示
            mk.goto(percent);

            // 触摸移动时更新歌词
            if (rem.audio[0] && rem.audio[0].duration && typeof scrollLyric === 'function') {
              var currentTime = rem.audio[0].duration * percent;
              scrollLyric(parseInt(currentTime));
            }

            if (mkPlayer.debug) {
              console.log('[UG Music Player] 移动端进度条拖动中:', Math.round(percent * 100) + '%');
            }
          }
        });

        // 触摸结束事件 - 增强版
        $(document).off('touchend.mkpgb touchcancel.mkpgb').on('touchend.mkpgb touchcancel.mkpgb', function (e) {
          if (mk.dragging) {
            e.preventDefault(); // 阻止默认行为
            e.stopPropagation(); // 阻止冒泡

            // 获取触摸点
            var touch = e.originalEvent.changedTouches[0];
            var percent = calculateBarPercentTouch(touch, mk);

            // 更新音频当前时间
            if (rem.audio[0] && rem.audio[0].duration) {
              var newTime = rem.audio[0].duration * percent;
              rem.audio[0].currentTime = newTime;

              // 更新歌词
              if (typeof scrollLyric === 'function') {
                scrollLyric(parseInt(newTime));
              }
            }

            mk.dragging = false;
            $(mk.bar).removeClass("mkpgb-dragging"); // 移除拖动中样式

            if (mkPlayer.debug) {
              console.log('[UG Music Player] 移动端进度条触摸结束:', Math.round(percent * 100) + '%');
            }
          }
        });
      }

      return result;
    };

    // 修复goto方法，确保它可以正确设置点的位置
    var originalGoto = mkpgb.prototype.goto;
    mkpgb.prototype.goto = function (percent) {
      // 确保参数有效
      if (typeof percent !== 'number' || isNaN(percent) || !isFinite(percent)) {
        console.error("[UG Music Player] 进度条设置无效值:", percent);
        return false;
      }

      // 调用原始goto方法
      return originalGoto.apply(this, arguments);
    };
  }
}

// 计算点击或拖动位置对应的百分比（鼠标事件）
function calculateBarPercent(e, mk) {
  var barWidth = $(mk.bar).width();
  var offset = $(mk.bar).offset().left;
  var percent = 0;

  // 计算点击位置对应的百分比
  if (e.clientX < offset) {
    percent = 0;
  } else if (e.clientX > offset + barWidth) {
    percent = 1;
  } else {
    percent = (e.clientX - offset) / barWidth;
  }

  // 确保百分比在有效范围内
  if (percent < 0) percent = 0;
  if (percent > 1) percent = 1;

  return percent;
}

// 计算触摸位置对应的百分比（触摸事件）
function calculateBarPercentTouch(touch, mk) {
  var barWidth = $(mk.bar).width();
  var offset = $(mk.bar).offset().left;
  var percent = 0;

  // 计算触摸位置对应的百分比
  if (touch.clientX < offset) {
    percent = 0;
  } else if (touch.clientX > offset + barWidth) {
    percent = 1;
  } else {
    percent = (touch.clientX - offset) / barWidth;
  }

  // 确保百分比在有效范围内
  if (percent < 0) percent = 0;
  if (percent > 1) percent = 1;

  if (mkPlayer.debug) {
    console.log('[UG Music Player] 触摸进度条: ' + Math.round(percent * 100) + '%');
  }

  return percent;
}

// 在播放器初始化完成后执行
$(document).ready(function () {
  if (mkPlayer.debug) {
    console.log('[UG Music Player] 初始化状态保存与恢复功能');
  }

  // 增强进度条功能
  enhanceProgressBar();
  // 延迟一点时间等播放器完全初始化后恢复播放状态
  setTimeout(function () {
    restorePlayerState();
    setupStateListeners();

    // 添加额外检查，确保进度条解锁
    setTimeout(function () {
      if (music_bar) {
        music_bar.lock(false);
        if (mkPlayer.debug) {
          console.log('[UG Music Player] 额外检查: 确保进度条已解锁');
        }
      }
    }, 2000);
  }, 1000);

  // 修复切换歌单后的高亮和播放问题
  // 重新定义刷新列表函数
  var originalRefreshList = window.refreshList;
  if (originalRefreshList) {
    window.refreshList = function () {
      // 调用原始函数
      originalRefreshList.apply(this, arguments);
      // 调用我们自己的高亮函数
      setTimeout(highlightNowPlaying, 100);
    };
  }
  // 监听歌单切换事件
  $(document).on('click', "#sheet .sheet-item", function () {
    var num = parseInt($(this).data("no"));
    if (isNaN(num)) return;

    // 歌单切换时，记录当前歌单
    setTimeout(function () {
      if (rem.playlist !== undefined && rem.playid !== undefined) {
        savePlayerState();

        // 强制刷新列表高亮
        highlightNowPlaying();
      }
    }, 500);
  });
  // 监听列表项点击事件，确保正确高亮和进度条解锁
  $(document).on('click', ".music-list .list-item", function () {
    setTimeout(function () {
      highlightNowPlaying();
      ensureProgressBarUnlocked();
    }, 200);
  });

  // 修复加载列表时的问题
  var originalLoadList = window.loadList;
  if (originalLoadList) {
    window.loadList = function (list) {
      // 调用原始加载列表函数
      originalLoadList.apply(this, arguments);

      // 延迟添加高亮效果，确保列表已经渲染完成
      setTimeout(function () {
        highlightNowPlaying();
      }, 300);
    };
  }  // 额外增强移动设备上的进度条点击/拖动支持
  if (rem.isMobile) {
    // 处理进度条点击和触摸事件的通用函数
    function handleProgressInteraction(e) {
      // 阻止事件冒泡到播放器其他区域
      e.stopPropagation();

      // 对于触摸事件，阻止默认行为
      if (e.type === 'touchstart') {
        e.preventDefault();
      }

      // 确保音频已加载
      if (!rem.audio[0] || !rem.audio[0].duration || !music_bar) return;

      // 计算点击位置
      var progressBox = $('#music-progress');
      var offset = progressBox.offset();
      var width = progressBox.width();

      // 获取点击/触摸位置
      var clientX;
      if (e.type === 'touchstart') {
        clientX = e.touches[0].clientX;
      } else {
        clientX = e.clientX;
      }

      // 计算百分比
      var percent = Math.max(0, Math.min(1, (clientX - offset.left) / width));

      // 设置新的播放位置
      var newTime = rem.audio[0].duration * percent;
      rem.audio[0].currentTime = newTime;

      // 更新进度条和歌词
      music_bar.goto(percent);
      if (typeof scrollLyric === 'function') {
        scrollLyric(parseInt(newTime));
      }

      if (mkPlayer.debug) {
        console.log('[UG Music Player] 进度条' + e.type + ':', Math.round(percent * 100) + '%');
      }
    }

    // 为点击事件添加处理程序
    var progressBoxes = document.querySelectorAll('.progress-box');
    progressBoxes.forEach(function (box) {
      box.addEventListener('click', handleProgressInteraction);
    });

    // 触摸开始时记录初始位置
    progressBoxes.forEach(function (box) {
      box.addEventListener('touchstart', function (e) {
        // 记录拖动状态
        rem.touchDragging = true;
        // 记录开始触摸时间（用于区分点击和拖动）
        rem.touchStartTime = new Date().getTime();
        // 阻止默认行为和事件冒泡
        e.preventDefault();
        e.stopPropagation();

        // 添加活动样式
        $('#music-progress').addClass('mkpgb-active');
      }, { passive: false });
    });

    // 处理触摸移动 - 使用addEventListener并设置passive:false
    document.addEventListener('touchmove', function (e) {
      if (rem.touchDragging && rem.audio[0] && rem.audio[0].duration) {
        // 阻止默认行为和事件冒泡
        e.preventDefault();
        e.stopPropagation();

        // 获取触摸点和进度条信息
        var touch = e.touches[0] || e.changedTouches[0];
        var progressBox = $('#music-progress');
        var offset = progressBox.offset();
        var width = progressBox.width();

        // 计算百分比
        var percent = Math.max(0, Math.min(1, (touch.clientX - offset.left) / width));

        // 更新进度条
        music_bar.goto(percent);

        // 更新播放位置
        var newTime = rem.audio[0].duration * percent;
        rem.audio[0].currentTime = newTime;

        // 更新歌词
        if (typeof scrollLyric === 'function') {
          scrollLyric(parseInt(newTime));
        }

        // 添加拖动样式
        $('#music-progress').addClass('mkpgb-dragging');
      }
    }, { passive: false });

    // 处理触摸结束 - 使用addEventListener并设置passive选项
    function handleTouchEnd(e) {
      if (rem.touchDragging) {
        // 阻止事件冒泡
        e.stopPropagation();

        rem.touchDragging = false;
        $('#music-progress').removeClass('mkpgb-dragging');
        $('#music-progress').removeClass('mkpgb-active');

        // 添加延迟状态重置，确保用户看到状态变化
        setTimeout(function () {
          $('#music-progress').blur();
        }, 150);
      }
    }

    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('touchcancel', handleTouchEnd, { passive: false });
  }
});
