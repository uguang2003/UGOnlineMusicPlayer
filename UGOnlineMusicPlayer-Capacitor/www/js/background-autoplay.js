/**
 * UG音乐播放器 - 后台自动播放
 * 解决后台自动播放下一首歌的问题
 */

(function () {
  'use strict';

  // 等待iframe加载完成
  function waitForIframe() {
    const iframe = document.getElementById('app-frame');
    if (!iframe) {
      setTimeout(waitForIframe, 100);
      return;
    }

    iframe.addEventListener('load', function () {
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
                    // 监听音频结束事件
                    function setupAudioListener() {
                        const audioElements = document.querySelectorAll('audio');
                        audioElements.forEach(function(audio) {
                            if (!audio.hasAutoPlayListener) {
                                audio.addEventListener('ended', function() {
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
                                autoNextMusic();
                                return;
                            }
                            
                            // 方法2: 调用nextMusic函数  
                            if (typeof nextMusic === 'function') {
                                nextMusic();
                                return;
                            }
                            
                            // 方法3: 点击下一首按钮
                            const nextButton = document.querySelector('.next-btn, .next, [title*="下一"], [title*="Next"], .fa-step-forward, .icon-next');
                            if (nextButton) {
                                nextButton.click();
                                return;
                            }
                            
                            // 方法4: 更广泛的按钮查找
                            const allButtons = document.querySelectorAll('button, .btn, [onclick], [role="button"]');
                            for (let btn of allButtons) {
                                const text = btn.textContent || btn.title || btn.getAttribute('aria-label') || '';
                                if (text.includes('下一') || text.includes('next') || text.includes('Next')) {
                                    btn.click();
                                    return;
                                }
                            }
                        } catch (error) {
                            // 静默处理错误
                        }
                    }
                    
                    // 开始监听
                    setupAudioListener();                    
                    // 监听来自父窗口的消息
                    window.addEventListener('message', function(event) {
                        if (event.data && event.data.type === 'AUTO_NEXT') {
                            playNext();
                        }
                    });
                })();
            `;

      // 添加到iframe的head或body
      const target = iframeDoc.head || iframeDoc.body || iframeDoc.documentElement;
      if (target) {
        target.appendChild(script);
      }
    } catch (error) {
      // 静默处理错误
    }
  }

  // 监听iframe消息（备用方案）
  window.addEventListener('message', function (event) {
    if (!event.data || typeof event.data !== 'object') return;

    if (event.data.type === 'ug_audio_ended') {
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
    }
  }

  // 开始监听
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForIframe);
  } else {
    waitForIframe();
  }

})();
