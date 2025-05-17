/**
 * 媒体控制测试脚本
 * 用于测试媒体通知栏功能
 */
(function () {
  // 等待DOM加载完成
  document.addEventListener('DOMContentLoaded', function () {
    const testNotificationBtn = document.getElementById('test-notification-btn');
    const testMediaPlayBtn = document.getElementById('test-media-play-btn');

    if (testNotificationBtn) {
      testNotificationBtn.addEventListener('click', function () {
        console.log('测试通知按钮点击');
        testNotification();
      });
    }

    if (testMediaPlayBtn) {
      testMediaPlayBtn.addEventListener('click', function () {
        console.log('测试媒体播放按钮点击');
        testMediaPlay();
      });
    }
  });

  // 测试简单通知
  async function testNotification() {
    if (!window.Capacitor || !window.Capacitor.Plugins || !window.Capacitor.Plugins.LocalNotifications) {
      alert('通知插件不可用');
      return;
    }

    const LocalNotifications = window.Capacitor.Plugins.LocalNotifications;

    try {
      // 请求权限
      const permResult = await LocalNotifications.requestPermissions();
      console.log('通知权限:', permResult);

      if (!permResult.display) {
        alert('无法获得通知权限');
        return;
      }      // 创建通知
      await LocalNotifications.schedule({
        notifications: [
          {
            id: 12345,
            title: '测试通知',
            body: '这是一条测试通知，如果您看到，则说明通知功能正常',
            ongoing: true,  // 持续显示
            autoCancel: false  // 禁止自动取消
          }
        ]
      });

      console.log('测试通知已创建');
      alert('测试通知已发送');
    } catch (err) {
      console.error('测试通知失败:', err);
      alert('通知测试失败: ' + err.message);
    }
  }

  // 测试媒体播放通知
  async function testMediaPlay() {
    if (!window.UGMediaControl) {
      alert('媒体控制模块不可用');
      return;
    }

    try {
      // 初始化媒体控制
      console.log('初始化媒体控制');
      await window.UGMediaControl.init();

      // 设置测试曲目
      console.log('设置测试曲目数据');
      await window.UGMediaControl.updateTrack({
        title: '媒体通知测试歌曲',
        artist: '测试歌手',
        album: '测试专辑',
        artwork: '/images/logo.ico',
        duration: 300  // 5分钟测试曲目
      });

      // 开始播放
      console.log('启动播放测试');
      await window.UGMediaControl.play();

      // 模拟播放进度更新
      console.log('将开始模拟播放进度更新');

      let currentPosition = 0;
      let progressInterval = setInterval(() => {
        currentPosition += 10; // 每次增加10秒

        if (currentPosition >= 300) {
          // 到达结尾，停止
          clearInterval(progressInterval);
          window.UGMediaControl.stop();
          return;
        }

        // 更新播放位置
        window.UGMediaControl.updatePosition(currentPosition, 300);

        // 每过一段时间模拟一次暂停和继续，测试按钮状态切换
        if (currentPosition == 60) { // 1分钟处暂停
          window.UGMediaControl.pause();
          setTimeout(() => {
            window.UGMediaControl.play(); // 3秒后继续
          }, 3000);
        }

      }, 10000); // 每10秒更新一次位置

      console.log('测试媒体播放通知已创建，并开始模拟播放进度');
      alert('媒体通知测试已启动，请查看通知栏\n会自动更新进度，并在1分钟处短暂暂停');
    } catch (err) {
      console.error('测试媒体播放失败:', err);
      alert('媒体测试失败: ' + err.message);
    }
  }
})();
