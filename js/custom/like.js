// "喜欢"按钮点击事件
$(".btn-like").click(function () {
  // 检查按钮是否已经是"喜欢"状态
  if ($(this).hasClass('btn-state-liked')) {
    toggleDisLike();
  } else {
    toggleLike();
  }
});

/**
 * 添加或移除歌曲到"我喜欢"列表的功能实现
 */

// 添加到"我喜欢"列表
function toggleLike() {
  // 检查是否有当前播放的歌曲
  if (rem.playlist === undefined || rem.playid === undefined) {
    layer.msg('请先播放歌曲');
    return false;
  }

  // 确保正在播放列表和播放ID有效
  if (!musicList[1] || !musicList[1].item || !musicList[1].item[rem.playid]) {
    layer.msg('当前没有正在播放的歌曲');
    return false;
  }

  // 获取当前歌曲的ID
  var currentSong = musicList[1].item[rem.playid];

  // 仅支持网易云音乐
  if (currentSong.source !== 'netease') {
    layer.msg('只有网易云音乐的歌曲才能添加到我喜欢');
    return false;
  }

  // 添加到"我喜欢" - 不再立即更新按钮状态，等待API调用成功后更新
  addOrRemoveLike(currentSong.id, true);
}

// 从"我喜欢"列表移除
function toggleDisLike() {
  // 检查是否有当前播放的歌曲
  if (rem.playlist === undefined || rem.playid === undefined) {
    layer.msg('请先播放歌曲');
    return false;
  }

  // 确保正在播放列表和播放ID有效
  if (!musicList[1] || !musicList[1].item || !musicList[1].item[rem.playid]) {
    layer.msg('当前没有正在播放的歌曲');
    return false;
  }

  // 获取当前歌曲的ID
  var currentSong = musicList[1].item[rem.playid];

  // 仅支持网易云音乐
  if (currentSong.source !== 'netease') {
    layer.msg('只有网易云音乐的歌曲才能从我喜欢移除');
    return false;
  }

  // 弹出确认窗口询问用户是否确认取消喜欢
  layer.confirm('确定要将"' + currentSong.name + '"从我喜欢移除吗？', {
    btn: ['确定', '取消'],
    title: '确认移除'
  }, function (index) {
    // 用户点击确定，执行移除操作
    layer.close(index);
    // 从"我喜欢"移除
    addOrRemoveLike(currentSong.id, false);
  }, function () {
    // 用户点击取消，什么也不做
  });
}

// 调用API添加或移除歌曲
function addOrRemoveLike(songId, isAdd) {
  // 显示加载提示
  var loadingIndex = layer.msg('处理中...', { icon: 16, shade: 0.01, time: 0 });

  // 从本地存储获取网易云Cookie
  var netease_cookie = playerReaddata('netease_cookie') || '';

  if (!netease_cookie) {
    layer.close(loadingIndex);
    layer.msg('请先设置网易云音乐Cookie', { icon: 2 });

    // 如果存在Cookie设置按钮，则点击它
    if ($("#open-cookie-btn").length > 0 || $(".open-cookie-btn").length > 0) {
      setTimeout(function () {
        $("#open-cookie-btn, .open-cookie-btn").first().click();
      }, 1000);
    }
    return false;
  }

  // 请求参数
  var params = {
    "types": "like",
    "source": "netease",
    "id": songId,
    "like": isAdd ? "1" : "0",
    "cookie": netease_cookie, // 在请求参数中直接添加cookie
    "clear_cache": "1"        // 添加清除缓存参数
  };

  // 发送请求
  $.ajax({
    url: 'api.php',
    type: 'POST',
    dataType: 'json',
    data: params,
    xhrFields: {
      withCredentials: true  // 确保请求发送cookie
    },
    crossDomain: true,  // 允许跨域请求
    success: function (result) {
      // 关闭加载提示
      layer.close(loadingIndex);

      // 显示操作结果
      if (result.code === 200) {
        layer.msg(result.msg, { icon: 1 });

        // 立即更新按钮状态，不等待API回调
        if (isAdd) {
          // 添加到我喜欢 - 更新为已喜欢状态
          $(".btn-like").addClass('btn-state-liked');
          $(".btn-like").attr('title', '从我喜欢移除');
        } else {
          // 从我喜欢移除 - 更新为未喜欢状态
          $(".btn-like").removeClass('btn-state-liked');
          $(".btn-like").attr('title', '添加到我喜欢');
        }

        // 清除服务器和本地的歌单缓存
        clearAllCaches();

        // 刷新用户歌单数据
        refreshUserLikedPlaylist();
      } else {
        layer.msg(result.msg, { icon: 2 });
        console.error("喜欢操作失败，错误信息：", result);
      }
    },
    error: function (xhr, status, error) {
      // 关闭加载提示
      layer.close(loadingIndex);

      // 显示详细错误信息
      console.error("AJAX错误：", xhr.responseText);
      layer.msg('网络错误：' + (xhr.status || '未知错误') + '，请稍后再试', { icon: 2 });
    }
  });
}

