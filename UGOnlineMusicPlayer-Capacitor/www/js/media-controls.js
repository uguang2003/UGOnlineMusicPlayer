/**
 * UG音乐播放器 - 媒体控制通知栏管理
 * 提供类似网易云音乐的Android通知栏播放控制
 * 使用Web Media Session API结合Capacitor的LocalNotifications实现
 */

(function () {
  // 创建全局媒体控制对象
  window.UGMediaControl = {};

  // 仅在Android平台初始化
  const isAndroid = /android/i.test(navigator.userAgent);
  if (!isAndroid) {
    console.log('[UGMedia] 非Android平台，不初始化媒体控制');
    // 提供空方法以防止错误
    window.UGMediaControl = {
      init: function () { return Promise.resolve(false); },
      updateTrack: function () { return Promise.resolve(); },
      play: function () { return Promise.resolve(); },
      pause: function () { return Promise.resolve(); },
      stop: function () { return Promise.resolve(); },
      updatePosition: function () { return Promise.resolve(); }
    };
    return;
  }

  // 媒体会话状态
  let mediaSessionActive = false;
  let notificationActive = false;
  let notificationUpdateInterval = null;

  // 当前曲目信息
  let currentTrack = {
    title: 'UG音乐播放器',
    artist: '未知艺术家',
    album: '未知专辑',
    artwork: '/images/logo.ico',
    duration: 0,
    position: 0,
    isPlaying: false
  };

  // 媒体通知ID和频道ID
  const MEDIA_NOTIFICATION_ID = 1001;
  const MEDIA_CHANNEL_ID = 'ug_music_playback';
  const MEDIA_CONTROL_CHANNEL_ID = 'ug_media_control';

  // 获取Capacitor Media插件(如果可用)
  function getMediaPlugin() {
    return window.Capacitor &&
      window.Capacitor.Plugins &&
      window.Capacitor.Plugins.Media;
  }

  // 获取本地通知插件
  function getLocalNotifications() {
    return window.Capacitor &&
      window.Capacitor.Plugins &&
      window.Capacitor.Plugins.LocalNotifications;
  }

  // 格式化时间为 mm:ss
  function formatTime(seconds) {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  // 格式化播放进度条
  function formatProgressBar(position, duration, width = 20) {
    if (!position || !duration) return '□'.repeat(width);

    const progress = Math.min(Math.max(position / duration, 0), 1);
    const filledCount = Math.round(width * progress);
    const emptyCount = width - filledCount;

    // 使用更明显的字符
    return '■'.repeat(filledCount) + '□'.repeat(emptyCount);
  }  // 测试简单的通知是否可以显示
  async function testSimpleNotification() {
    const LocalNotifications = getLocalNotifications();
    if (!LocalNotifications) {
      console.error('[UGMedia] 本地通知插件不可用，无法测试');
      return false;
    }

    try {
      console.log('[UGMedia] 尝试创建简单测试通知');

      // 请求通知权限
      const result = await LocalNotifications.requestPermissions();
      console.log('[UGMedia] 通知权限请求结果:', result);

      // 创建一个简单但稳定的通知（不使用schedule）
      await LocalNotifications.schedule({
        notifications: [{
          id: 9999,
          title: 'UG音乐播放器测试',
          body: '这是一条测试通知，如果您看到此通知，则表示通知功能正常工作',
          channelId: MEDIA_CHANNEL_ID,
          sound: null,
          ongoing: true,
          autoCancel: false,
          // 增强通知稳定性的关键属性
          extra: {
            sticky: true,
            ongoing: true,
            timestamp: 0,
            priority: 2,       // 高优先级
            foreground: true   // 前台显示
          }
        }]
      });

      console.log('[UGMedia] 测试通知已创建');

      // 3秒后自动取消测试通知
      setTimeout(async () => {
        try {
          await LocalNotifications.cancel({ notifications: [{ id: 9999 }] });
          console.log('[UGMedia] 测试通知已自动取消');
        } catch (e) {
          console.warn('[UGMedia] 取消测试通知失败:', e);
        }
      }, 3000);

      return true;
    } catch (err) {
      console.error('[UGMedia] 测试通知创建失败:', err);
      return false;
    }
  }

  // 初始化媒体会话和通知
  async function init() {
    console.log('[UGMedia] 初始化Android媒体控制');

    // 确保Capacitor已加载
    if (!window.Capacitor) {
      console.error('[UGMedia] Capacitor未加载');
      return false;
    }

    // 测试简单通知
    await testSimpleNotification();

    try {
      // 等待Capacitor加载完成
      if (typeof window.Capacitor.isNativePlatform !== 'function') {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 如果仍然没有加载，返回错误
      if (typeof window.Capacitor.isNativePlatform !== 'function') {
        console.error('[UGMedia] Capacitor API未就绪');
        return false;
      }

      // 获取本地通知插件
      const LocalNotifications = getLocalNotifications();

      // 如果有本地通知插件，请求权限
      if (LocalNotifications) {
        try {
          const result = await LocalNotifications.requestPermissions();
          if (!result.display) {
            console.warn('[UGMedia] 无法获取通知权限');
          }

          // 创建媒体通知频道(Android 8+需要)
          await LocalNotifications.createChannel({
            id: MEDIA_CHANNEL_ID,
            name: '媒体播放',
            description: 'UG音乐播放器媒体通知',
            importance: 4, // HIGH
            visibility: 1, // PUBLIC
            sound: null,
            vibration: false,
            lights: false
          });

          // 创建媒体控制频道
          await LocalNotifications.createChannel({
            id: MEDIA_CONTROL_CHANNEL_ID,
            name: '媒体控制',
            description: 'UG音乐播放器媒体控制',
            importance: 3, // DEFAULT
            visibility: 1, // PUBLIC
            sound: null,
            vibration: false,
            lights: false
          });

        } catch (err) {
          console.warn('[UGMedia] 通知设置失败:', err);
        }
      } else {
        console.warn('[UGMedia] 本地通知插件不可用');
      }

      // 初始化Web Media Session API (如果支持)
      if ('mediaSession' in navigator) {
        console.log('[UGMedia] 初始化Web Media Session API');

        // 设置媒体会话控制
        navigator.mediaSession.setActionHandler('play', function () {
          document.dispatchEvent(new CustomEvent('ug-media-play'));
        });

        navigator.mediaSession.setActionHandler('pause', function () {
          document.dispatchEvent(new CustomEvent('ug-media-pause'));
        });

        navigator.mediaSession.setActionHandler('previoustrack', function () {
          document.dispatchEvent(new CustomEvent('ug-media-previous'));
        });

        navigator.mediaSession.setActionHandler('nexttrack', function () {
          document.dispatchEvent(new CustomEvent('ug-media-next'));
        });

        navigator.mediaSession.setActionHandler('stop', function () {
          document.dispatchEvent(new CustomEvent('ug-media-stop'));
        });
      }      // 注册通知点击和按钮点击的监听器
      const notificationsPlugin = getLocalNotifications();
      if (notificationsPlugin) {
        notificationsPlugin.removeAllListeners();

        notificationsPlugin.addListener('localNotificationActionPerformed', (notification) => {
          // 检查是否为我们的媒体通知
          if (notification.notification.id === MEDIA_NOTIFICATION_ID) {
            const actionId = notification.actionId;
            console.log('[UGMedia] 接收到通知操作:', actionId);

            if (actionId === 'UG_MEDIA_ACTION_PLAY') {
              document.dispatchEvent(new CustomEvent('ug-media-play'));
            } else if (actionId === 'UG_MEDIA_ACTION_PAUSE') {
              document.dispatchEvent(new CustomEvent('ug-media-pause'));
            } else if (actionId === 'UG_MEDIA_ACTION_PREV') {
              document.dispatchEvent(new CustomEvent('ug-media-previous'));
            } else if (actionId === 'UG_MEDIA_ACTION_NEXT') {
              document.dispatchEvent(new CustomEvent('ug-media-next'));
            } else if (actionId === 'UG_MEDIA_ACTION_STOP') {
              document.dispatchEvent(new CustomEvent('ug-media-stop'));
            }
          }
        });
      }

      console.log('[UGMedia] 媒体控制初始化成功');
      return true;
    } catch (err) {
      console.error('[UGMedia] 初始化失败:', err);
      return false;
    }
  }

  // 处理来自Web应用的封面URL
  function processArtworkUrl(url) {
    if (!url) return null;

    // 如果已经是绝对URL或数据URL，直接返回
    if (url.startsWith('http') || url.startsWith('data:')) {
      return url;
    }

    // 转换相对路径为绝对路径
    const base = window.location.origin + window.location.pathname;
    const absoluteUrl = new URL(url, base).href;
    return absoluteUrl;
  }
  // 创建媒体控制通知
  async function createMediaNotification(isPlaying) {
    const LocalNotifications = getLocalNotifications();
    if (!LocalNotifications) return false;

    try {
      console.log('[UGMedia] 创建/更新媒体通知，播放状态:', isPlaying);

      // 先检查是否需要取消现有通知
      if (notificationActive) {
        try {
          // 不直接取消，而是直接更新
          console.log('[UGMedia] 通知已存在，将直接更新而不是重新创建');
        } catch (cancelErr) {
          console.warn('[UGMedia] 取消旧通知出错:', cancelErr);
        }
      }

      // 操作按钮数组
      const actionTypeIdPrefix = "UG_MEDIA_ACTION_";
      const actions = [];

      // 上一曲按钮
      actions.push({
        id: actionTypeIdPrefix + "PREV",
        title: "上一曲",
        requiresAuthentication: false
      });

      // 播放/暂停按钮
      if (isPlaying) {
        actions.push({
          id: actionTypeIdPrefix + "PAUSE",
          title: "暂停",
          requiresAuthentication: false
        });
      } else {
        actions.push({
          id: actionTypeIdPrefix + "PLAY",
          title: "播放",
          requiresAuthentication: false
        });
      }

      // 下一曲按钮
      actions.push({
        id: actionTypeIdPrefix + "NEXT",
        title: "下一曲",
        requiresAuthentication: false
      });

      // 停止按钮
      actions.push({
        id: actionTypeIdPrefix + "STOP",
        title: "停止",
        requiresAuthentication: false
      });

      // 格式化进度显示
      const progressText = formatTime(currentTrack.position) + ' / ' + formatTime(currentTrack.duration);
      const progressBar = formatProgressBar(currentTrack.position, currentTrack.duration, 20);

      // 通知配置
      const notification = {
        id: MEDIA_NOTIFICATION_ID,
        title: currentTrack.title || "UG音乐播放器",
        body: `${currentTrack.artist || "未知艺术家"} - ${currentTrack.album || "未知专辑"}\n${progressBar}\n${progressText}`,
        channelId: MEDIA_CHANNEL_ID,
        ongoing: true,
        largeBody: isPlaying ? "正在播放" : "已暂停",
        largeIcon: currentTrack.artwork || "images/logo.ico",
        autoCancel: false,
        importance: 4, // HIGH
        sound: null,
        vibration: false,
        visibility: 1, // PUBLIC
        actionTypeId: actionTypeIdPrefix + "GROUP",
        actions: actions,
        // Android特定通知选项
        extra: {
          category: "transport",   // 设置为媒体传输类别
          style: "media",          // 指定媒体样式
          showWhen: false,         // 不显示时间戳
          ongoing: true,           // 确保持续显示
          sticky: true,            // 设置为粘性通知
          timestamp: 0,            // 重要：设置为0防止通知刷新
          priority: 2,             // 高优先级 (PRIORITY_MAX)
          foreground: true         // 强制前台显示
        }
      };

      // 确保不包含schedule属性，避免闪烁
      console.log('[UGMedia] 创建固定通知，不使用schedule属性');

      // 创建通知
      await LocalNotifications.schedule({
        notifications: [notification]
      });

      console.log('[UGMedia] 媒体通知已创建/更新');
      notificationActive = true;

      // 如果在播放中，启动通知更新计时器
      startNotificationUpdateInterval();

      return true;
    } catch (err) {
      console.error('[UGMedia] 创建媒体通知失败:', err);
      return false;
    }
  }
  // 更新媒体通知
  async function updateMediaNotification(isPlaying) {
    console.log('[UGMedia] 更新媒体通知，播放状态:', isPlaying);

    // 如果通知不活跃，创建新通知
    if (!notificationActive) {
      console.log('[UGMedia] 通知不活跃，创建新通知');
      return createMediaNotification(isPlaying);
    }

    const LocalNotifications = getLocalNotifications();
    if (!LocalNotifications) return false;

    try {
      console.log('[UGMedia] 准备更新现有通知');

      // 操作按钮数组
      const actionTypeIdPrefix = "UG_MEDIA_ACTION_";
      const actions = [];

      // 上一曲按钮
      actions.push({
        id: actionTypeIdPrefix + "PREV",
        title: "上一曲",
        requiresAuthentication: false
      });

      // 播放/暂停按钮
      if (isPlaying) {
        actions.push({
          id: actionTypeIdPrefix + "PAUSE",
          title: "暂停",
          requiresAuthentication: false
        });
      } else {
        actions.push({
          id: actionTypeIdPrefix + "PLAY",
          title: "播放",
          requiresAuthentication: false
        });
      }

      // 下一曲按钮
      actions.push({
        id: actionTypeIdPrefix + "NEXT",
        title: "下一曲",
        requiresAuthentication: false
      });

      // 停止按钮
      actions.push({
        id: actionTypeIdPrefix + "STOP",
        title: "停止",
        requiresAuthentication: false
      });

      // 格式化进度显示
      const progressText = formatTime(currentTrack.position) + ' / ' + formatTime(currentTrack.duration);
      const progressBar = formatProgressBar(currentTrack.position, currentTrack.duration, 20);

      // 更新现有通知配置
      const notification = {
        id: MEDIA_NOTIFICATION_ID,
        title: currentTrack.title || "UG音乐播放器",
        body: `${currentTrack.artist || "未知艺术家"} - ${currentTrack.album || "未知专辑"}\n${progressBar}\n${progressText}`,
        channelId: MEDIA_CHANNEL_ID,
        ongoing: true,
        largeBody: isPlaying ? "正在播放" : "已暂停",
        largeIcon: currentTrack.artwork || "images/logo.ico",
        autoCancel: false,
        sound: null,
        vibration: false,
        actions: actions,
        // Android特定通知选项
        extra: {
          category: "transport",   // 设置为媒体传输类别
          style: "media",          // 指定媒体样式
          showWhen: false,         // 不显示时间戳
          ongoing: true,           // 确保持续显示
          sticky: true,            // 设置为粘性通知
          timestamp: 0,            // 重要：设置为0防止通知刷新
          priority: 2,             // 高优先级 (PRIORITY_MAX)
          foreground: true         // 强制前台显示
        }
      };

      // 避免闪烁的关键：不要取消然后重建通知，直接更新
      console.log('[UGMedia] 直接更新通知内容');
      await LocalNotifications.schedule({
        notifications: [notification]
      });

      console.log('[UGMedia] 通知已更新');

      // 根据播放状态管理通知更新计时器
      if (isPlaying) {
        console.log('[UGMedia] 播放中，启动/继续更新计时器');
        startNotificationUpdateInterval();
      } else {
        console.log('[UGMedia] 已暂停，停止更新计时器');
        stopNotificationUpdateInterval();
      }

      return true;
    } catch (err) {
      console.error('[UGMedia] 更新媒体通知失败:', err);
      return false;
    }
  }  // 启动通知更新计时器
  function startNotificationUpdateInterval() {
    // 清除可能存在的旧计时器
    stopNotificationUpdateInterval();

    // 只有在播放状态下才需要定期更新通知
    if (currentTrack.isPlaying && notificationActive) {
      console.log('[UGMedia] 启动通知更新计时器');

      // 记录计时器启动时间
      const startTime = Date.now();
      const startPosition = currentTrack.position;

      // 先立即更新一次
      updateTrackProgress();

      // 创建新计时器，每5秒更新一次进度
      notificationUpdateInterval = setInterval(() => {
        // 计算实际过去的时间（秒）
        const timePassedSec = Math.floor((Date.now() - startTime) / 1000);

        // 基于实际经过时间计算理论位置
        // 这比简单加5更准确，因为可能存在定时器延迟
        const calculatedPosition = startPosition + timePassedSec;

        // 如果计算位置和当前内部位置相差较大，则调整到计算位置
        if (Math.abs(calculatedPosition - currentTrack.position) > 5) {
          console.log('[UGMedia] 检测到位置偏差，调整位置:',
            currentTrack.position, '->', calculatedPosition);
          currentTrack.position = calculatedPosition;
        }

        // 更新进度
        updateTrackProgress();
      }, 5000); // 每5秒更新一次

      console.log('[UGMedia] 通知更新计时器已启动，ID:', notificationUpdateInterval);
    }
  }

  // 更新曲目进度
  function updateTrackProgress() {
    // 如果当前不在播放状态，直接返回
    if (!currentTrack.isPlaying) {
      console.log('[UGMedia] 非播放状态，不更新进度');
      return;
    }

    if (currentTrack.position < currentTrack.duration) {
      // 保持进度增加逻辑，但确保位置计算更准确
      // 这里不使用固定增量，而是在startNotificationUpdateInterval中根据实际时间计算
      const prevPosition = currentTrack.position;

      // 每次调用时再增加1秒，使显示更平滑
      currentTrack.position += 1;

      // 确保不超过总时长
      if (currentTrack.position > currentTrack.duration) {
        currentTrack.position = currentTrack.duration;
      }

      console.log(`[UGMedia] 更新进度 ${formatTime(prevPosition)} -> ${formatTime(currentTrack.position)} / ${formatTime(currentTrack.duration)}`);

      // 更新通知，但不重复创建
      updateMediaNotification(true);
    } else {
      console.log('[UGMedia] 曲目已播放完毕，停止更新');
      stopNotificationUpdateInterval();
    }
  }

  // 停止通知更新计时器
  function stopNotificationUpdateInterval() {
    if (notificationUpdateInterval) {
      console.log('[UGMedia] 停止通知更新计时器，ID:', notificationUpdateInterval);
      clearInterval(notificationUpdateInterval);
      notificationUpdateInterval = null;
    }
  }
  // 更新当前播放曲目信息
  async function updateTrack(trackInfo) {
    if (!isAndroid) return;

    try {
      console.log('[UGMedia] 更新曲目信息:', JSON.stringify(trackInfo));

      // 合并曲目信息
      for (var key in trackInfo) {
        if (trackInfo.hasOwnProperty(key)) {
          // 特殊处理封面
          if (key === 'artwork') {
            currentTrack[key] = processArtworkUrl(trackInfo[key]);
          } else {
            currentTrack[key] = trackInfo[key];
          }
        }
      }

      // 重置位置
      currentTrack.position = 0;

      // 更新Media Session元数据(如果支持)
      if ('mediaSession' in navigator) {
        const artwork = [];

        // 如果有封面艺术品，添加到列表
        if (currentTrack.artwork && typeof currentTrack.artwork === 'string') {
          // 处理相对路径
          let artworkUrl = currentTrack.artwork;
          if (!artworkUrl.startsWith('http') && !artworkUrl.startsWith('data:')) {
            // 如果是相对路径，转换为绝对路径
            const base = window.location.origin + window.location.pathname;
            artworkUrl = new URL(artworkUrl, base).href;
          }

          // 添加不同尺寸的封面
          artwork.push({
            src: artworkUrl,
            sizes: '96x96',
            type: 'image/jpeg'
          });
          artwork.push({
            src: artworkUrl,
            sizes: '128x128',
            type: 'image/jpeg'
          });
          artwork.push({
            src: artworkUrl,
            sizes: '192x192',
            type: 'image/jpeg'
          });
          artwork.push({
            src: artworkUrl,
            sizes: '256x256',
            type: 'image/jpeg'
          });
        }

        // 更新媒体会话元数据
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.title || 'UG音乐播放器',
          artist: currentTrack.artist || '未知艺术家',
          album: currentTrack.album || '未知专辑',
          artwork: artwork
        });
      }

      // 如果MediaPlugin可用，也更新它
      const MediaPlugin = getMediaPlugin();
      if (MediaPlugin && mediaSessionActive) {
        try {
          // 更新媒体会话信息
          await MediaPlugin.setMetadata({
            title: currentTrack.title || 'UG音乐播放器',
            artist: currentTrack.artist || '未知艺术家',
            album: currentTrack.album || '未知专辑',
            artwork: currentTrack.artwork || 'images/logo.ico',
            duration: currentTrack.duration || 0
          });
        } catch (mediaErr) {
          console.warn('[UGMedia] 媒体插件更新曲目信息失败:', mediaErr);
        }
      }

      // 如果通知已激活，更新通知
      if (notificationActive) {
        await updateMediaNotification(currentTrack.isPlaying);
      }

      console.log('[UGMedia] 已更新媒体信息:', currentTrack.title);
    } catch (err) {
      console.error('[UGMedia] 更新曲目信息失败:', err);
    }
  }
  // 开始播放并显示通知
  async function play() {
    if (!isAndroid) return;

    try {
      console.log('[UGMedia] 开始播放并准备显示通知', JSON.stringify(currentTrack));

      // 更新内部状态
      currentTrack.isPlaying = true;

      // 更新Media Session状态(如果支持)
      if ('mediaSession' in navigator) {
        console.log('[UGMedia] 更新Media Session状态: playing');
        navigator.mediaSession.playbackState = 'playing';
      }

      // 尝试使用Media Plugin(如果可用)
      const MediaPlugin = getMediaPlugin();
      if (MediaPlugin) {
        try {
          console.log('[UGMedia] 发现Media Plugin，尝试使用');
          if (!mediaSessionActive) {
            // 创建新的媒体会话
            await MediaPlugin.createMediaSession({
              title: currentTrack.title || 'UG音乐播放器',
              artist: currentTrack.artist || '未知艺术家',
              album: currentTrack.album || '未知专辑',
              artwork: currentTrack.artwork || 'images/logo.ico',
              duration: currentTrack.duration || 0,
              notificationOptions: {
                isPlaying: true,
                hasPlay: true,
                hasPause: true,
                hasStop: true,
                hasPrevious: true,
                hasNext: true,
                notificationChannelDescription: "UG音乐播放控制",
                notificationChannelName: "媒体控制"
              }
            });

            // 设置媒体控制回调
            await MediaPlugin.setPlaybackState({
              playbackState: 'playing',
              playbackRate: 1.0,
              position: currentTrack.position || 0
            });

            mediaSessionActive = true;
            console.log('[UGMedia] Media Plugin会话创建成功');
          } else {
            // 如果会话已经存在，只更新播放状态
            await MediaPlugin.setPlaybackState({
              playbackState: 'playing',
              position: currentTrack.position || 0
            });
            console.log('[UGMedia] 更新Media Plugin播放状态');
          }
        } catch (mediaErr) {
          console.warn('[UGMedia] 媒体插件启动失败，将使用通知替代:', mediaErr);
        }
      } else {
        console.log('[UGMedia] Media Plugin不可用，将使用本地通知');
      }

      // 强制显示通知（无论媒体插件是否成功）
      console.log('[UGMedia] 准备创建媒体通知');
      const notificationResult = await createMediaNotification(true);
      console.log('[UGMedia] 创建媒体通知结果:', notificationResult);

      console.log('[UGMedia] 开始播放并显示通知');
    } catch (err) {
      console.error('[UGMedia] 播放失败:', err);
    }
  }

  // 暂停播放
  async function pause() {
    if (!isAndroid) return;

    try {
      // 更新内部状态
      currentTrack.isPlaying = false;

      // 更新Media Session状态(如果支持)
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }

      // 停止通知更新计时器
      stopNotificationUpdateInterval();

      // 尝试使用Media Plugin(如果可用)
      const MediaPlugin = getMediaPlugin();
      if (MediaPlugin && mediaSessionActive) {
        try {
          await MediaPlugin.setPlaybackState({
            playbackState: 'paused',
            position: currentTrack.position || 0
          });
        } catch (mediaErr) {
          console.warn('[UGMedia] 媒体插件暂停失败:', mediaErr);
        }
      }

      // 更新通知（无论媒体插件是否成功）
      if (notificationActive) {
        await updateMediaNotification(false);
      }

      console.log('[UGMedia] 暂停播放');
    } catch (err) {
      console.error('[UGMedia] 暂停失败:', err);
    }
  }

  // 停止播放并移除通知
  async function stop() {
    if (!isAndroid) return;

    try {
      // 更新内部状态
      currentTrack.isPlaying = false;
      currentTrack.position = 0;

      // 停止通知更新计时器
      stopNotificationUpdateInterval();

      // 更新Media Session状态(如果支持)
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'none';
      }

      // 尝试使用Media Plugin(如果可用)
      const MediaPlugin = getMediaPlugin();
      if (MediaPlugin && mediaSessionActive) {
        try {
          await MediaPlugin.stopMediaSession();
          mediaSessionActive = false;
        } catch (mediaErr) {
          console.warn('[UGMedia] 媒体插件停止失败:', mediaErr);
        }
      }

      // 如果有活跃的通知，删除它
      if (notificationActive) {
        const LocalNotifications = getLocalNotifications();
        if (LocalNotifications) {
          await LocalNotifications.cancel({ notifications: [{ id: MEDIA_NOTIFICATION_ID }] });
          notificationActive = false;
        }
      }

      console.log('[UGMedia] 停止播放并移除通知');
    } catch (err) {
      console.error('[UGMedia] 停止失败:', err);
    }
  }
  // 更新播放进度
  async function updatePosition(position, duration) {
    if (!isAndroid) return;

    try {
      console.log(`[UGMedia] 请求更新播放进度: ${formatTime(position)}/${formatTime(duration)}`);

      // 保存上一个位置，用于记录日志
      const oldPosition = currentTrack.position;

      // 更新内部状态
      if (position !== undefined) {
        currentTrack.position = position;
      }

      if (duration) {
        currentTrack.duration = duration;
      }

      console.log(`[UGMedia] 进度已更新: ${formatTime(oldPosition)} -> ${formatTime(currentTrack.position)}/${formatTime(currentTrack.duration)}`);

      // 如果Media Session API可用，更新它
      if ('mediaSession' in navigator && position !== undefined) {
        try {
          navigator.mediaSession.setPositionState({
            duration: currentTrack.duration || 0,
            position: position || 0,
            playbackRate: 1.0
          });
        } catch (e) {
          // 某些浏览器可能不完全支持此功能
          console.warn('[UGMedia] 无法更新Media Session位置状态:', e);
        }
      }

      // 如果MediaPlugin可用，也更新它
      const MediaPlugin = getMediaPlugin();
      if (MediaPlugin && mediaSessionActive) {
        try {
          await MediaPlugin.setPlaybackState({
            position: position,
            duration: duration || currentTrack.duration
          });
        } catch (mediaErr) {
          console.warn('[UGMedia] 媒体插件更新进度失败:', mediaErr);
        }
      }

      // 为避免闪烁并确保更新平滑，我们在这里不主动更新通知
      // 如果播放状态改变，会触发重置计时器，重新开始更平滑的更新
      // 但如果位置改变很大（例如用户跳转），可以考虑更新一次通知
      if (Math.abs(oldPosition - currentTrack.position) > 10) {
        console.log('[UGMedia] 检测到位置显著改变，更新通知');

        // 如果正在播放，就更新通知
        if (currentTrack.isPlaying && notificationActive) {
          // 重置通知更新计时器，确保平滑更新
          stopNotificationUpdateInterval();
          startNotificationUpdateInterval();
        }
      }
    } catch (err) {
      console.error('[UGMedia] 更新进度失败:', err);
    }
  }
  // 创建默认通知 - 用于应用启动时显示默认媒体控制通知
  async function createDefaultNotification() {
    if (!isAndroid) return false;

    try {
      console.log('[UGMedia] 创建默认媒体通知');

      // 获取本地通知插件
      const LocalNotifications = getLocalNotifications();
      if (!LocalNotifications) {
        console.error('[UGMedia] 本地通知插件不可用，无法创建默认通知');
        return false;
      }

      // 首先确保有通知权限
      try {
        const permResult = await LocalNotifications.requestPermissions();
        console.log('[UGMedia] 默认通知权限状态:', permResult);
        if (!permResult.display) {
          console.warn('[UGMedia] 没有权限显示通知');
        }
      } catch (permErr) {
        console.warn('[UGMedia] 请求通知权限失败:', permErr);
      }

      // 更新内部状态，但不设为播放状态
      currentTrack.isPlaying = false;

      // 操作按钮数组
      const actionTypeIdPrefix = "UG_MEDIA_ACTION_";
      const actions = [];

      // 上一曲按钮
      actions.push({
        id: actionTypeIdPrefix + "PREV",
        title: "上一曲",
        requiresAuthentication: false
      });

      // 播放按钮
      actions.push({
        id: actionTypeIdPrefix + "PLAY",
        title: "播放",
        requiresAuthentication: false
      });

      // 下一曲按钮
      actions.push({
        id: actionTypeIdPrefix + "NEXT",
        title: "下一曲",
        requiresAuthentication: false
      });

      // 默认进度条显示
      const progressBar = '□□□□□□□□□□□□□□□□□□□□'; // 20个空方块
      const progressText = '00:00 / 00:00';

      // 直接创建新通知
      try {
        // 创建一个持久稳定的通知
        const notification = {
          id: MEDIA_NOTIFICATION_ID,
          title: currentTrack.title || "UG音乐播放器",
          body: `${currentTrack.artist || "未知艺术家"} - ${currentTrack.album || "点击播放按钮开始播放"}\n${progressBar}\n${progressText}`,
          channelId: MEDIA_CHANNEL_ID,
          ongoing: true,
          largeBody: "等待播放",
          largeIcon: currentTrack.artwork || "images/logo.ico",
          autoCancel: false,
          importance: 4, // HIGH
          sound: null,
          vibration: false,
          visibility: 1, // PUBLIC
          actionTypeId: actionTypeIdPrefix + "GROUP",
          actions: actions,
          // Android特定通知选项 - 增加的稳定性属性
          extra: {
            category: "transport",   // 设置为媒体传输类别
            style: "media",          // 指定媒体样式
            showWhen: false,         // 不显示时间戳
            ongoing: true,           // 确保持续显示
            sticky: true,            // 设置为粘性通知
            timestamp: 0,            // 重要：设置为0防止通知刷新
            priority: 2,             // 高优先级 (PRIORITY_MAX)
            foreground: true,        // 强制前台显示
            silent: true,            // 不发出通知声音
            badge: false,            // 不显示角标
            visibility: 1            // 在锁屏上可见
          }
        };

        // 创建通知
        console.log('[UGMedia] 创建默认媒体通知，配置:', JSON.stringify(notification));
        await LocalNotifications.schedule({
          notifications: [notification]
        });

        console.log('[UGMedia] 默认媒体通知已创建');
        notificationActive = true;

        // 确保通知保持显示 - 30秒后检查并恢复可能消失的通知
        setTimeout(async () => {
          try {
            if (notificationActive) {
              console.log('[UGMedia] 检查默认通知是否仍然存在...');
              // 轻微更新通知以确保它仍然可见
              await updateMediaNotification(false);
              console.log('[UGMedia] 默认通知已刷新');
            }
          } catch (e) {
            console.warn('[UGMedia] 刷新默认通知失败:', e);
          }
        }, 30000);

        return true;
      } catch (err) {
        console.error('[UGMedia] 创建默认媒体通知失败:', err);
        return false;
      }
    } catch (err) {
      console.error('[UGMedia] 创建默认通知处理失败:', err);
      return false;
    }
  }
  // 公开API
  window.UGMediaControl = {
    init: init,
    updateTrack: updateTrack,
    play: play,
    pause: pause,
    stop: stop,
    updatePosition: updatePosition,
    createDefaultNotification: createDefaultNotification
  };
})();
