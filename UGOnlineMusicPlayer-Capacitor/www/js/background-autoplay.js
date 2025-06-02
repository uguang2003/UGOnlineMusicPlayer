/**
 * UG音乐播放器 - 简化后台自动播放
 * 专注解决一个问题：后台自动播放下一首歌
 */

(function () {
  'use strict';

  console.log('🎵 初始化后台自动播放...');

  // 等待iframe加载完成
  function waitForIframe() {
    const iframe = document.getElementById('app-frame');
    if (!iframe) {
      setTimeout(waitForIframe, 100);
      return;
    }

    iframe.addEventListener('load', function () {
      console.log('📱 iframe已加载，注入自动播放脚本...');
      injectAutoPlayScript();
    });
  }

  // 注入自动播放脚本到iframe
  function injectAutoPlayScript() {
    const iframe = document.getElementById('app-frame');
    if (!iframe || !iframe.contentWindow) return;

    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

      // 创建脚本元素
      const script = iframeDoc.createElement('script');
      script.textContent = `
                (function() {
                    console.log('🎯 自动播放脚本已注入');
                    
                    // 监听音频结束事件
                    function setupAudioListener() {
                        const audioElements = document.querySelectorAll('audio');
                        audioElements.forEach(function(audio) {
                            if (!audio.hasAutoPlayListener) {
                                audio.addEventListener('ended', function() {
                                    console.log('🔄 歌曲播放结束，准备播放下一首...');
                                    setTimeout(function() {
                                        playNext();
                                    }, 500);
                                });
                                audio.hasAutoPlayListener = true;
                            }
                        });
                        
                        // 定期检查新的音频元素
                        setTimeout(setupAudioListener, 2000);
                    }
                    
                    // 播放下一首的多种方法
                    function playNext() {
                        try {
                            // 方法1: 调用autoNextMusic函数
                            if (typeof autoNextMusic === 'function') {
                                console.log('✅ 使用autoNextMusic播放下一首');
                                autoNextMusic();
                                return;
                            }
                            
                            // 方法2: 调用nextMusic函数  
                            if (typeof nextMusic === 'function') {
                                console.log('✅ 使用nextMusic播放下一首');
                                nextMusic();
                                return;
                            }
                            
                            // 方法3: 点击下一首按钮
                            const nextButton = document.querySelector('.next-btn, .next, [title*="下一"], [title*="Next"], .fa-step-forward, .icon-next');
                            if (nextButton) {
                                console.log('✅ 点击下一首按钮');
                                nextButton.click();
                                return;
                            }
                            
                            // 方法4: 更广泛的按钮查找
                            const allButtons = document.querySelectorAll('button, .btn, [onclick], [role="button"]');
                            for (let btn of allButtons) {
                                const text = btn.textContent || btn.title || btn.getAttribute('aria-label') || '';
                                if (text.includes('下一') || text.includes('next') || text.includes('Next')) {
                                    console.log('✅ 找到并点击下一首按钮:', text);
                                    btn.click();
                                    return;
                                }
                            }
                            
                            console.log('❌ 未找到播放下一首的方法');
                        } catch (error) {
                            console.error('❌ 播放下一首失败:', error);
                        }
                    }
                    
                    // 开始监听
                    setupAudioListener();
                    
                    // 监听来自父窗口的消息
                    window.addEventListener('message', function(event) {
                        if (event.data && event.data.type === 'AUTO_NEXT') {
                            console.log('📢 收到自动播放下一首指令');
                            playNext();
                        }
                    });
                })();
            `;

      // 添加到iframe的head或body
      const target = iframeDoc.head || iframeDoc.body || iframeDoc.documentElement;
      if (target) {
        target.appendChild(script);
        console.log('✅ 自动播放脚本注入成功');
      }
    } catch (error) {
      console.warn('⚠️ 脚本注入失败:', error);
    }
  }

  // 监听iframe消息（备用方案）
  window.addEventListener('message', function (event) {
    if (!event.data || typeof event.data !== 'object') return;

    if (event.data.type === 'ug_audio_ended') {
      console.log('🔄 收到音频结束消息');
      setTimeout(function () {
        sendAutoNextMessage();
      }, 500);
    }
  });

  // 发送自动播放下一首消息到iframe
  function sendAutoNextMessage() {
    const iframe = document.getElementById('app-frame');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'AUTO_NEXT'
      }, '*');
      console.log('📤 已发送自动播放指令');
    }
  }

  // 开始监听
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForIframe);
  } else {
    waitForIframe();
  }

})();