// 清除所有相关缓存（服务器端和本地）
function clearAllCaches() {
  // 清除服务器端缓存
  $.ajax({
    url: 'api.php',
    type: 'POST',
    dataType: 'json',
    data: {
      "types": "cache",
      "minute": 0,  // 设置为0表示清除所有缓存文件
      "force_clear": 1 // 强制清除
    },
    async: true,
    success: function (data) {
      console.log("服务器缓存清理结果：", data);
    },
    error: function () {
      console.error("服务器缓存清理失败");
    }
  });

  // 清除本地存储的歌单缓存
  var uid = playerReaddata('uid');
  if (uid) {
    clearUserPlaylistCache(uid);
  }
}

// 仅清除用户相关的歌单缓存
function clearUserPlaylistCache(uid) {
  // 清除用户歌单列表缓存，但不删除其他系统歌单缓存
  var userData = playerReaddata('ulist');
  if (userData && Array.isArray(userData)) {
    // 获取用户所有歌单的ID
    var userPlaylistIds = userData.map(function (playlist) {
      return playlist.id;
    });

    // 只清除这些歌单的缓存
    for (var i = 0; i < userPlaylistIds.length; i++) {
      var playlistId = userPlaylistIds[i];
      // 清除localStorage中的缓存
      if (localStorage["mkplayer_playlist_" + playlistId]) {
        localStorage.removeItem("mkplayer_playlist_" + playlistId);
      }
      // 只清除特定歌单的缓存，而不是所有以UGPlayer_开头的本地存储
      if (localStorage["UGPlayer_playlist_" + playlistId]) {
        localStorage.removeItem("UGPlayer_playlist_" + playlistId);
      }
    }
  }

  // 清除用户歌单列表的缓存
  playerSavedata('ulist', '');

  // 尝试清除服务器上特定的用户歌单缓存
  if (uid) {
    $.ajax({
      url: 'api.php',
      type: 'POST',
      dataType: 'json',
      data: {
        "types": "clear_user_cache",
        "uid": uid
      },
      async: true
    });
  }
}

