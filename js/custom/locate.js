/**
 * 网易云风格的定位到正在播放歌曲功能
 * 增强版，自动检测歌曲是否可见并控制按钮显示/隐藏
 */
$(function () {
  console.log('网易云风格定位按钮初始化');

  // 初始时隐藏定位按钮
  $('#locate-btn').hide();

  // 定位按钮点击事件 - 使用事件委托，确保即使DOM重新加载也能响应
  $(document).on('click', '#locate-btn', function (e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('定位按钮被点击');
    locateToNowPlaying();
    return false;
  });
  // 拦截loadList函数，确保按钮状态与当前页面保持同步
  try {
    // 保存原始的loadList函数
    var originalLoadList = window.loadList;
    if (originalLoadList) {
      window.loadList = function (list) {
        // 调用原始函数
        originalLoadList.apply(this, arguments);

        // 切换列表后判断按钮显示状态
        setTimeout(function () {
          // 强制重新检查当前歌曲可见性，更新按钮状态
          // 如果是正在播放列表(1)且当前歌曲不可见，会显示按钮
          // 如果不是正在播放列表，则隐藏按钮
          console.log('loadList切换到列表:', list, '是否是正在播放列表:', list === 1);
          checkCurrentSongVisibility();
        }, 200); // 给更多时间确保DOM完全更新
      };
      console.log('成功拦截loadList函数以控制定位按钮');
    }
  } catch (e) {
    console.error('拦截loadList函数失败:', e);
  }

  // 监听滚动事件，根据当前歌曲是否可见来控制按钮显示/隐藏
  $('#main-list').on('scroll', debounce(checkCurrentSongVisibility, 50));

  // 定期检查当前歌曲是否可见，更新按钮状态 - 减少间隔提高响应性
  setInterval(checkCurrentSongVisibility, 800);
  // 监听歌曲切换事件 - 使用播放器的事件
  $(document).on('play pause', function () {
    // 立即检查可见性
    checkCurrentSongVisibility();
  });

  // 监听列表切换事件
  $(document).on('click', '.btn[data-action]', function () {
    // 获取点击的按钮类型
    var action = $(this).data('action');

    // 立即检查一次
    checkCurrentSongVisibility();

    // 如果切换到了非"正在播放"列表，确保隐藏按钮
    if (action && action !== 'playing') {
      hideLocateButton();
    }

    // 在短暂延迟后再次检查（确保DOM已更新）
    setTimeout(checkCurrentSongVisibility, 200);
  });

  // 增加更多监听以确保及时响应
  $(window).on('resize', debounce(checkCurrentSongVisibility, 50));

  // 监听鼠标滚轮事件
  $(document).on('mousewheel DOMMouseScroll', debounce(function () {
    checkCurrentSongVisibility();
  }, 50));  /**
   * 检查当前播放的歌曲是否在可视区域内
   */
  function checkCurrentSongVisibility() {
    // 确保有正在播放的歌曲
    if (typeof rem.playlist === 'undefined' || typeof rem.playid === 'undefined' || rem.playid === null) {
      // 没有正在播放的歌曲，隐藏按钮
      hideLocateButton();
      return;
    }

    // 检查当前显示的是不是正在播放列表(rem.dislist == 1)
    if (rem.dislist != 1) {
      // 不在正在播放列表页面，隐藏按钮（定位按钮只在正在播放页面显示）
      hideLocateButton();
      return;
    }

    // 到达这里说明：1. 有正在播放的歌曲 2. 当前在"正在播放"列表页面
    // 接下来检查歌曲是否在可视区域内    // 查找当前播放的歌曲元素
    var $currentSong = $('.list-item[data-no="' + rem.playid + '"]');

    if ($currentSong.length === 0) {
      console.log('找不到正在播放的歌曲元素，显示定位按钮');
      // 找不到正在播放的歌曲元素，显示按钮
      showLocateButton();
      return;
    }

    // 检查歌曲是否在可视区域内
    var isVisible = isSongVisible($currentSong);
    console.log('当前播放歌曲是否可见:', isVisible);

    if (isVisible) {
      // 歌曲在可视区域内，隐藏按钮
      hideLocateButton();
    } else {
      // 歌曲不在可视区域内，显示按钮
      showLocateButton();
    }
  }

  /**
   * 判断元素是否在可视区域内
   */
  function isSongVisible($element) {
    if (!$element || $element.length === 0) return false;

    // 获取容器元素
    var $container = $('#main-list');

    // 如果没有找到容器，使用视口作为容器
    if ($container.length === 0) {
      var elementTop = $element.offset().top;
      var elementBottom = elementTop + $element.outerHeight();
      var viewportTop = $(window).scrollTop();
      var viewportBottom = viewportTop + $(window).height();

      return elementBottom > viewportTop && elementTop < viewportBottom;
    }

    // 检查元素是否在可视区域内
    if (rem.isMobile) {
      // 移动设备的判断方式
      var containerTop = $container.offset().top;
      var containerHeight = $container.height();
      var containerBottom = containerTop + containerHeight;
      var elementTop = $element.offset().top;
      var elementHeight = $element.outerHeight();
      var elementBottom = elementTop + elementHeight;

      return (elementBottom > containerTop) && (elementTop < containerBottom);
    } else {
      // 桌面设备使用自定义滚动条，使用不同的判断方式
      if ($container.hasClass('mCustomScrollbar')) {
        var mcs = $container.find('.mCustomScrollBox');
        if (mcs.length) {
          var containerTop = mcs.offset().top;
          var containerHeight = mcs.height();
          var containerBottom = containerTop + containerHeight;
          var elementTop = $element.offset().top;
          var elementHeight = $element.outerHeight();
          var elementBottom = elementTop + elementHeight;

          return (elementBottom > containerTop) && (elementTop < containerBottom);
        }
      }

      // 如果不是mCustomScrollbar或者找不到mCustomScrollBox，使用普通判断
      var containerTop = $container.offset().top;
      var containerHeight = $container.height();
      var containerBottom = containerTop + containerHeight;
      var elementTop = $element.offset().top;
      var elementHeight = $element.outerHeight();
      var elementBottom = elementTop + elementHeight;

      return (elementBottom > containerTop) && (elementTop < containerBottom);
    }
  }  /**
     * 显示定位按钮（带动画效果）
     */
  function showLocateButton() {
    var $btn = $('#locate-btn');
    console.log('尝试显示定位按钮');

    // 如果按钮已经显示，不做处理
    if ($btn.is(':visible') && !$btn.hasClass('locate-btn-entering')) {
      console.log('按钮已经可见，不需要再次显示');
      return;
    }

    // 确保按钮元素存在
    if ($btn.length === 0) {
      console.error('找不到定位按钮元素!');
      return;
    }

    // 首先把按钮放在右侧外面，设为可见但看不见
    $btn.css({
      'display': 'flex',
      'opacity': '0',
      'transform': 'translateX(80px)'
    }).removeClass('locate-btn-exiting').addClass('locate-btn-entering');

    console.log('定位按钮已设置为可见状态，即将执行动画');

    // 用requestAnimationFrame确保DOM更新后再开始动画
    requestAnimationFrame(function () {
      // 将按钮滑入视图
      $btn.css({
        'opacity': '0.9',
        'transform': 'translateX(0)'
      });

      // 动画完成后移除标记类
      setTimeout(function () {
        $btn.removeClass('locate-btn-entering');
      }, 300);
    });
  }
  /**
 * 隐藏定位按钮（带动画效果）
 */
  function hideLocateButton() {
    var $btn = $('#locate-btn');

    // 如果按钮已经隐藏，不做处理
    if (!$btn.is(':visible') || $btn.hasClass('locate-btn-exiting')) return;

    // 标记为正在退出
    $btn.addClass('locate-btn-exiting');

    // 将按钮滑出到右侧
    $btn.css({
      'opacity': '0',
      'transform': 'translateX(80px)'
    });

    // 动画完成后隐藏
    setTimeout(function () {
      $btn.hide().removeClass('locate-btn-exiting');
    }, 300);
  }

  /**
   * 定位到当前播放的歌曲
   */
  function locateToNowPlaying() {
    // 确保有正在播放的歌曲
    if (typeof rem.playlist === 'undefined' || typeof rem.playid === 'undefined' || rem.playid === null) {
      console.log('没有正在播放的歌曲');
      showTip('当前没有正在播放的歌曲');
      return;
    }

    console.log('正在定位到歌曲, 列表:', rem.playlist, '歌曲ID:', rem.playid);

    // 检查当前显示的是不是正在播放列表(rem.dislist == 1)
    if (rem.dislist != 1) {
      // 切换到"正在播放"页面 - 先确保元素存在
      if ($('.btn[data-action="playing"]').length) {
        $('.btn[data-action="playing"]').click();

        // 给页面切换一点时间后再滚动到歌曲
        setTimeout(scrollToSong, 500);
      } else {
        // 如果找不到按钮，直接尝试加载列表
        try {
          loadList(1); // 强制切换到正在播放列表
          setTimeout(scrollToSong, 300);
        } catch (e) {
          console.error('加载列表失败:', e);
          showTip('切换到正在播放列表失败');
        }
      }
    } else {
      // 当前已经是正在播放列表，直接滚动
      scrollToSong();
    }
  }

  /**
   * 滚动到歌曲位置
   */
  function scrollToSong() {
    // 查找当前播放的歌曲元素 - 使用rem.playid
    var $currentSong = $('.list-item[data-no="' + rem.playid + '"]');

    if ($currentSong.length === 0) {
      console.log('在当前页面找不到正在播放的歌曲, playid:', rem.playid);

      // 再次尝试刷新列表
      try {
        // 重新加载正在播放列表
        loadList(1);

        // 再次尝试获取元素（给刷新一点时间）
        setTimeout(function () {
          $currentSong = $('.list-item[data-no="' + rem.playid + '"]');

          if ($currentSong.length === 0) {
            // 最后尝试使用另一种选择器
            $currentSong = $('li[data-no="' + rem.playid + '"]');

            if ($currentSong.length === 0) {
              showTip('无法定位到正在播放的歌曲，请尝试刷新页面');
              return;
            }
          }

          performScroll($currentSong);
        }, 300);
      } catch (e) {
        console.error('刷新列表失败:', e);
        showTip('无法定位到正在播放的歌曲，请尝试刷新页面');
      }

      return;
    }

    // 如果找到了元素，执行滚动
    performScroll($currentSong);
  }

  /**
   * 执行实际的滚动动作
   */
  function performScroll($currentSong) {
    console.log('找到歌曲元素，开始滚动');

    // 移除之前的高亮效果
    $('.song-highlight').removeClass('song-highlight');

    // 检测设备类型
    var isMobileDevice = isMobile && isMobile.any ? isMobile.any() : (window.innerWidth <= 768);
    rem.isMobile = isMobileDevice; // 确保rem.isMobile是最新的

    // 不同的滚动处理方式，针对不同的浏览器环境
    try {
      if (isMobileDevice) {
        // 移动设备的滚动处理
        var mainList = document.getElementById('main-list');
        if (mainList) {
          var songOffset = $currentSong[0].offsetTop;
          var containerHeight = mainList.clientHeight;

          // 将歌曲定位到容器的1/3位置
          var targetScroll = songOffset - (containerHeight / 3);

          // 防止滚动到负值
          targetScroll = Math.max(0, targetScroll);

          // 执行滚动
          $('#main-list').animate({
            scrollTop: targetScroll
          }, 300, function () {
            // 添加高亮效果
            highlightSong($currentSong);
            // 滚动后更新按钮显示/隐藏状态
            setTimeout(checkCurrentSongVisibility, 400);
          });
        } else {
          // 退化方案：如果找不到main-list容器
          $('html, body').animate({
            scrollTop: $currentSong.offset().top - 100
          }, 300, function () {
            highlightSong($currentSong);
            setTimeout(checkCurrentSongVisibility, 400);
          });
        }
      } else {
        // 桌面设备使用自定义滚动条，检查mCustomScrollbar是否可用
        if ($("#main-list").hasClass('mCustomScrollbar') &&
          typeof $("#main-list").mCustomScrollbar === 'function') {
          // 计算滚动到正在播放歌曲的位置（使其在视窗中居中偏上）
          var songPosition = $currentSong.position().top;

          // 防止滚动到负值
          songPosition = Math.max(0, songPosition - 100);

          // 使用mCustomScrollbar滚动到指定位置
          $("#main-list").mCustomScrollbar("scrollTo", songPosition, {
            scrollInertia: 300,
            callbacks: true,
            onComplete: function () {
              highlightSong($currentSong);
              setTimeout(checkCurrentSongVisibility, 400);
            }
          });
        } else {
          // 回退策略：如果mCustomScrollbar不可用，使用常规jQuery滚动
          console.log('mCustomScrollbar API不可用，使用标准滚动');

          // 计算滚动位置
          var listContainer = $('#main-list');
          var containerHeight = listContainer.height();
          var songPosition = $currentSong.position() ? $currentSong.position().top : 0;
          var scrollPosition = listContainer.scrollTop();

          // 目标滚动位置：将歌曲放在容器的1/3处
          var targetScroll = songPosition + scrollPosition - (containerHeight / 3);

          // 防止滚动到负值
          targetScroll = Math.max(0, targetScroll);

          // 滚动到目标位置
          listContainer.animate({
            scrollTop: targetScroll
          }, 300, function () {
            highlightSong($currentSong);
            setTimeout(checkCurrentSongVisibility, 400);
          });
        }
      }
    } catch (e) {
      console.error('滚动失败:', e);
      // 终极备选方案
      try {
        $currentSong[0].scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        highlightSong($currentSong);
        setTimeout(checkCurrentSongVisibility, 400);
      } catch (e2) {
        console.error('scrollIntoView也失败:', e2);
        showTip('滚动功能出错，但已找到您的歌曲');
        highlightSong($currentSong);
      }
    }
  }

  /**
   * 高亮显示找到的歌曲
   */
  function highlightSong($song) {
    if (!$song || $song.length === 0) return;

    // 添加高亮效果
    $song.addClass('song-highlight');

    // 3秒后移除高亮效果
    setTimeout(function () {
      $song.removeClass('song-highlight');
    }, 2400); // 3次动画，每次0.8秒
  }
  /**
 * 防抖函数，避免频繁触发，同时确保立即响应
 */
  function debounce(func, wait) {
    var timeout;
    return function () {
      var context = this, args = arguments;
      var callNow = !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(function () {
        timeout = null;
        func.apply(context, args);
      }, wait);
      // 立即执行一次确保快速响应
      if (callNow) func.apply(context, args);
    };
  }

  /**
   * 显示提示信息
   */
  function showTip(message) {
    if (typeof layer !== 'undefined') {
      layer.msg(message);
    } else {
      alert(message);
    }
  }

  // 初始检查 - 缩短延迟提高响应性
  setTimeout(checkCurrentSongVisibility, 300);
});
