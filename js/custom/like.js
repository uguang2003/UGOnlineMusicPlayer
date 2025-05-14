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
    "cookie": netease_cookie  // 在请求参数中直接添加cookie
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

        // 只有在API调用成功后才更新按钮状态
        if (isAdd) {
          // 添加到我喜欢 - 更新为已喜欢状态
          $(".btn-like").addClass('btn-state-liked');
          $(".btn-like").attr('title', '从我喜欢移除');
        } else {
          // 从我喜欢移除 - 更新为未喜欢状态
          $(".btn-like").removeClass('btn-state-liked');
          $(".btn-like").attr('title', '添加到我喜欢');
        }

        // 新增：刷新用户歌单数据
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

// 刷新用户的"我喜欢"歌单
function refreshUserLikedPlaylist() {
  // 获取用户ID
  var uid = playerReaddata('uid');
  if (!uid) {
    console.log("未找到用户ID，无法刷新歌单");
    return false;
  }

  // 通知用户正在刷新歌单
  layer.msg('正在刷新歌单数据...', { icon: 16, time: 1500 });

  // 清除相关缓存
  playerSavedata('ulist', '');

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
      loadUserPlaylist(0, function () {
        // 加载完成后重新检查
        updateLikeButtonState();
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