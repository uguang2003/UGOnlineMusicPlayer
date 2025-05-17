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
    rem.playid = playerState.playid || 0;

    // 恢复音量设置
    if (playerState.volume !== undefined && volume_bar) {
      volume_bar.goto(playerState.volume);
      if (playerState.volume === 0) $(".btn-quiet").addClass("btn-state-quiet"); // 添加静音样式
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
        rem.webTitle = document.title; // 保存网页标题

        // 设置音频源但不播放
        if (music.url && music.url !== "err") {
          rem.audio.attr('src', music.url);

          // 设置音频元素的加载完成事件
          $(rem.audio[0]).one('loadedmetadata', function () {
            updateProgress(playerState.currentTime);
          });
        } else {
          // 如果没有URL，先获取
          ajaxUrl(music, function (m) {
            rem.audio.attr('src', m.url);

            // 设置音频元素的加载完成事件
            $(rem.audio[0]).one('loadedmetadata', function () {
              updateProgress(playerState.currentTime);
            });
          });
        }

        // 使用setTimeout作为备用方案，如果loadedmetadata事件没有触发
        if (playerState.currentTime > 0) {
          setTimeout(function () {
            if (rem.audio && rem.audio[0] && rem.audio[0].duration) {
              updateProgress(playerState.currentTime);
            }
          }, 1500); // 给予更长的时间加载
        }

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

// 更新进度条和播放位置，但不影响进度条拖动功能
function updateProgress(currentTime) {
  if (!rem.audio[0] || !currentTime) return;

  // 确保时间在有效范围内
  if (currentTime > rem.audio[0].duration) {
    currentTime = 0;
  }

  // 更新播放位置
  rem.audio[0].currentTime = currentTime;

  // 更新进度条显示，但仅在非拖动状态下
  var percent = currentTime / rem.audio[0].duration;
  if (!isNaN(percent) && !music_bar.dragging) {
    music_bar.goto(percent);

    // 更新歌词显示
    scrollLyric(currentTime);
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

  // 获取当前播放/暂停的歌曲DOM元素
  var currentSong = $(".list-item[data-no='" + rem.playid + "']");

  // 如果找到了元素
  if (currentSong.length) {
    // 移除其他元素的高亮效果
    $(".list-item").removeClass("list-highlight");
    $(".list-item").removeClass("list-playing");

    // 给当前歌曲添加高亮效果，无论是播放还是暂停状态
    currentSong.addClass("list-highlight");

    // 如果是播放状态，添加播放样式
    if (!rem.paused) {
      currentSong.addClass("list-playing");
    }

    if (mkPlayer.debug) {
      console.log('[UG Music Player] 高亮当前歌曲，ID:', rem.playid, '状态:', rem.paused ? '暂停' : '播放');
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
  // 监听播放事件
  rem.audio[0].addEventListener('play', function () {
    rem.paused = false;
    highlightNowPlaying();
    // 播放时保存状态
    savePlayerState();
  });

  // 监听暂停事件
  rem.audio[0].addEventListener('pause', function () {
    rem.paused = true;
    highlightNowPlaying();
    // 暂停时保存状态
    savePlayerState();
  });

  // 监听播放进度变化事件
  rem.audio[0].addEventListener('timeupdate', function () {
    // 这里不需要频繁保存，已经有定时器在保存了
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
          var percent = 0;
          var barWidth = $(mk.bar).width();
          var offset = $(mk.bar).offset().left;

          // 计算点击位置对应的百分比
          if (e.clientX < offset) {
            percent = 0;
          } else if (e.clientX > offset + barWidth) {
            percent = 1;
          } else {
            percent = (e.clientX - offset) / barWidth;
          }

          // 调用回调函数，传入新的百分比
          if (mk.callback) mk.callback(percent);

          // 更新进度条显示
          mk.goto(percent);
        }
      });

      // 鼠标抬起事件，结束拖动
      $(document).off('mouseup.mkpgb').on('mouseup.mkpgb', function () {
        if (mk.dragging) {
          mk.dragging = false;
        }
      });

      return result;
    };
  }
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
      }
    }, 500);
  });
});