// 刷新用户的"我喜欢"歌单
function refreshUserLikedPlaylist() {
  // 获取用户ID
  var uid = playerReaddata('uid');
  if (!uid) {
    console.log("未找到用户ID，无法刷新歌单");
    return false;
  }

  // 通知用户正在刷新歌单数据
  layer.msg('正在刷新歌单数据...', { icon: 16, time: 1500 });

  // 只清除用户相关的歌单缓存，而不是所有歌单
  clearUserPlaylistCache(uid);

  // 调用API强制刷新歌单数据
  $.ajax({
    url: 'api.php',
    type: 'POST',
    dataType: 'json',
    data: {
      "types": "userlist",
      "uid": uid,
      "force_refresh": "1", // 强制刷新参数
      "cookie": playerReaddata('netease_cookie') || '' // 发送cookie确保获取最新数据
    },
    success: function (result) {
      // 如果成功获取到歌单数据
      if (result && result.playlist) {
        // 格式化用户歌单为正确的格式
        var formattedPlaylists = [];
        for (var i = 0; i < result.playlist.length; i++) {
          var playlist = result.playlist[i];
          formattedPlaylists.push({
            id: playlist.id,                      // 歌单ID
            name: playlist.name,                  // 歌单名称
            cover: playlist.coverImgUrl + "?param=200y200", // 歌单封面
            creatorID: uid,                       // 创建者ID
            creatorName: playlist.creator.nickname, // 创建者名称
            creatorAvatar: playlist.creator.avatarUrl, // 创建者头像
            item: []                              // 歌曲项（初始为空）
          });
        }

        // 保存格式化后的用户歌单
        playerSavedata('ulist', formattedPlaylists);

        // 重新获取用户歌单数据
        clearUserlist();

        // 如果当前有播放列表是用户的歌单，并且是"我喜欢"列表，则刷新它
        refreshCurrentPlayingList();

        // 触发歌单更新事件
        $(document).trigger('showUG666Playlists');

        // 通知用户刷新完成
        layer.msg('歌单数据已更新', { icon: 1 });
      } else {
        // 获取歌单失败
        layer.msg('获取歌单数据失败', { icon: 2 });
        console.error("歌单数据刷新失败", result);
      }
    },
    error: function (xhr, status, error) {
      // 请求失败
      layer.msg('网络错误，歌单刷新失败', { icon: 2 });
      console.error("歌单刷新失败", error);
    }
  });

  return true;
}

// 刷新当前正在播放的列表
function refreshCurrentPlayingList() {
  // 记住当前正在播放的歌曲ID，在刷新后用于定位
  var currentPlayingSongId = null;
  if (rem.playlist !== undefined && rem.playid !== undefined &&
    musicList[1] && musicList[1].item && musicList[1].item[rem.playid]) {
    currentPlayingSongId = musicList[1].item[rem.playid].id;
  }

  // 如果正在播放列表是用户的歌单，尤其是"我喜欢"歌单
  if (rem.playlist !== undefined && typeof rem.playlist === 'number') {
    var playlistType = rem.playlist;

    // 获取用户歌单数据
    var userData = playerReaddata('ulist');
    if (userData && Array.isArray(userData) && userData.length > 0) {
      // 检查当前播放的是否是用户歌单或"我喜欢"歌单
      if (playlistType === 0) { // 0表示"我喜欢"歌单
        // 清除当前播放列表的缓存
        if (musicList[playlistType]) {
          // 重新载入歌单
          loadList(playlistType);

          // 如果之前有播放的歌曲，尝试找到相同ID的歌曲并继续播放
          if (currentPlayingSongId !== null) {
            // 等待歌单加载完成后查找歌曲
            setTimeout(function () {
              // 查找歌曲在新歌单中的位置
              var newIndex = -1;
              if (musicList[playlistType] && musicList[playlistType].item) {
                for (var i = 0; i < musicList[playlistType].item.length; i++) {
                  if (musicList[playlistType].item[i].id == currentPlayingSongId) {
                    newIndex = i;
                    break;
                  }
                }
              }

              // 如果找到了歌曲，更新播放ID
              if (newIndex != -1) {
                rem.playid = newIndex;
                // 更新播放进度条和界面
                loadedmetadata();
              }
            }, 1000);
          }
        }
      }
    }
  }

  // 检查并更新正在播放列表中的歌曲状态
  updateNowPlayingListStatus(currentPlayingSongId);
}

// 更新正在播放列表中歌曲的"我喜欢"状态
function updateNowPlayingListStatus(currentPlayingSongId) {
  // 确保"正在播放"列表存在
  if (!musicList[1] || !musicList[1].item || !musicList[1].item.length) {
    return false;
  }

  // 获取用户的"我喜欢"歌单
  var userPlaylists = playerReaddata('ulist');
  if (!userPlaylists || !userPlaylists.length) {
    return false;
  }

  // "我喜欢"歌单通常是第一个歌单
  var likedPlaylist = userPlaylists[0];
  if (!likedPlaylist || !likedPlaylist.item || !likedPlaylist.item.length) {
    return false;
  }

  // 创建一个歌曲ID的映射，方便快速查找歌曲是否在"我喜欢"中
  var likedSongsMap = {};
  for (var i = 0; i < likedPlaylist.item.length; i++) {
    likedSongsMap[likedPlaylist.item[i].id] = true;
  }

  // 记住当前的播放状态
  var currentPlaylistIndex = rem.playlist;
  var currentPlayId = rem.playid;
  var currentPosition = 0;

  if (currentPlayingSongId !== null) {
    // 查找当前歌曲在"正在播放"列表中的新位置
    for (var i = 0; i < musicList[1].item.length; i++) {
      if (musicList[1].item[i].id == currentPlayingSongId) {
        currentPosition = i;

        // 如果找到了当前播放的歌曲，但是其索引与rem.playid不一致，则更新rem.playid
        if (rem.playlist === 1 && rem.playid !== i) {
          console.log("匹配到当前播放歌曲，索引从", rem.playid, "更新为", i);
          rem.playid = i;

          // 更新播放进度条和界面
          setTimeout(function () {
            refreshList();
            loadedmetadata();
          }, 100);
        }
        break;
      }
    }
  }

  // 遍历"正在播放"列表中的所有歌曲，更新喜欢状态
  for (var i = 0; i < musicList[1].item.length; i++) {
    var song = musicList[1].item[i];
    // 只检查网易云音乐的歌曲
    if (song.source === 'netease') {
      // 检查歌曲是否在"我喜欢"列表中
      if (likedSongsMap[song.id]) {
        // 如果在列表中，标记为已喜欢
        song.liked = true;
      } else {
        // 如果不在列表中，标记为未喜欢
        song.liked = false;
      }
    }
  }

  // 刷新当前歌曲在界面上的"喜欢"状态
  updateLikeButtonState();

  // 如果当前正在播放列表是在显示中，则刷新界面
  if (rem.dislist === 1) {
    setTimeout(function () {
      refreshList();
    }, 200);
  }

  return true;
}

// 检查歌曲是否在"我喜欢"歌单列表中
function checkSongInLikedList(songId) {
  // 从本地存储获取用户歌单
  var userPlaylists = playerReaddata('ulist');
  if (!userPlaylists || !userPlaylists.length) {
    // 如果没有用户歌单数据，无法判断
    return false;
  }

  // "我喜欢"歌单通常是第一个歌单
  var likedPlaylist = userPlaylists[0];
  if (!likedPlaylist || !likedPlaylist.item || !likedPlaylist.item.length) {
    // 获取用户ID
    var uid = playerReaddata('uid');
    if (uid) {
      // 如果有用户ID但没有加载歌曲，尝试加载歌单内容
      // 注意：这里不应直接使用loadList，因为那会切换当前显示的列表
      // 相反，我们应该通过ajax请求来获取歌单数据
      loadLikedPlaylistSilently(uid, function () {
        // 数据加载完成后再次检查状态并更新UI
        setTimeout(function () {
          updateLikeButtonState();
        }, 1000);
      });
    }
    return false;
  }

  // 遍历"我喜欢"歌单中的歌曲，查找当前歌曲ID
  for (var i = 0; i < likedPlaylist.item.length; i++) {
    if (likedPlaylist.item[i].id == songId) {
      return true; // 找到了，表示歌曲在"我喜欢"列表中
    }
  }

  return false; // 没找到，表示歌曲不在"我喜欢"列表中
}

// 静默加载"我喜欢"歌单数据而不切换界面
function loadLikedPlaylistSilently(uid, callback) {
  // 检查是否已有缓存
  var likedPlaylistId = null;
  var userPlaylists = playerReaddata('ulist');

  if (userPlaylists && userPlaylists.length > 0) {
    likedPlaylistId = userPlaylists[0].id;
  }

  if (!likedPlaylistId) {
    // 如果无法获取歌单ID，无法加载
    console.error("无法获取'我喜欢'歌单ID");
    if (typeof callback === 'function') callback();
    return;
  }

  // 使用ajax获取歌单内容，但不切换显示
  $.ajax({
    url: 'api.php',
    type: 'POST',
    dataType: 'json',
    data: {
      "types": "playlist",
      "id": likedPlaylistId
    },
    success: function (data) {
      // 处理返回的歌单数据
      if (data && data.playlist && data.playlist.tracks) {
        // 获取歌单中的歌曲
        var tracks = data.playlist.tracks;
        var formattedTracks = [];

        // 格式化歌曲数据为播放器需要的格式
        for (var i = 0; i < tracks.length; i++) {
          var track = tracks[i];
          var artist = '';

          // 获取艺术家名称
          if (track.ar && track.ar.length) {
            for (var j = 0; j < track.ar.length; j++) {
              artist += (j === 0 ? '' : '/') + track.ar[j].name;
            }
          } else {
            artist = '未知艺术家';
          }

          formattedTracks.push({
            id: track.id,
            name: track.name,
            artist: artist,
            album: track.al ? track.al.name : '未知专辑',
            source: 'netease',
            url_id: track.id,
            pic_id: track.al ? track.al.pic_str || track.al.pic : '',
            lyric_id: track.id,
            pic: track.al ? track.al.picUrl : '',
            url: ''  // URL会在播放时获取
          });
        }

        // 更新"我喜欢"歌单数据而不改变界面
        if (userPlaylists && userPlaylists.length > 0) {
          userPlaylists[0].item = formattedTracks;
          playerSavedata('ulist', userPlaylists);

          // 如果当前已经加载了音乐列表，刷新当前显示的列表（确保喜欢状态正确显示）
          if (musicList && musicList.length > 0) {
            for (var i = 3; i < musicList.length; i++) {
              if (musicList[i].id === likedPlaylistId) {
                musicList[i].item = formattedTracks;
                break;
              }
            }
          }
        }
      }

      // 执行回调
      if (typeof callback === 'function') callback();
    },
    error: function (xhr, status, error) {
      console.error("获取'我喜欢'歌单数据失败", error);
      if (typeof callback === 'function') callback();
    }
  });
}

// 更新"喜欢"按钮状态
function updateLikeButtonState() {
  // 确保有正在播放的歌曲
  if (rem.playlist === undefined || rem.playid === undefined ||
    !musicList[1] || !musicList[1].item || !musicList[1].item[rem.playid]) {
    return false;
  }

  // 获取当前歌曲
  var currentSong = musicList[1].item[rem.playid];

  // 仅支持网易云音乐
  if (currentSong.source !== 'netease') {
    $(".btn-like").removeClass('btn-state-liked');
    $(".btn-like").attr('title', '添加到我喜欢');
    return false;
  }

  // 检查歌曲是否在"我喜欢"列表中
  if (checkSongInLikedList(currentSong.id)) {
    // 在"我喜欢"列表中，更新为已喜欢状态
    $(".btn-like").addClass('btn-state-liked');
    $(".btn-like").attr('title', '从我喜欢移除');
  } else {
    // 不在"我喜欢"列表中，更新为未喜欢状态
    $(".btn-like").removeClass('btn-state-liked');
    $(".btn-like").attr('title', '添加到我喜欢');
  }

  return true;
}

// 监听播放事件，更新"喜欢"按钮状态
$(function () {
  // 方法1: 重写播放函数，在播放时更新"喜欢"按钮状态
  if (window.play) {
    var originalPlay = window.play;
    window.play = function (music) {
      originalPlay.apply(this, arguments);
      // 在播放开始后，延迟一小段时间再检查状态（确保播放ID已更新）
      setTimeout(updateLikeButtonState, 500);
    };
  }

  // 方法2: 定期检查播放ID变化
  var lastPlayId = -1;
  setInterval(function () {
    if (rem.playlist !== undefined && rem.playid !== undefined) {
      // 如果播放ID变化了，说明切换了歌曲
      if (rem.playid !== lastPlayId) {
        lastPlayId = rem.playid;
        updateLikeButtonState();
      }
    }
  }, 1000); // 每秒检查一次
});

// 如果用户歌单列表发生变化，重新检查"喜欢"按钮状态
$(document).on('showUG666Playlists', function () {
  updateLikeButtonState();
});